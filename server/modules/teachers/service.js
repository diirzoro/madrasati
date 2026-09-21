// modules/teachers/service.js
// OWNING MODULE: teachers
// Business rules for the teacher section:
//   * a teacher is created together with a real `users` row (role: teacher),
//   * the subject list is priced per subject (amount + currency + hourly|monthly
//     + teaching language),
//   * a subject missing from the global catalog may be proposed, but never
//     duplicated — trimmed, case-insensitive, enforced in SQL as well,
//   * suspension is reversible, deletion is a reviewable request, never a click.
//
// The teacher module never creates a second academic system: subjects and stages
// come from the shared catalog owned by the academic module.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const repo = require('./repository');
const identityRepo = require('../identity/repository');
const { AppError, ValidationError, NotFoundError, ForbiddenError, ConflictError } = require('../common/errors');
const { writeAudit } = require('../common/audit');
const { validatePhoneForCountry } = require('../common/phone');

// The teacher form offers exactly these. They mirror the codes the rest of the
// platform writes (organization offerings use AR/EN and YER/SAR), so a teacher
// price and an institution price are readable by the same consumers.
const CURRENCIES = ['YER', 'SAR'];
const LANGUAGES = ['AR', 'EN'];
const BILLING_PERIODS = ['hourly', 'monthly'];
const PROFILE_STATUSES = ['active', 'inactive', 'suspended', 'deletion_requested'];
const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'];
const DOC_TYPES = ['degree', 'experience', 'identity', 'certificate', 'other'];
const AVAILABILITY_MODES = ['online', 'student_home', 'teacher_location'];

// Teacher documents follow the same private-storage contract as institution
// documents: outside any static directory, magic-byte validated, always served
// as an attachment. They live under uploads/ so the admin review folder keeps
// one home.
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads', 'teacher-docs');
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILES = {
  pdf: { mime: 'application/pdf', magic: [Buffer.from([0x25, 0x50, 0x44, 0x46])] },
  jpg: { mime: 'image/jpeg', magic: [Buffer.from([0xff, 0xd8, 0xff])] },
  jpeg: { mime: 'image/jpeg', magic: [Buffer.from([0xff, 0xd8, 0xff])] },
  png: { mime: 'image/png', magic: [Buffer.from([0x89, 0x50, 0x4e, 0x47])] },
  webp: { mime: 'image/webp', magic: [Buffer.from([0x52, 0x49, 0x46, 0x46]), 2] },
};

function text(value) {
  if (value === undefined || value === null) return null;
  const v = String(value).trim();
  return v === '' ? null : v;
}

function required(value, field, min = 1) {
  const v = text(value);
  if (!v || v.length < min) throw new ValidationError(`${field} is required.`);
  return v;
}

function assertEnum(value, allowed, field) {
  const v = text(value);
  if (v === null) return null;
  const up = v.toUpperCase();
  if (!allowed.includes(up)) throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}.`);
  return up;
}

function assertMoney(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new ValidationError(`${field} must be a positive number.`);
  return Math.round(n * 100) / 100;
}

function boolOrUndefined(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  const v = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(v)) return true;
  if (['false', '0', 'no'].includes(v)) return false;
  return undefined;
}

function digitsToE164(value, callingCode) {
  const raw = text(value);
  if (!raw) return null;
  // Stored without spaces/punctuation: the UI prints it with dir="ltr" and hands
  // the bare digits to wa.me, which accepts nothing else.
  return validatePhoneForCountry(raw, callingCode || '967', 'YE').e164;
}

function normalizeSkills(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const list = Array.isArray(value) ? value : String(value).split(',');
  const cleaned = list.map((s) => String(s).trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

// ---------- DTO ----------

// `canSeePricing` is a server-side decision, never a client hint: an anonymous
// visitor receives the directory and the profile structure (so a parent can still
// see which subjects and stages a teacher covers) with every amount removed and
// `pricingGated` set. Hiding a price in the browser is not access control
// (AGENTS.md rule 7). The default is the closed state, so a new caller that
// forgets to opt in leaks nothing.
function mapTeacher(row, { canSeePricing = false } = {}) {
  if (!row) return null;
  const gated = !canSeePricing;
  const subjects = (Array.isArray(row.subject_list) ? row.subject_list : []).map((s) => (
    gated ? Object.assign({}, s, { amount: null, currency: null, billingPeriod: null }) : s
  ));
  const verified = Boolean(row.verified);
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || null,
    userEmail: row.user_email || null,
    nameEn: row.name_en || null,
    avatarUrl: row.avatar_url || null,
    bio: row.bio,
    headline: row.headline,
    experienceYears: row.years_of_experience,
    skills: row.skills || [],
    qualifications: Array.isArray(row.qualification_list) ? row.qualification_list : [],
    gender: row.gender,
    phone: row.whatsapp || row.user_phone || null,
    userPhone: row.user_phone || null,
    whatsapp: row.whatsapp || row.user_phone || null,
    countryCode: row.country_code || null,
    countryName: row.country_name || null,
    governorateId: row.governorate_id || null,
    governorateName: row.governorate_name || null,
    districtId: row.district_id || null,
    districtName: row.district_name || null,
    neighborhoodId: row.neighborhood_id || null,
    neighborhoodName: row.neighborhood_name || null,
    addressLine: row.address_line || null,
    travelRadiusKm: row.travel_radius_km,
    offersOnline: Boolean(row.offers_online),
    travelsToStudentHome: Boolean(row.travels_to_student_home),
    acceptsStudentHome: Boolean(row.accepts_student_home),
    verified,
    verificationStatus: row.verification_status,
    status: row.profile_status,
    deletionRequestId: row.pending_deletion_request_id || null,
    documentCount: Number(row.document_count || 0),
    isProtected: Boolean(row.user_is_protected),
    stages: Array.isArray(row.stage_list) ? row.stage_list : [],
    subjects,
    availability: Array.isArray(row.availability_list)
      ? row.availability_list.map((slot) => ({
          id: slot.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          locationMode: slot.locationMode,
          notes: slot.notes,
        }))
      : [],
    // Compatibility fields kept for the public teacher directory, which still
    // reads a single headline price and the travel radius.
    pricingGated: gated,
    hourlyRate: subjects.reduce((min, s) => {
      if (s.amount === null || s.amount === undefined) return min;
      const n = Number(s.amount);
      return min === null || n < min ? n : min;
    }, null),
    currency: gated ? null : (subjects.length && subjects[0].currency ? subjects[0].currency : 'YER'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocument(row) {
  if (!row) return null;
  // filePath (the location on disk) is never sent to a client.
  return {
    id: row.id,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name || null,
    uploadedBy: row.uploaded_by,
    uploaderName: row.uploader_name || null,
    docType: row.doc_type,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    status: row.status,
    reviewerName: row.reviewer_name || null,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    createdAt: row.created_at,
  };
}

function mapDeletionRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name || null,
    teacherEmail: row.teacher_email || null,
    requestedBy: row.requested_by,
    requestedByName: row.requested_by_name || null,
    reason: row.reason,
    status: row.status,
    decidedAction: row.decided_action || null,
    reviewedBy: row.reviewed_by,
    reviewedByName: row.reviewed_by_name || null,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    createdAt: row.created_at,
  };
}

// ---------- reads ----------

async function listTeachers(filters = {}, { canSeePricing = false } = {}) {
  const items = await repo.listTeachers(filters);
  const total = await repo.countTeachers(filters);
  return { items: items.map((row) => mapTeacher(row, { canSeePricing })), total, pricingGated: !canSeePricing };
}

async function getTeacher(id, { canSeePricing = false } = {}) {
  const row = await repo.findTeacherProfileById(id);
  if (!row) throw new NotFoundError('Teacher not found');
  return mapTeacher(row, { canSeePricing });
}

// The teacher's own dashboard: the caller is the owner of the record.
async function getTeacherByUserId(userId) {
  const row = await repo.findTeacherProfileByUserId(userId);
  if (!row) return null;
  return mapTeacher(await repo.findTeacherProfileById(row.id), { canSeePricing: true });
}

async function listDocuments(teacherId) {
  const teacher = await repo.findTeacherProfileById(teacherId);
  if (!teacher) throw new NotFoundError('Teacher not found');
  return (await repo.listDocuments(teacherId)).map(mapDocument);
}

async function listPendingDocuments() {
  return (await repo.listPendingDocuments()).map(mapDocument);
}

async function listDeletionRequests(filters = {}) {
  return (await repo.listDeletionRequests(filters)).map(mapDeletionRequest);
}

// Feeds the "add teacher" form: the two approved countries, the global
// price-free subject catalog, and the stages. The form must never invent a
// subject list of its own, so this is the single source for those pickers.
async function getFormCatalog() {
  const [countries, subjects, stages] = await Promise.all([
    repo.listCountries(), repo.findGlobalSubjects(), repo.listStages(),
  ]);
  return {
    countries: countries.map((c) => ({
      id: c.id, code: c.code, name: c.name, callingCode: c.calling_code,
    })),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
    stages: stages.map((s) => ({ id: s.id, name: s.name, nameEn: s.name_en })),
    currencies: CURRENCIES,
    languages: LANGUAGES,
    billingPeriods: BILLING_PERIODS,
    docTypes: DOC_TYPES,
    availabilityModes: AVAILABILITY_MODES,
  };
}

// ---------- writes ----------

function prepareSubjectEntries(rawEntries) {
  if (rawEntries === undefined || rawEntries === null) return undefined;
  if (!Array.isArray(rawEntries)) throw new ValidationError('subjects must be a list.');
  const seen = new Set();
  return rawEntries.map((entry) => {
    const subjectId = Number(entry && entry.subjectId);
    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      throw new ValidationError('Every subject row needs a subjectId.');
    }
    // A repeated subject inside one submission would break the one-price rule.
    if (seen.has(subjectId)) throw new ValidationError('The same subject was listed twice.');
    seen.add(subjectId);
    // A priced subject without a price is not a thing here: teacher_pricing.amount
    // is NOT NULL, so an empty row used to reach PostgreSQL and come back as an
    // opaque 500. Refuse it as a client error with a message the form can show.
    const amount = assertMoney(entry.amount, 'amount');
    if (amount === null) {
      throw new ValidationError('Every subject needs a price (amount).');
    }
    return {
      subjectId,
      amount: amount,
      currency: assertEnum(entry.currency, CURRENCIES, 'currency') || 'YER',
      billingPeriod: (text(entry.billingPeriod) || 'hourly').toLowerCase(),
      languageCode: assertEnum(entry.languageCode, LANGUAGES, 'languageCode'),
      description: text(entry.description),
    };
  }).map((entry) => {
    if (!BILLING_PERIODS.includes(entry.billingPeriod)) {
      throw new ValidationError(`billingPeriod must be one of: ${BILLING_PERIODS.join(', ')}.`);
    }
    return entry;
  });
}

// A weekly slot is one (day, start, end, where) window. Overlapping slots are
// allowed on purpose: a teacher may offer both an online and an in-person
// window at the same hour.
function prepareAvailability(raw) {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) throw new ValidationError('availability must be a list.');
  const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return raw.map((slot) => {
    const dayOfWeek = Number(slot && slot.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new ValidationError('dayOfWeek must be a number between 0 (Sunday) and 6 (Saturday).');
    }
    const startTime = text(slot.startTime);
    const endTime = text(slot.endTime);
    if (!startTime || !timeRe.test(startTime)) throw new ValidationError('startTime must look like 08:30.');
    if (!endTime || !timeRe.test(endTime)) throw new ValidationError('endTime must look like 14:00.');
    if (endTime <= startTime) throw new ValidationError('endTime must be after startTime.');
    const locationMode = text(slot.locationMode) || 'online';
    if (!AVAILABILITY_MODES.includes(locationMode)) {
      throw new ValidationError(`locationMode must be one of: ${AVAILABILITY_MODES.join(', ')}.`);
    }
    return { dayOfWeek, startTime, endTime, locationMode, notes: text(slot.notes) };
  });
}

function prepareProfileFields(data = {}) {
  const fields = {};
  if (data.nameEn !== undefined) fields.name_en = text(data.nameEn);
  if (data.headline !== undefined) fields.headline = text(data.headline);
  if (data.bio !== undefined) fields.bio = text(data.bio);
  if (data.gender !== undefined) fields.gender = text(data.gender);
  if (data.skills !== undefined) fields.skills = normalizeSkills(data.skills);
  if (data.experienceYears !== undefined) {
    const n = Number(data.experienceYears);
    if (!Number.isFinite(n) || n < 0 || n > 70) throw new ValidationError('years of experience must be between 0 and 70.');
    fields.years_of_experience = Math.floor(n);
  }
  if (data.countryId !== undefined) {
    if (data.countryId === null || data.countryId === '') fields.country_id = null;
    else fields.country_id = Number(data.countryId);
  }
  if (data.governorateId !== undefined) fields.governorate_id = data.governorateId === null || data.governorateId === '' ? null : Number(data.governorateId);
  if (data.districtId !== undefined) fields.district_id = data.districtId === null || data.districtId === '' ? null : Number(data.districtId);
  if (data.neighborhoodId !== undefined) fields.neighborhood_id = data.neighborhoodId === null || data.neighborhoodId === '' ? null : Number(data.neighborhoodId);
  if (data.addressLine !== undefined) fields.address_line = text(data.addressLine);
  if (data.whatsapp !== undefined) fields.whatsapp = text(data.whatsapp);
  for (const [api, column] of [['offersOnline', 'offers_online'], ['travelsToStudentHome', 'travels_to_student_home'], ['acceptsStudentHome', 'accepts_student_home']]) {
    const v = boolOrUndefined(data[api]);
    if (v !== undefined) fields[column] = v;
  }
  return fields;
}

async function createTeacher({ data = {}, actorUserId }) {
  const name = required(data.name, 'name', 2);
  const email = required(data.email, 'email', 5).toLowerCase();
  const password = required(data.password, 'password', 8);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Please provide a valid email address.');
  // Same password policy as registration; a teacher account is a real login.
  if (!/[A-Z]/.test(password) || !/[^A-Za-z0-9\s]/.test(password)) {
    throw new ValidationError('Password must be at least 8 characters with at least one capital letter and one symbol.');
  }

  const country = data.countryId ? await repo.findCountryById(Number(data.countryId)) : null;
  let phoneE164 = null;
  let whatsappE164 = null;
  if (text(data.phone)) {
    try {
      phoneE164 = digitsToE164(data.phone, country && country.calling_code);
    } catch (err) {
      throw new ValidationError(`Phone: ${err.message}`);
    }
  }
  if (text(data.whatsapp)) {
    try {
      whatsappE164 = digitsToE164(data.whatsapp, country && country.calling_code);
    } catch (err) {
      throw new ValidationError(`WhatsApp: ${err.message}`);
    }
  }

  const existing = await identityRepo.findUserByEmail(email);
  if (existing) throw new ConflictError('An account with this email already exists.');
  if (phoneE164) {
    const phoneTaken = await identityRepo.findUserByPhoneNormalized(phoneE164);
    if (phoneTaken) throw new ConflictError('An account with this phone number already exists.');
  }
  const roleRow = await identityRepo.findRoleByName('teacher');
  if (!roleRow) throw new ValidationError('The teacher role is missing from the platform.');

  const subjects = prepareSubjectEntries(data.subjects);
  const fields = prepareProfileFields(data);
  const passwordHash = await bcrypt.hash(password, 10);
  const client = await repo.getClient();
  let userId;
  let profile;
  try {
    await client.query('BEGIN');
    const user = await identityRepo.createUser({
      name,
      email,
      phone: phoneE164,
      phoneNormalized: phoneE164,
      roleId: roleRow.id,
      passwordHash,
      metadata: { createdVia: 'admin_teacher_form' },
    }, client);
    userId = user.id;
    await identityRepo.upsertProfile(userId, {
      full_name: name,
      avatar_url: text(data.avatarUrl),
      country_code: country ? country.code : null,
      governorate_id: fields.governorate_id === undefined ? null : fields.governorate_id,
      district_id: fields.district_id === undefined ? null : fields.district_id,
      phone_country_code: country ? country.calling_code : null,
    }, client);

    // `fields` is spread first: it carries the raw form values, and the
    // normalized E.164 numbers must win over the raw ones it also contains.
    profile = await repo.createTeacherProfile({
      ...fields,
      user_id: userId,
      whatsapp: whatsappE164 || phoneE164,
    }, client);

    if (subjects && subjects.length) await repo.replaceTeacherSubjects(profile.id, subjects, client);
    if (Array.isArray(data.stageIds) && data.stageIds.length) {
      await repo.setTeacherStages(profile.id, data.stageIds.map(String), client);
    }
    const availability = prepareAvailability(data.availability);
    if (availability && availability.length) await repo.replaceAvailability(profile.id, availability, client);
    if (Array.isArray(data.qualifications) && data.qualifications.length) {
      await repo.replaceQualifications(profile.id, data.qualifications.map((q) => ({
        title: required(q && q.title, 'qualification title'),
        institutionName: text(q.institutionName),
        degree: text(q.degree),
        year: q.year === undefined || q.year === null || q.year === '' ? null : Number(q.year),
        documentUrl: text(q.documentUrl),
      })), client);
    }
    await writeAudit({
      actorUserId: actorUserId || null,
      action: 'create',
      entityType: 'teacher_profile',
      entityId: String(profile.id),
      newValues: { email, userId: String(userId), name },
    }, client);
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* noop */ }
    // A concurrent submission can still lose the race on the unique email index.
    if (err && err.code === '23505') throw new ConflictError('An account with this email or phone already exists.');
    throw err;
  } finally {
    client.release();
  }
  return getTeacher(profile.id);
}

async function updateTeacher({ id, data = {}, actorUserId }) {
  const current = await repo.findTeacherProfileById(id);
  if (!current) throw new NotFoundError('Teacher not found');
  const fields = prepareProfileFields(data);
  if (data.whatsapp !== undefined && text(data.whatsapp)) {
    const country = current.country_id ? await repo.findCountryById(current.country_id) : null;
    try {
      fields.whatsapp = digitsToE164(data.whatsapp, country && country.calling_code);
    } catch (err) {
      throw new ValidationError(`WhatsApp: ${err.message}`);
    }
  }

  const userFields = {};
  if (data.name !== undefined) userFields.name = required(data.name, 'name', 2);
  if (data.email !== undefined) {
    const email = required(data.email, 'email', 5).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Please provide a valid email address.');
    if (email !== String(current.user_email || '').toLowerCase()) {
      const clash = await identityRepo.findUserByEmail(email);
      if (clash && clash.id !== current.user_id) throw new ConflictError('An account with this email already exists.');
      userFields.email = email;
    }
  }
  if (data.phone !== undefined) {
    const country = fields.country_id !== undefined
      ? (fields.country_id ? await repo.findCountryById(fields.country_id) : null)
      : (current.country_id ? await repo.findCountryById(current.country_id) : null);
    if (text(data.phone)) {
      let e164;
      try {
        e164 = digitsToE164(data.phone, country && country.calling_code);
      } catch (err) {
        throw new ValidationError(`Phone: ${err.message}`);
      }
      const taken = await identityRepo.findUserByPhoneNormalized(e164);
      if (taken && taken.id !== current.user_id) throw new ConflictError('An account with this phone number already exists.');
      userFields.phone = e164;
      userFields.phone_normalized = e164;
    } else {
      userFields.phone = null;
      userFields.phone_normalized = null;
    }
  }
  if (data.status !== undefined) {
    const status = text(data.status);
    if (!PROFILE_STATUSES.includes(status)) throw new ValidationError('Invalid teacher status.');
    // Suspension and reactivation belong to the dedicated status endpoint; the
    // generic edit form must not be a back door into a pending deletion.
    if (status === 'deletion_requested') throw new ValidationError('Use the delete action to request deletion.');
    fields.profile_status = status;
  }
  if (data.verificationStatus !== undefined) {
    const v = text(data.verificationStatus);
    if (!VERIFICATION_STATUSES.includes(v)) throw new ValidationError('Invalid verification status.');
    fields.verification_status = v;
    fields.verified = v === 'verified';
  }

  const subjects = prepareSubjectEntries(data.subjects);
  const client = await repo.getClient();
  try {
    await client.query('BEGIN');
    if (Object.keys(userFields).length) {
      await identityRepo.updateUser(current.user_id, userFields);
      if (userFields.name || data.avatarUrl !== undefined) {
        await identityRepo.upsertProfile(current.user_id, {
          full_name: userFields.name,
          avatar_url: text(data.avatarUrl),
        }, client);
      }
    } else if (data.avatarUrl !== undefined) {
      await identityRepo.upsertProfile(current.user_id, { avatar_url: text(data.avatarUrl) }, client);
    }
    if (Object.keys(fields).length) await repo.updateTeacherProfile(id, fields, client);
    if (subjects !== undefined) await repo.replaceTeacherSubjects(id, subjects, client);
    if (Array.isArray(data.stageIds)) await repo.setTeacherStages(id, data.stageIds.map(String), client);
    const availability = prepareAvailability(data.availability);
    if (availability !== undefined) await repo.replaceAvailability(id, availability, client);
    if (Array.isArray(data.qualifications)) {
      await repo.replaceQualifications(id, data.qualifications.map((q) => ({
        title: required(q && q.title, 'qualification title'),
        institutionName: text(q.institutionName),
        degree: text(q.degree),
        year: q.year === undefined || q.year === null || q.year === '' ? null : Number(q.year),
        documentUrl: text(q.documentUrl),
      })), client);
    }
    await writeAudit({
      actorUserId: actorUserId || null,
      action: 'update',
      entityType: 'teacher_profile',
      entityId: String(id),
      newValues: { profileFields: Object.keys(fields), userFields: Object.keys(userFields), subjects: subjects === undefined ? 'unchanged' : subjects.length },
    }, client);
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* noop */ }
    if (err && err.code === '23505') throw new ConflictError('A unique value (email, phone or subject price) already exists.');
    throw err;
  } finally {
    client.release();
  }
  return getTeacher(id);
}

// Suspend / activate: freezes the teacher's visibility without touching a single
// row of their data, and refuses to release a pending deletion by accident.
async function setTeacherStatus({ id, status, actorUserId }) {
  const current = await repo.findTeacherProfileById(id);
  if (!current) throw new NotFoundError('Teacher not found');
  const allowed = ['active', 'suspended'];
  if (!allowed.includes(status)) throw new ValidationError('status must be active or suspended.');
  if (current.profile_status === 'deletion_requested') {
    throw new ConflictError('This teacher has a pending deletion request. Resolve it first.');
  }
  await repo.updateTeacherProfile(id, { profile_status: status });
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'status_change',
    entityType: 'teacher_profile',
    entityId: String(id),
    oldValues: { profile_status: current.profile_status },
    newValues: { profile_status: status },
  });
  return getTeacher(id);
}

// ---------- subject proposal (the "+" next to the subject picker) ----------

function slugify(name) {
  return String(name).trim().toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 45) || 'subject';
}

async function uniqueGlobalSubjectSlug(name) {
  const base = slugify(name);
  let candidate = base;
  let n = 1;
  while (await repo.findSubjectBySlug(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

// The catalog stores the Arabic display name and keeps the English identity in
// the slug (الفيزياء / physics), because `subjects` has no name_en column. A
// duplicate is therefore either the same Arabic name OR the same slug — checking
// only the Arabic name would let "PHYSICS" through as a new subject.
async function assertSubjectIsNew({ name, nameEn }) {
  const candidates = [name, nameEn].filter(Boolean);
  for (const candidate of candidates) {
    const byName = await repo.findGlobalSubjectByName(candidate);
    if (byName) throw subjectExists(byName);
  }
  for (const candidate of candidates) {
    const bySlug = await repo.findGlobalSubjectBySlug(slugify(candidate));
    if (bySlug) throw subjectExists(bySlug);
  }
}

function subjectExists(row) {
  // The frontend turns this code into a bilingual "pick it from the list"
  // instruction, so the API stays language-neutral like every other error here.
  return new AppError(
    `"${row.name}" already exists in the global subject catalog. Select it from the list instead of adding it.`,
    409,
    'SUBJECT_EXISTS'
  );
}

// A rare subject the catalog lacks may be proposed, but it is never a second
// catalog: it is a pending row in the same `subjects` table, and an existing
// name or slug (trimmed, case-insensitive) is refused so the teacher picks it.
async function proposeSubject({ name, data = {}, actorUserId }) {
  const cleanName = required(name || data.name, 'name', 2);
  const nameEn = text(data.nameEn);
  await assertSubjectIsNew({ name: cleanName, nameEn });

  const client = await repo.getClient();
  let row;
  try {
    await client.query('BEGIN');
    row = await repo.insertGlobalSubject({
      name: cleanName,
      slug: await uniqueGlobalSubjectSlug(nameEn || cleanName),
      description: text(data.description),
      createdBy: actorUserId || null,
    }, client);
    await writeAudit({
      actorUserId: actorUserId || null,
      action: 'create',
      entityType: 'subject_proposal',
      entityId: String(row.id),
      newValues: { name: cleanName, nameEn, reviewStatus: 'pending' },
    }, client);
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* noop */ }
    // The partial unique index on lower(btrim(name)) is the last line of defence:
    // two simultaneous proposals of the same subject cannot both land.
    if (err && err.code === '23505') {
      throw subjectExists({ name: cleanName });
    }
    throw err;
  } finally {
    client.release();
  }
  return { id: row.id, name: row.name, slug: row.slug, reviewStatus: row.review_status };
}

// ---------- deletion: request then review ----------

async function requestDeletion({ id, reason, actorUserId }) {
  const current = await repo.findTeacherProfileById(id);
  if (!current) throw new NotFoundError('Teacher not found');
  if (current.user_is_protected) {
    throw new ForbiddenError('This is a protected system account and cannot be deleted.');
  }
  const cleanReason = required(reason, 'reason', 10);
  const open = await repo.findOpenDeletionRequest(id);
  if (open) throw new ConflictError('A deletion request for this teacher is already pending review.');

  const client = await repo.getClient();
  let request;
  try {
    await client.query('BEGIN');
    request = await repo.createDeletionRequest({ teacherId: id, requestedBy: actorUserId, reason: cleanReason }, client);
    // The teacher keeps every row; only the lifecycle state moves, so the
    // verification queue can see it and the profile stops being offered.
    await repo.updateTeacherProfile(id, { profile_status: 'deletion_requested' }, client);
    await writeAudit({
      actorUserId: actorUserId || null,
      action: 'deletion_requested',
      entityType: 'teacher_profile',
      entityId: String(id),
      reason: cleanReason,
      newValues: { profile_status: 'deletion_requested' },
    }, client);
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* noop */ }
    if (err && err.code === '23505') throw new ConflictError('A deletion request for this teacher is already pending review.');
    throw err;
  } finally {
    client.release();
  }
  return { request: mapDeletionRequest(request), teacher: await getTeacher(id) };
}

async function reviewDeletionRequest({ requestId, decision, reviewNotes, actorUserId }) {
  const request = await repo.findDeletionRequestById(requestId);
  if (!request) throw new NotFoundError('Deletion request not found');
  if (request.status !== 'pending') throw new ConflictError('This request has already been decided.');
  const normalized = text(decision);
  if (!['approve', 'reject'].includes(normalized)) throw new ValidationError('decision must be approve or reject.');

  if (normalized === 'approve' && request.user_is_protected) {
    throw new ForbiddenError('This is a protected system account and cannot be deleted.');
  }

  const client = await repo.getClient();
  try {
    await client.query('BEGIN');
    if (normalized === 'approve') {
      await repo.softDeleteTeacher(request.teacher_id, client);
      await repo.softDeleteUserById(request.user_id, client);
    } else {
      await repo.updateTeacherProfile(request.teacher_id, { profile_status: 'active' }, client);
    }
    const decided = await repo.decideDeletionRequest(requestId, {
      status: normalized === 'approve' ? 'approved' : 'rejected',
      decidedAction: normalized === 'approve' ? 'deleted' : 'rejected',
      reviewNotes: text(reviewNotes),
      reviewerId: actorUserId,
    }, client);
    await writeAudit({
      actorUserId: actorUserId || null,
      action: normalized === 'approve' ? 'delete' : 'deletion_rejected',
      entityType: 'teacher_profile',
      entityId: String(request.teacher_id),
      reason: request.reason,
      oldValues: { profile_status: 'deletion_requested' },
      newValues: { status: decided.status, decidedAction: decided.decided_action, reviewNotes: text(reviewNotes) },
    }, client);
    await client.query('COMMIT');
    return mapDeletionRequest(decided);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* noop */ }
    throw err;
  } finally {
    client.release();
  }
}

// ---------- documents ----------

async function assertTeacherExists(teacherId) {
  const teacher = await repo.findTeacherProfileById(teacherId);
  if (!teacher) throw new NotFoundError('Teacher not found');
  return teacher;
}

function sniffFile(buffer, ext) {
  const rule = ALLOWED_FILES[ext];
  if (!rule) return null;
  if (ext === 'webp') {
    if (buffer.length < 12) return null;
    if (!buffer.slice(0, 4).equals(rule.magic[0])) return null;
    if (buffer.slice(8, 12).toString('ascii') !== 'WEBP') return null;
    return rule.mime;
  }
  const magic = rule.magic[0];
  if (buffer.length < magic.length) return null;
  return buffer.slice(0, magic.length).equals(magic) ? rule.mime : null;
}

// An HTTP header value must be a byte string, so the browser cannot send a raw
// Arabic file name and the uploader percent-encodes it (the established contract
// of the institution uploader). Decoding here means the admin review screen
// lists "شهادة-البكالوريوس.pdf" instead of an escape sequence.
function decodeFileName(raw) {
  const value = String(raw || 'document');
  if (!/%[0-9A-Fa-f]{2}/.test(value)) return value;
  try { return decodeURIComponent(value); } catch (e) { return value; }
}

async function uploadDocument({ teacherId, userId, actorRole, docType, originalName }, fileBuffer) {
  if (!['admin', 'owner'].includes(actorRole)) throw new ForbiddenError('Only an administrator can upload teacher documents.');
  await assertTeacherExists(teacherId);
  const type = text(docType) || 'other';
  if (!DOC_TYPES.includes(type)) throw new ValidationError(`docType must be one of: ${DOC_TYPES.join(', ')}.`);
  if (!Buffer.isBuffer(fileBuffer) || !fileBuffer.length) throw new ValidationError('Empty file upload.');
  if (fileBuffer.length > MAX_BYTES) throw new ValidationError('File exceeds the 10 MB limit.');
  const decodedName = decodeFileName(originalName);
  const ext = String(decodedName).split('.').pop().toLowerCase();
  const mime = sniffFile(fileBuffer, ext);
  if (!mime) throw new ValidationError('Unsupported file type. Allowed: PDF, JPG, PNG, WEBP.');
  const safeBase = decodedName
    .replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_').slice(0, 120);
  const stored = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  const dir = path.join(UPLOAD_ROOT, String(teacherId));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, stored), fileBuffer);

  const row = await repo.createDocument({
    teacherId, uploadedBy: userId, docType: type, fileName: safeBase,
    filePath: path.join(String(teacherId), stored), mimeType: mime, fileSize: fileBuffer.length,
  });
  await writeAudit({
    actorUserId: userId || null,
    action: 'create',
    entityType: 'teacher_document',
    entityId: String(row.id),
    newValues: { teacherId, docType: type, fileName: safeBase },
  });
  return mapDocument(row);
}

async function downloadDocument({ documentId, userId, actorRole }) {
  const doc = await repo.findDocumentById(documentId);
  if (!doc) throw new NotFoundError('Document not found');
  const teacher = await repo.findTeacherProfileById(doc.teacher_id);
  // Admin always; otherwise only the teacher's own account.
  if (actorRole !== 'admin' && (!teacher || teacher.user_id !== userId)) {
    throw new NotFoundError('Document not found');
  }
  const absPath = path.join(UPLOAD_ROOT, doc.file_path);
  if (!fs.existsSync(absPath)) throw new NotFoundError('File is no longer available on disk.');
  await writeAudit({
    actorUserId: userId || null, action: 'read', entityType: 'teacher_document', entityId: String(doc.id),
  });
  return { doc: mapDocument(doc), absPath };
}

async function reviewDocument({ documentId, status, reviewNotes, actorUserId }) {
  const doc = await repo.findDocumentById(documentId);
  if (!doc) throw new NotFoundError('Document not found');
  const normalized = text(status);
  if (!['verified', 'rejected', 'pending'].includes(normalized)) {
    throw new ValidationError('status must be verified, rejected or pending.');
  }
  const updated = await repo.reviewDocument(documentId, {
    status: normalized, reviewNotes: text(reviewNotes), reviewerId: actorUserId,
  });
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'verify',
    entityType: 'teacher_document',
    entityId: String(documentId),
    oldValues: { status: doc.status },
    newValues: { status: normalized },
  });
  return mapDocument(updated);
}

async function deleteDocument({ documentId, userId, actorRole }) {
  const doc = await repo.findDocumentById(documentId);
  if (!doc) throw new NotFoundError('Document not found');
  if (actorRole !== 'admin' && doc.uploaded_by !== userId) {
    throw new NotFoundError('Document not found');
  }
  const removed = await repo.deleteDocument(documentId);
  if (removed && removed.file_path) {
    // Remove the bytes too; a stale private file with no owner is a liability.
    try { fs.unlinkSync(path.join(UPLOAD_ROOT, removed.file_path)); } catch (e) { /* already gone */ }
  }
  await writeAudit({
    actorUserId: userId || null, action: 'delete', entityType: 'teacher_document', entityId: String(documentId),
  });
  return { success: true };
}

module.exports = {
  CURRENCIES, LANGUAGES, BILLING_PERIODS, DOC_TYPES, AVAILABILITY_MODES,
  mapTeacher, mapDocument, mapDeletionRequest,
  listTeachers, getTeacher, getTeacherByUserId, getFormCatalog,
  createTeacher, updateTeacher, setTeacherStatus,
  proposeSubject, requestDeletion, reviewDeletionRequest,
  listDocuments, listPendingDocuments, listDeletionRequests,
  uploadDocument, downloadDocument, reviewDocument, deleteDocument,
};

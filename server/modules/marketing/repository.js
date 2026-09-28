// modules/marketing/repository.js
// OWNING MODULE: marketing
// Data access for hero_slides, advertisements and the existing offers table.
// PostgreSQL is the single source of truth for all marketing content.

const { query } = require('../common/pool');
const { parseJson } = require('../common/http');

// `placement` is a TEXT[] column. node-postgres turns a JS array into a proper
// array parameter, while JSON.stringify would send `["ticker"]` — which the
// array literal parser rejects with 22P02. Objects are still stringified, for
// the JSONB columns.
function toParam(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

// ---------------------------------------------------------------------------
// hero_slides
// ---------------------------------------------------------------------------
async function listHeroSlides({ placement, publicOnly = false, status, limit } = {}) {
  const conditions = [];
  const params = [];
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (placement) {
    params.push([placement]);
    conditions.push(`placement @> $${params.length}::text[]`);
  }
  if (publicOnly) {
    conditions.push(`active = true`);
    conditions.push(`status = 'approved'`);
    conditions.push(`(starts_at IS NULL OR starts_at <= now())`);
    conditions.push(`(ends_at IS NULL OR ends_at >= now())`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM hero_slides ${where} ORDER BY priority DESC, created_at ASC`
    + (limit ? ` LIMIT $${params.length + 1}` : '');
  if (limit) params.push(Number(limit));
  const { rows } = await query(sql, params);
  return rows;
}

async function findHeroSlideById(id) {
  const { rows } = await query(`SELECT * FROM hero_slides WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function countHeroSlides() {
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM hero_slides`);
  return rows[0].count;
}

async function createHeroSlide(fields) {
  const keys = Object.keys(fields);
  const values = keys.map((k) => toParam(fields[k]));
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO hero_slides (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0];
}

async function updateHeroSlide(id, updates) {
  const keys = Object.keys(updates);
  const values = keys.map((k) => toParam(updates[k]));
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  values.push(id);
  const { rows } = await query(
    `UPDATE hero_slides SET ${set}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function deleteHeroSlide(id) {
  const { rows } = await query(`DELETE FROM hero_slides WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// advertisements
// ---------------------------------------------------------------------------
// The display bucket is a pure function of the stored status plus the schedule,
// mirrored in SQL so the database can COUNT it. It MUST stay identical to
// `effectiveStatus` in service.js — a tab and its counter that disagree would be
// worse than no counter at all.
const EFFECTIVE_STATUS_SQL = `CASE
      WHEN a.status = 'approved' AND a.ends_at IS NOT NULL AND a.ends_at < now() THEN 'expired'
      WHEN a.status = 'approved' AND a.starts_at IS NOT NULL AND a.starts_at > now() THEN 'scheduled'
      WHEN a.status = 'approved' THEN 'active'
      ELSE a.status
    END`;

// One shared predicate builder. Every management read (list, count, summary)
// filters through it, so a filtered list and its tab counter can never describe
// different populations.
function adFilters({ placement, status, effective, organizationId, organizationIds, submittedBy, advertiserId, advertiserKind, adType, billing, from, to, q } = {}) {
  const conditions = [];
  const params = [];
  const add = (sql, value) => { params.push(value); conditions.push(sql.replace('?', `$${params.length}`)); };
  if (status) add('a.status = ?', status);
  if (effective) add(`${EFFECTIVE_STATUS_SQL} = ?`, effective);
  if (placement) {
    params.push([placement]);
    conditions.push(`a.placement @> $${params.length}::text[]`);
  }
  if (organizationId) add('a.organization_id = ?', organizationId);
  if (organizationIds && organizationIds.length) {
    params.push(organizationIds);
    conditions.push(`a.organization_id = ANY($${params.length}::uuid[])`);
  }
  if (submittedBy) add('a.submitted_by = ?', submittedBy);
  if (advertiserId) {
    if (advertiserKind === 'teacher') add('a.teacher_id = ?', advertiserId);
    else if (advertiserKind === 'organization') add('a.organization_id = ?', advertiserId);
    else {
      // Unqualified: the advertiser catalog is heterogeneous, so match either side.
      params.push(advertiserId);
      conditions.push(`(a.organization_id::text = $${params.length} OR a.teacher_id::text = $${params.length})`);
    }
  }
  if (q) {
    params.push(`%${String(q).trim()}%`);
    const p = `$${params.length}`;
    conditions.push(`(a.name ILIKE ${p} OR a.advertiser ILIKE ${p} OR a.message_ar ILIKE ${p}`
      + ` OR a.message_en ILIKE ${p} OR org.name ILIKE ${p} OR tuser.name ILIKE ${p})`);
  }
  if (adType) add('a.ad_type = ?', adType);
  if (billing) add('a.billing_mode = ?', billing);
  // The period matches the schedule window by OVERLAP, not by containment.
  // Containment would hide every running ad the moment a range is chosen,
  // which is the opposite of what an operator asking «ما الذي يعمل في مارس؟»
  // wants: an ad that opened in February and closes in April is live in March.
  // An ad with no dates at all is open-ended, so it is always inside the range.
  if (from) {
    params.push(from);
    conditions.push(`(a.ends_at IS NULL OR a.ends_at >= $${params.length}::timestamptz)`);
  }
  if (to) {
    params.push(to);
    conditions.push(`(a.starts_at IS NULL OR a.starts_at <= $${params.length}::timestamptz)`);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

// The management list. `sort` is a whitelist, never interpolated from input.
const AD_SORTS = {
  newest: 'created_at DESC',
  oldest: 'created_at ASC',
  name: 'name ASC',
  clicks: 'clicks DESC, created_at DESC',
  impressions: 'impressions DESC, created_at DESC',
  end_soon: 'ends_at ASC NULLS LAST',
  priority: 'priority DESC, created_at DESC',
};

async function listAdvertisementsPaged(filters = {}) {
  const { where, params } = adFilters(filters);
  const order = AD_SORTS[filters.sort] || AD_SORTS.newest;
  const limit = Math.max(1, Math.min(Number(filters.limit) || 25, 200));
  const offset = Math.max(0, Number(filters.offset) || 0);

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM advertisements a
     LEFT JOIN organizations org ON org.id = a.organization_id
     LEFT JOIN users tuser ON tuser.id = a.teacher_id ${where}`,
    params
  );

  const rowsRes = await query(
    `SELECT a.*, org.name AS organization_name, org.type AS organization_type,
            org.slug AS organization_slug, tuser.name AS teacher_name,
            ${EFFECTIVE_STATUS_SQL} AS effective_status
     FROM advertisements a
     LEFT JOIN organizations org ON org.id = a.organization_id
     LEFT JOIN users tuser ON tuser.id = a.teacher_id
     ${where}
     ORDER BY ${order}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return { rows: rowsRes.rows, total: countRes.rows[0].total, limit, offset };
}

// Counts per display bucket plus the aggregate counters, in ONE grouped query.
// CTR is deliberately absent here: it is derived in the service and is null while
// impressions are zero, so a rate can never be shown for an unmeasured ad.
async function summarizeAdvertisements(filters = {}) {
  const { where, params } = adFilters(filters);
  const { rows } = await query(
    `SELECT ${EFFECTIVE_STATUS_SQL} AS bucket,
            a.status AS stored_status,
            COUNT(*)::int AS count,
            COALESCE(SUM(a.impressions), 0)::int AS impressions,
            COALESCE(SUM(a.clicks), 0)::int AS clicks
     FROM advertisements a
     LEFT JOIN organizations org ON org.id = a.organization_id
     LEFT JOIN users tuser ON tuser.id = a.teacher_id
     ${where}
     GROUP BY 1, 2`,
    params
  );
  return rows;
}

// The real lifecycle trail for one advertisement. These are audit rows the
// workflow genuinely wrote (submit / review / pause / resume / cancel / archive
// / delete), so the timeline can never invent a step.
async function findAdvertisementHistory(id) {
  const { rows } = await query(
    `SELECT al.id, al.action, al.object_id, al.created_at,
            al.new_values, al.old_values, al.reason,
            actor.name AS actor_name, actor.email AS actor_email
     FROM audit_logs al
     LEFT JOIN users actor ON actor.id = al.actor_user_id
     WHERE al.object_type = 'advertisement' AND al.object_id = $1
     ORDER BY al.created_at ASC`,
    [String(id)]
  );
  return rows;
}

async function listAdvertisements({ placement, publicOnly = false, status, organizationId, organizationIds, submittedBy, limit } = {}) {
  const conditions = [];
  const params = [];
  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }
  if (placement) {
    params.push([placement]);
    conditions.push(`a.placement @> $${params.length}::text[]`);
  }
  if (organizationId) {
    params.push(organizationId);
    conditions.push(`a.organization_id = $${params.length}`);
  }
  if (organizationIds && organizationIds.length) {
    params.push(organizationIds);
    conditions.push(`a.organization_id = ANY($${params.length}::uuid[])`);
  }
  if (submittedBy) {
    params.push(submittedBy);
    conditions.push(`a.submitted_by = $${params.length}`);
  }
  if (publicOnly) {
    // Public eligibility: APPROVED and inside the schedule window. A pending,
    // rejected, paused, cancelled or archived ad is never public.
    conditions.push(`a.status = 'approved'`);
    conditions.push(`(a.starts_at IS NULL OR a.starts_at <= now())`);
    conditions.push(`(a.ends_at IS NULL OR a.ends_at >= now())`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT a.*, org.name AS organization_name, org.type AS organization_type,
      org.slug AS organization_slug, tuser.name AS teacher_name
      FROM advertisements a
      LEFT JOIN organizations org ON org.id = a.organization_id
      LEFT JOIN users tuser ON tuser.id = a.teacher_id
      ${where} ORDER BY a.priority DESC, a.created_at DESC`
    + (limit ? ` LIMIT $${params.length + 1}` : '');
  if (limit) params.push(Number(limit));
  const { rows } = await query(sql, params);
  return rows;
}

async function findAdvertisementById(id) {
  const { rows } = await query(
    `SELECT a.*, org.name AS organization_name, org.type AS organization_type,
            org.slug AS organization_slug, tuser.name AS teacher_name
     FROM advertisements a
     LEFT JOIN organizations org ON org.id = a.organization_id
     LEFT JOIN users tuser ON tuser.id = a.teacher_id
     WHERE a.id = $1`,
    [id]
  );
  return rows[0] || null;
}

// A counter must never move for an advertisement a visitor cannot see. This is
// the single public-eligibility predicate: approved, and inside the window.
async function findPublicAdvertisementById(id) {
  const { rows } = await query(
    `SELECT a.*, org.name AS organization_name, tuser.name AS teacher_name
     FROM advertisements a
     LEFT JOIN organizations org ON org.id = a.organization_id
     LEFT JOIN users tuser ON tuser.id = a.teacher_id
     WHERE a.id = $1
       AND a.status = 'approved'
       AND (a.starts_at IS NULL OR a.starts_at <= now())
       AND (a.ends_at IS NULL OR a.ends_at >= now())`,
    [id]
  );
  return rows[0] || null;
}

async function createAdvertisement(fields) {
  const keys = Object.keys(fields);
  const values = keys.map((k) => toParam(fields[k]));
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO advertisements (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0];
}

async function updateAdvertisement(id, updates) {
  const keys = Object.keys(updates);
  const values = keys.map((k) => toParam(updates[k]));
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  values.push(id);
  const { rows } = await query(
    `UPDATE advertisements SET ${set}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function deleteAdvertisement(id) {
  const { rows } = await query(`DELETE FROM advertisements WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

async function incrementAdvertisementClick(id) {
  const { rows } = await query(
    `UPDATE advertisements SET clicks = clicks + 1 WHERE id = $1 RETURNING id, clicks`,
    [id]
  );
  return rows[0] || null;
}

async function incrementAdvertisementImpression(id) {
  const { rows } = await query(
    `UPDATE advertisements SET impressions = impressions + 1 WHERE id = $1 RETURNING id, impressions`,
    [id]
  );
  return rows[0] || null;
}

// The «المعلن» (advertiser) catalog: the entities that may advertise are the
// institution owners (their institutions) and the private teachers. The
// advertisement form turns this into a dropdown, so an advertiser is a real
// reference rather than free text.
async function listAdvertisers() {
  const orgs = await query(
    `SELECT o.id, o.name, owner_user.name AS owner_name
     FROM organizations o
     LEFT JOIN LATERAL (
       SELECT m.user_id
       FROM organization_memberships m
       WHERE m.organization_id = o.id AND m.membership_role = 'owner'
       ORDER BY (m.status = 'active') DESC, m.joined_at, m.id
       LIMIT 1
     ) om ON true
     LEFT JOIN users owner_user ON owner_user.id = om.user_id
     WHERE o.deleted_at IS NULL
     ORDER BY o.name`
  );
  const teachers = await query(
    `SELECT tp.user_id, u.name, tp.name_en
     FROM teacher_profiles tp
     JOIN users u ON u.id = tp.user_id
     WHERE tp.deleted_at IS NULL AND tp.profile_status = 'active'
     ORDER BY u.name`
  );
  return { organizations: orgs.rows, teachers: teachers.rows };
}

// A teacher advertiser must be a real, non-deleted, active teacher profile —
// the same predicate the dropdown is built from, so a hand-written request
// cannot name a user who is not a teacher.
async function findTeacherAdvertiser(userId) {
  const { rows } = await query(
    `SELECT tp.user_id, u.name, tp.name_en
     FROM teacher_profiles tp
     JOIN users u ON u.id = tp.user_id
     WHERE tp.user_id = $1 AND tp.deleted_at IS NULL AND tp.profile_status = 'active'`,
    [userId]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// offers (existing table, now managed by this module)
// ---------------------------------------------------------------------------
async function listOffers({ organizationId, organizationIds, publicOnly = false, limit } = {}) {
  const conditions = [];
  const params = [];
  if (organizationId) {
    params.push(organizationId);
    conditions.push(`o.organization_id = $${params.length}`);
  }
  if (organizationIds && organizationIds.length) {
    params.push(organizationIds);
    conditions.push(`o.organization_id = ANY($${params.length}::uuid[])`);
  }
  if (publicOnly) {
    conditions.push(`o.active = true`);
    conditions.push(`(o.starts_at IS NULL OR o.starts_at <= now())`);
    conditions.push(`(o.ends_at IS NULL OR o.ends_at >= now())`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT o.*, org.name AS organization_name
     FROM offers o
     LEFT JOIN organizations org ON org.id = o.organization_id
     ${where}
     ORDER BY (o.ends_at IS NULL), o.ends_at ASC NULLS LAST, o.created_at DESC`
    + (limit ? ` LIMIT $${params.length + 1}` : '');
  if (limit) params.push(Number(limit));
  const { rows } = await query(sql, params);
  return rows;
}

async function findOfferById(id) {
  const { rows } = await query(
    `SELECT o.*, org.name AS organization_name FROM offers o
     LEFT JOIN organizations org ON org.id = o.organization_id
     WHERE o.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function createOffer(fields) {
  const keys = Object.keys(fields);
  const values = keys.map((k) => toParam(fields[k]));
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO offers (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0];
}

async function updateOffer(id, updates) {
  const keys = Object.keys(updates);
  const values = keys.map((k) => toParam(updates[k]));
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  values.push(id);
  const { rows } = await query(
    `UPDATE offers SET ${set}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function deleteOffer(id) {
  const { rows } = await query(`DELETE FROM offers WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

module.exports = {
  parseJson,
  listHeroSlides, findHeroSlideById, countHeroSlides,
  createHeroSlide, updateHeroSlide, deleteHeroSlide,
  listAdvertisements, listAdvertisementsPaged, summarizeAdvertisements, findAdvertisementHistory, findAdvertisementById, findPublicAdvertisementById, findTeacherAdvertiser,
  createAdvertisement, updateAdvertisement, deleteAdvertisement, incrementAdvertisementClick, incrementAdvertisementImpression,
  listAdvertisers,
  listOffers, findOfferById, createOffer, updateOffer, deleteOffer,
};

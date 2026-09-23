# AGENTS.md — Madrasati working charter

This file is the persistent memory for anyone (human or agent) changing this
repository. Read it before touching code. The three memos in `docs/` are
binding specification, not background reading.

## 1. What this project is

Madrasati (مدرستي) is a Yemeni education marketplace and management platform:
one product where admins, institution owners, freelance teachers, and clients
each get their own dashboard, over a single shared institution core.

**Stack**

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS SPA, hash routing, no build step (`design-prototype-v4/`) |
| Backend | Node.js + Express, modular monolith (`server/`) |
| Database | PostgreSQL — the single operational source of truth |
| Auth | Cookie session (`madarasati_session`), in-memory store |

**Layout**

```
design-prototype-v4/   SPA shell, pages, theme (education-green only)
server/modules/        domain modules: identity, organizations, academic,
                       teachers, admissions, bookings, communication,
                       marketplace, ownership, documents, admin, marketing
server/pg-app.js       API entrypoint, mounts every module router
server/v4-static.js    static server; proxies /api and /uploads to the API
db/migrations/         numbered, additive, idempotent SQL migrations
db/migrate.js          migration runner: node db/migrate.js [up|status]
docs/                  the three binding memos
```

## 2. Binding documents

| Memo | Governs |
|---|---|
| `docs/MADARASATI_ACADEMIC_STRUCTURE_REQUIREMENTS_MEMO.md` | Academic model, catalogs, fees, capacity, tenancy |
| `docs/TAHER_ARCHITECTURE_AND_DASHBOARD_CONTROL_MAP.md` | Product architecture, roles, governance, lifecycle |
| `docs/TAHER_DESIGN_SYSTEM_REFERENCE_PORTABLE_V2.md` | Approved palette, shell, navigation, tables, responsive rules |

When code and a memo disagree, the memo wins. If the memo is wrong, change the
memo in the same commit and say why — never leave the two contradicting.

## 3. Architecture rules (do not violate)

1. **Subjects are the only academic foundation.** Curriculum is a
   *classification* (وزاري / أهلي / دولي) attached to subject and stage. Never
   build a second subject system next to it. An institution that needs a
   subject the catalog lacks gets a row in the *same* `subjects` table with
   `organization_id` set (`NULL` = global). `organization_id IS NULL` is the
   filter for the global catalog, and `review_status` (`pending` / `approved` /
   `rejected`) is the moderation lifecycle — only an admin approves, so an
   institution can propose a subject but never admit its own.
2. **Normalized tables are the source of truth.** The legacy JSONB columns on
   `organizations` are a temporary cache. Any new read/write path uses the
   normalized tables; migrate the frontend to them progressively.
3. **Fees are not a module.** There is no standalone fees page or sidebar
   entry. Fees are a property of exactly one priced entity: stage, subject,
   course, or service. `organization_fees` enforces one definition per scope
   through partial unique indexes.
4. **Capacity is derived, never entered.** `remaining_seats` is a generated
   column equal to `capacity - current_students`. Never write it. A NULL
   capacity means "not declared". Over-enrolment is real, so a negative
   remainder is legal and must not be clamped.
5. **Attending mode is an attribute**, not a catalog: `on_site`, `online`,
   `hybrid`.
6. **One tenant core for all institution types.** Private school, government
   school, institute, college, and university share one implementation. Never
   fork five systems.
7. **Tenant isolation is server-side.** Hiding a section in the UI is not
   authorization. Every `/org/:orgId/...` route carries `requireOrgMember`, and
   unauthorized callers receive 404 so existence is not confirmed.
8. **Learning-language sits on two levels:** the stage and the individual
   subject, so an English subject can exist inside an Arabic stage.
9. **Enforced naming:** UI labels come from the `i18n` dictionary in
   `design-prototype-v4/app.js` (AR + EN). Add both languages together.
10. **The global catalog carries no prices.** The platform catalog
    («البيانات الأكاديمية», `#/academic`) defines stages, grades (+ track),
    general subjects, languages and curriculum classifications, and nothing
    else — no amount, no currency, no capacity, no delivery mode. Every price
    belongs to one institution and lives in its offering
    (`organization_stages` / `organization_subjects` / `organization_fees`).
    The platform never prices a stage centrally. A catalog row's `code` is what
    an offering references, so it is labelled with a stage-shaped example, not
    a subject code.
11. **A stage is priced, a subject is priced, capacity is derived.** See rules
    3 and 4; the offering tables hold the amounts, and `remaining_seats` is
    always read, never written.
12. **A teacher is an independent entity, not an organization member.** A
    teacher has a real login account (the `teacher` role) plus a
    `teacher_profiles` row, and owns their own location, availability,
    qualifications, documents and stages. Prices sit on the **subject**
    (`teacher_subjects`, one row per subject with its amount, currency, billing
    period and teaching language) — never on the platform, and never as one
    number on the teacher. Visitors never see the amounts: the two public reads
    carry `optionalAuth`, and `mapTeacher` strips `amount`, `currency`,
    `billingPeriod` and `hourlyRate` for an anonymous caller while setting
    `pricingGated` — the same contract as the institution offering. The gate
    lives on the server; a price that a browser hides is still served. Every
    row needs its amount: `teacher_pricing.amount` is NOT NULL, so the service
    refuses an unpriced subject with `400` instead of letting PostgreSQL
    answer with a `500`.
13. **A teacher is never deleted with one click.** Deletion is a *request* with
    a written reason of at least ten characters; the profile moves to
    `deletion_requested` and verification decides. An approved request is a soft
    delete (`deleted_at` + `profile_status = 'inactive'`) so the audit trail
    survives, and the account itself is closed with it (`users.status =
    'deleted'`), so an approved request also ends the teacher's login.
    Protected accounts (`users.is_protected`) are refused before a
    request is even recorded. Every teacher write, the private documents and the
    deletion queue carry `requireAuth` + `requireRole('admin')`; only the
    public directory read stays open.

## 4. Admin sidebar is frozen at 13 items

`admin` (الرئيسية), `schools`, `teachersAdmin`, `students`, `bookings`,
`verify`, `academic`, `locations`, `offers`, `ads`, `reports`, `access`,
`settings`.

Institutions are **one** entry. Private schools, government schools, colleges,
universities and institutes are five explicit tabs of the single
`adminInstitutionsPage()` screen, always all five visible; an entry only selects
which tab is open on arrival and never hides the other four.
`institutesAdmin`, `collegesAdmin` and `institutions` stay as route aliases so
an existing deep link still resolves. Never split them back into separate
sidebar products.

The marketing entries are split into offers and ads. Payments and fees are
absent by design.

## 5. Design system rules

- Palette: `#1F5D46` (primary), `#174837` (dark), `#B55A3C` (accent),
  `#FAF7F2` (background), `#FFFFFF` (surface), `#1F2937` (text), `#6B7280`
  (muted) for `education-green`, the brand theme and the shell default.
- `theme-presets.json` ships six selectable themes and the picker lists all
  six: education-green, navy-gold, burgundy-sand, teal-desert, plum-rose,
  petrol-bronze. Never delete or hide a preset; add, never swap.
- Reuse the approved shell — header, sidebar, tables, forms, cards. Never
  rebuild it per module.
- Forbidden: corporate blues, legacy ERP look, heavy gradients, heavy shadows,
  small Arabic type, crowded dashboards.
- Tables paginate/filter server-side; never render thousands of rows at once.
- Tables are compact: a 30–32px row rhythm and a grid that shrinks into its
  container instead of a fixed 900px minimum, growing denser again only at
  ≥1700px / ≥2100px. Long values wrap in their own column.
- **A whole row and a whole card are the click target**, not the action icon:
  `row-click` on the row, `tabindex`/`role="link"` + Enter/Space on the card,
  `stopPropagation` on every action button inside, and a `:focus-visible`
  outline. The eye icon is a shortcut, never the only way in.
- Entity rows open a full details view, not a small modal.
- **Every add/edit form is a dedicated page, not an inline panel and not a
  pop-up over the table.** The route is the list route plus a second segment
  (`#/schools/new`, `#/schools/edit/:id`, `#/teachersAdmin/new`,
  `#/academic/stages/new`, `#/offers/new`, `#/ads/edit/:id`, `#/slides/new`,
  `#/locations/<level>/new|edit/:id`, `#/detail/offering/:stageId|new`,
  `#/detail/subject/new`). Only the first segment picks the sidebar page, so a
  form never becomes a sidebar entry, and a refresh or a shared link still opens
  it. Each one renders through the single `formPage()` builder (`app.js`) and the
  single `.uf-page` block (`styles.css`): a «← العودة إلى القائمة» back control,
  one white card centred at `max-width: 760px`, fields at `height: 40px` /
  `border-radius: 8px` / light grey border with a 16px rhythm, a 28%-label /
  72%-control grid on desktop, one column with 44px targets below 768px, and the
  [ إلغاء ] + [ حفظ البيانات ] footer. Auth screens (login / sign-up) keep their
  current split layout and side imagery, and only need to stay responsive.
- **A form with several concerns is a wizard, not one scroll.** `.uf-tabs` names
  the steps; the footer is a single bar (Cancel · counter · Back · Next, or the one
  Save on the last step) — never a save/cancel pair repeated per step. The teacher
  screen is `basic · subjects/pricing/offers · availability · qualifications`; the
  institution screen is `basic · stages/fees/capacity · subjects · documents`. The
  draft sync runs before a step change, so nothing typed is lost.
- **Strict validation before any submit.** A required field left empty on *any*
  step stops the save: the form opens the step that owns it, rings the field and
  names it («أكمل الحقل المطلوب: … — في خطوة «…»»). Declare the rules once
  (`ufValidate`) with the step that owns each field, so the guard and the
  "go to the problem" behaviour cannot disagree.
- **A field carrying an image is a real upload, never a path.** `ufImageUpload`
  gives a picker, an immediate preview and change/remove; only the stored path is
  submitted. Images go to `POST /api/admin/uploads/image?scope=avatars|logos|documents`
  (admin-only, magic-byte sniffed, random names, 4 MB). Institution documents go
  to the private `POST /api/documents/upload` and are never served statically.
- **A repeatable list is a button that appends one row plus a delete button per
  row** — never a count field that must be committed before the rows it describes
  can appear. Never a `window.prompt` where real fields belong.
- Responsive down to 360px, 44×44 touch targets, no horizontal scrolling, RTL
  drawer from the right and LTR from the left. No separate mobile product.

## 5A. Location cascade and the country form

`#/locations` is one cascade — country → governorate → district → neighborhood —
and every level is added/edited on its own dedicated route. The parent select is
always present, and a child select resets when its parent changes so a district
from another governorate can never be offered.

A country is addable and editable by the platform admin: Arabic name, English
name, ISO 3166-1 alpha-2 code and international calling code. The service
upper-cases and validates the code (two Latin letters) and the calling code
(1–4 digits), and checks both for clashes, so the form gets a readable message
instead of a constraint error. The `is_default` country cannot be deactivated,
because the governorate cascade falls back to it. The public country read stays
open; `/api/locations/countries/manage` is the admin read that includes a
deactivated country so it can be re-enabled.

## 5B. The offering belongs to one institution

The platform catalog is abstract and price-free; the money lives in the
institution's own offering. An owner may edit the offering of **their own**
institution only — every other institution renders exactly as a visitor sees it,
and a direct write to another tenant returns `404`, not a confirmation that it
exists (`requireOrgMember`, AGENTS.md rule 7). Changing one school's fees,
capacity or delivery never touches another's.

Capacity stays derived (`remaining_seats = capacity - current_students`) and the
row shows the computed count next to the badge «متوفر مقاعد (فاضي) · N» /
«مكتمل السعة (مليان)» / «السعة غير معلنة». A subject an institution invents for
itself is a row in the same `subjects` table with `organization_id` set and
`review_status = 'pending'`: the institution's "+" proposes, and only the platform
admin approves or rejects it from the «مقترحات المؤسسات» tab of `#/academic`
(`GET /api/academic/org-subjects`, `PATCH /api/academic/subjects/:id/review`, both
admin-only). A global catalog row is never up for review.

## 5C. Teacher promotions ride on the priced row

A teacher's price already lives on the subject (`teacher_pricing`, one row per
subject). A promotion is `discount_percent` + `promo_label` on that **same** row,
never a second price that could contradict the first. The list price stays
visible and the net figure is derived for display. Both fields are pricing facts,
so `mapTeacher` strips them together with `amount`/`currency`/`billingPeriod` for
an anonymous caller.

## 6. Continuous documentation rule

At the end of every phase:

1. Update the memo that governs what you changed.
2. Commit code and memo together.
3. Push to the working branch.

The repository and the memos must never drift apart.

## 7. Everyday commands

```bash
# database
node db/migrate.js status          # what is applied / pending
node db/migrate.js up              # apply pending migrations + reseed test accounts

# services (dev)
node server/pg-app.js              # API
node server/v4-static.js           # static frontend + /api proxy

# whole stack from a bare container (postgres install, migrations, servers)
bash scripts/preview-up.sh         # idempotent; see section 10 for the accounts

# the seven permanent test accounts (password in section 10)
node db/seed-fixed-users.js

# the two academic levels, side by side
curl /api/academic/stages                      # global catalog, price-free
curl /api/academic/org/:orgId/offering         # priced; requireOrgMember
curl /api/academic/org/:orgId/offering/public  # public; pricing gated
curl '/api/advertisements?placement=ticker'    # published ticker strip
curl /api/teachers?limit=5                     # public directory, prices gated
curl /api/teachers/form-catalog                # what the teacher form may pick
curl /api/academic/org-subjects                # admin queue of institution proposals

# a form image (avatar / logo), raw body, original name in the header
curl -X POST '/api/admin/uploads/image?scope=logos' \
  -H 'Content-Type: application/octet-stream' -H 'X-File-Name: logo.png' \
  --data-binary @logo.png                      # admin only; sniffed, 4 MB cap
```

A change to a file under `design-prototype-v4/` is not verified by `node --check`
alone: open the page, drive the real control, and read the row back over the API.
`?v=` in `index.html` must be bumped whenever those assets change, or a browser
keeps serving the previous copy.

Migrations must be numbered sequentially, additive, and re-runnable
(`IF NOT EXISTS`, guarded `DO $$` blocks). Never edit an applied migration —
add a new one.

## 8. Security

- Never commit secrets. `.env` stays ignored; keep `.env.example` current.
- Never store a credential, token, or key in source or in a memo. The single
  exception is the published password of the seven local fixtures in section 10;
  no real user credential ever belongs in the repository.
- Sessions live in memory today, so restarting the API logs everyone out.
  Persisting them in PostgreSQL is open work.
- New organization-scoped routes must carry `requireOrgMember`. A route that
  reads tenant data with only `requireAuth` is a bug.
- Validate and authorize on the server; never trust a client-supplied
  `organization_id` or role.
- Protected system accounts (`users.is_protected`) are refused deletion by the
  API. Keep it that way: deleting one breaks the role fixtures every environment
  depends on.

## 9. Verification habit

Prove a change works before claiming it does: check the real endpoint with a
real session, confirm the row in PostgreSQL, and exercise the failing case as
well as the passing one. A guard is only done when the unauthorized path
returns the refusal you expect.

## 10. Permanent test accounts (protected)

Seven accounts cover every role without hand-registering users. One shared
password: `Admin@123`.

| Email | Role | Institution link | Password |
|---|---|---|---|
| `admin@test.com` | `admin` | — (platform administrator) | `Admin@123` |
| `private@test.com` | `owner` | private school — مدارس النهضة الأهلية | `Admin@123` |
| `gov@test.com` | `owner` | government school — مدرسة الشهيد الحمدي الأساسية | `Admin@123` |
| `collage@test.com` | `owner` | college — كلية العلوم الطبية - صنعاء | `Admin@123` |
| `inst@test.com` | `owner` | institute — معهد صنعاء التقني | `Admin@123` |
| `teacher@test.com` | `teacher` | `teacher_profiles` row (verified) | `Admin@123` |
| `student@test.com` | `client` | — | `Admin@123` |

Owned by `db/seed-fixed-users.js`, which:

- hashes the password with `bcryptjs.hashSync('Admin@123', 10)` — the same cost
  factor the register flow uses, so login verification matches;
- upserts with `ON CONFLICT (email) DO UPDATE`, so re-running repairs drift
  (deleted, suspended, renamed or password-changed accounts return to a
  known-good state) instead of failing or duplicating;
- links each owner to the first organization of its type ordered by slug, so a
  re-run resolves to the same institution rather than drifting between rows.

Protection (`users.is_protected`, migration 032) is enforced inside
`modules/identity/service.js`, not in the route, so it also covers any future
caller. Both deletion doors are shut: `DELETE /api/users/:id` and
`PATCH /api/users/:id` with `status: 'deleted'` each return `403 FORBIDDEN`.

The seed runs automatically at the end of `node db/migrate.js up` — including
when no migration was pending — and `scripts/preview-up.sh` runs both. That is
what keeps the accounts present across a container rebuild.

These are local-development fixtures with a deliberately published password.
They must never be seeded into, or used by, a real deployment.

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
   build a second subject system next to it.
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

## 4. Admin sidebar is frozen at 15 items

`home`, `schools`, `institutesAdmin`, `collegesAdmin`, `teachersAdmin`,
`students`, `bookings`, `verify`, `academic`, `locations`, `offers`, `ads`,
`reports`, `access`, `settings`.

The institution entries share one page (`adminInstitutionsPage(group)`) with
five explicit tabs — private schools, government schools, colleges,
universities, institutes. A sidebar entry only selects which tab is open on
arrival; it never hides the other four types. The marketing entries are split
into offers and ads. Payments and fees are absent by design.

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
- Entity rows open a full details view, not a small modal.
- Responsive down to 360px, 44×44 touch targets, no horizontal scrolling, RTL
  drawer from the right and LTR from the left. No separate mobile product.

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
node db/migrate.js up              # apply pending migrations

# services (dev)
node server/pg-app.js              # API
node server/v4-static.js           # static frontend + /api proxy

# the two academic levels, side by side
curl /api/academic/stages                      # global catalog, price-free
curl /api/academic/org/:orgId/offering         # priced; requireOrgMember
curl /api/academic/org/:orgId/offering/public  # public; pricing gated
curl '/api/advertisements?placement=ticker'    # published ticker strip
```

Migrations must be numbered sequentially, additive, and re-runnable
(`IF NOT EXISTS`, guarded `DO $$` blocks). Never edit an applied migration —
add a new one.

## 8. Security

- Never commit secrets. `.env` stays ignored; keep `.env.example` current.
- Never store a credential, token, or key in source or in a memo.
- Sessions live in memory today, so restarting the API logs everyone out.
  Persisting them in PostgreSQL is open work.
- New organization-scoped routes must carry `requireOrgMember`. A route that
  reads tenant data with only `requireAuth` is a bug.
- Validate and authorize on the server; never trust a client-supplied
  `organization_id` or role.

## 9. Verification habit

Prove a change works before claiming it does: check the real endpoint with a
real session, confirm the row in PostgreSQL, and exercise the failing case as
well as the passing one. A guard is only done when the unauthorized path
returns the refusal you expect.

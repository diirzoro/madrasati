# TAHER SCHOOL / MADARASATI — DESIGN SYSTEM REFERENCE (PORTABLE RECONSTRUCTION)

> Status: portable reconstruction from the approved project reference.
> Use the canonical local project file as the final authority if it differs.

## 1. Approved Visual Direction

- Premium, warm, trustworthy, modern, calm, education-focused.
- Yemen-inspired education imagery without decorative overload.
- Avoid generic blue-enterprise styling, travel-marketplace styling, legacy ERP appearance, excessive gradients, heavy shadows, tiny Arabic typography, and overcrowded dashboards.

Core palette:
```text
Green:      #1F5D46
Dark Green: #174837
Brown:      #B55A3C
Warm BG:    #FAF7F2
White:      #FFFFFF
Dark Text:  #1F2937
Muted:      #6B7280
```

## 2. Stable Shared App Shell

Keep stable:
- Header
- Sidebar
- Navigation pattern
- Page container
- Shared spacing
- Buttons
- Tables
- Forms
- Cards
- RTL/LTR behavior
- AR/EN behavior
- Theme behavior

Module work changes primarily:
- section names
- routes/navigation
- page content
- KPIs
- tables
- forms
- actions
- role permissions
- real data binding

Do not rebuild the whole shell per module.

## 3. Public Navigation

Keep:
- الصفحة الرئيسية
- المدارس الخاصة
- المدارس الحكومية
- الكليات
- المعاهد
- المدرسين الخصوصيين

Arabic uses RTL with sidebar physically on the right.
English uses LTR with sidebar physically on the left.

## 4. Admin Dashboard Information Architecture

Main sidebar:
```text
الرئيسية
إدارة المؤسسات الدراسية
المعلمون
الطلاب
الحجوزات
التحقق والمراجعة
البيانات الأكاديمية
المناطق
العروض
الإعلانات
التقارير والتحليلات
المستخدمون والصلاحيات
الإعدادات
```

This list is frozen at 13 entries. The three former institution entries —
`إدارة المدارس`، `إدارة المعاهد`، `إدارة الكليات` — collapsed into the single
**إدارة المؤسسات الدراسية** entry, because they were already backed by one page
implementation and three links made an institution's type look like three
different products. The five types are tabs of that one screen:

| Tab | Type |
|---|---|
| مدارس خاصة | private school |
| مدارس حكومية | government school |
| كليات | college |
| جامعات | university |
| معاهد | institute |

All five tabs are always visible; the entry that led to the screen only decides
which tab opens on arrival, and it never hides the other four. The old route
names (`schools`, `institutesAdmin`, `collegesAdmin`, `institutions`) survive as
aliases so an existing deep link still resolves. Never fork a separate
management system per institution type.

### Academic Data

One sidebar section: `البيانات الأكاديمية`

Internal tabs:
- المراحل
- الصفوف
- المواد
- المناهج
- لغات التدريس
- طرق التدريس

`المواد` (Subjects) is the only academic foundation. `المناهج` is **not** a
parallel system: it is a curriculum **classification** — وزاري، أهلي، دولي —
attached to a subject and a stage. Do not build a second subject catalog
beside it.

### What the sidebar deliberately does not contain

- **No `الرسوم` entry.** Fees are not a module. They are a property of exactly
  one priced entity — stage, subject, course, or service — and are managed and
  displayed in that context. A standalone fees page or route must not exist.
- **No payments module.** There is no active financial logic, and no simulated
  balances or transactions are ever displayed.
- **No `التسويق` grouping.** Offers and advertisements are separate sections,
  because offers are published by the owner directly while ads require
  admin approval and pricing.

### Locations

One sidebar section: `المناطق`

Internal tabs:
- الدول
- المحافظات
- المديريات
- الأحياء
- طلبات إضافة المواقع

Hierarchy:
```text
Country
→ Governorate/Region
→ District/Directorate
→ Neighborhood/Area
→ Address
→ Coordinates
```

### Users & Permissions

One sidebar section: `المستخدمون والصلاحيات`

Internal tabs:
- المستخدمون
- الأدوار
- مصفوفة الصلاحيات
- استثناءات المستخدمين
- صلاحيات الأقسام والصفحات

Typical actions:
```text
View
Create
Edit
Delete
Approve
Verify
Export
Manage
```

Scoping may depend on role, user, organization, teacher, and tenant scope.

### Settings

Suggested tabs:
- عام
- المظهر والثيمات
- النسخ الاحتياطي
- الأمان
- التكاملات
- الإشعارات
- الصيانة والإصلاحات
- النظام
- البيانات

Backup must not be presented as operational unless a real backend exists.

## 5. Dashboard Rule

Every role gets one contextual Overview/Home dashboard.

KPIs must be:
- role-scoped
- meaningful
- linked to useful filtered views where appropriate
- based on real/available data

Do not put KPI cards on every internal page.

## 6. Tables

Use premium data-grid styling with:
- alternating white / very-light-blue rows
- subtle hover/focus
- sticky header where useful
- server-side pagination/filter/sort for real data
- full-row click where appropriate
- small logo/avatar/image
- status badges

Large lists should not render thousands of rows at once.

### Table density (implemented behaviour)

The base grid was 42px rows with 11px padding and a 900px minimum width, which
forced a horizontal scrollbar on a 14" laptop and read as oversized next to the
rest of the shell. `.tbl` is now on a 30–32px rhythm with the table free to
shrink into its container, and the density scales back up only where there is
genuine room:

- ≤ 900px: 10.5px cell type, 28px entity logo
- ≤ 1200px: `min-width` removed so the grid fits without a sideways scroll
- ≥ 1700px and ≥ 2100px: padding and type grow again, so a 20"–30" display
  shows more information rather than a wider single column

Long values wrap inside their own column instead of pushing the table wide.

### Whole-row and whole-card click

A row and a card are the target, not the action icon:

- the institutions table row carries `row-click` and opens the detail screen;
- the institution card itself carries `tabindex="0"`, `role="link"` and an
  `aria-label`, and answers both click and Enter/Space;
- every action button inside them stops propagation, so verify, archive or
  WhatsApp never double as a visit;
- both expose a `:focus-visible` outline, so the affordance is not mouse-only.

The eye icon remains a shortcut, never the only way in.

### The entity cell

The first column shows a small square logo (`row-logo`, 8px radius, ~32px)
beside the name, followed by the governorate · district · neighborhood line, the
phone number and the owner with a verification badge — the same identity the
card shows, so the two views never disagree about an institution.

### Tables on small screens (implemented behaviour)

A data table does not scroll sideways on a phone. Below 760px each row becomes
a stacked card: every cell prints its own column name above the value.

- `stampTableLabels()` copies each `<th>` text onto the matching `<td>` as
  `data-label`, and CSS renders `td::before { content: attr(data-label) }`. The
  label therefore always matches the header the user is looking at, and a new
  column needs no CSS work.
- The column that holds the row actions has an empty header, so it receives an
  empty label and CSS drops the label line rather than printing a blank one.
- Only `table.tbl` is transformed; a table that is not a data grid keeps its
  normal layout.
- The rule is idempotent, so the stamp may run on every render without
  overwriting a label a module set on purpose.

CRUD actions:
- View
- Edit
- Verify/Approve
- Delete
- More

## 7. Detail Pages

Entity rows normally open a full Detail Page.

Use:
- hero/cover visual where appropriate
- logo/avatar
- status/verification badge
- contextual KPIs
- tabs/sections
- clear action hierarchy

Avoid tiny detail modals for complex entities.

### Institution detail layout and teacher profile

The five institution types use one `rd-*` detail document in both the public
and dashboard shells. It has a light cover with the institution's own identity,
status badges and contact links, section tabs, paired facts and description,
full-width programs and subjects, teacher and facility panels, a map and
gallery row, documents, and an action bar. The design is scoped to `.rd-page`
and follows the selected theme preset. The selected institution's API data,
routes and media resolver remain the source of the content. No dashboard or
directory layout changes as part of this institution detail design.

The teacher profile retains its `ed-*` editorial document and its own cover,
figures, tabs, and subject, pricing and availability sections. Both documents
render through their existing public/dashboard shells. Institution owners and
admins retain the add/edit controls and dedicated form routes for offerings
and subjects. Prices remain gated for anonymous users; capacity is derived;
generic media is labelled illustrative. Verify both shells and the 360px view.

## 8. Forms

**Every add/edit form is a dedicated page, never an inline panel and never a
pop-up over a table.** This supersedes the earlier "small additions use a
modal/drawer" wording: a form squeezed between a table's header and its rows is
where this system drifted, so the rule is now one shape for every entity
(institution, teacher, student, stage, grade, fee, offer, advertisement, slide)
and for anything added later.

### 8.1 The route

Each section keeps its list route and gains a form route beside it:

```text
#/schools                     list          #/schools/new        add
#/schools/edit/:id            edit          #/teachersAdmin/new  add
#/teachersAdmin/edit/:id      edit          #/academic/stages/new  add
#/academic/grades/new         add           #/offers/new         add
#/offers/edit/:id             edit          #/ads/new            add
#/slides/new                  add           #/slides/edit/:id    edit
#/detail/offering/:stageId|new?id=:orgId   institution stage + fee
#/detail/subject/new?id=:orgId             institution-owned subject
```

Only the first path segment selects the sidebar page; the second (and third)
tell that page to render its form instead of its table. A new form therefore
never becomes a new sidebar entry, and a refresh or a shared link still opens
the form. The form route carries the same authentication and role guards as its
list route, and every write still carries `requireOrgMember` /
`requireRole('admin')` on the server.

### 8.2 The shape

One implementation, `formPage()` in `app.js`, and one CSS block, `.uf-page` in
`styles.css`, produce all of them:

- a back control at the top reading **«← العودة إلى القائمة»** / "← Back to the
  list", which returns to the section list;
- one white card, centred (`max-width: 760px; margin: 0 auto;`), light border
  and a soft shadow — no nested cards, no panel title with a close button;
- footer actions: **[ إلغاء ]** and **[ حفظ البيانات ]**, the save button in the
  primary theme colour.

Fields are built by the existing `wInput` / `wSel` / `wArea` / `wCheck` helpers,
so a field looks the same in every section:

- controls are `height: 40px`, `border-radius: 8px`, with a light grey border
  (`#d1d5db`, following the active theme in dark mode) and a uniform 16px
  vertical rhythm;
- on desktop the label occupies a 28% column at the right (RTL) and the control
  the remaining column;
- below 768px the row collapses to a single 100% column with 44px touch targets,
  and the footer actions stack full width.

Validation, `required`/optional marking, preserved draft values, cascading
selects and inline error text are unchanged: the server still decides what is
accepted, this system only decides how the form is presented.

### 8.3 Locations: one cascade, one form per level

The geographic catalog (`#/locations`) is a cascade — country → governorate →
district → neighborhood — and every level is a row in one tree. Each level is
added and edited on **its own dedicated route**, built by the same `formPage()`:

```text
#/locations/countries/new        #/locations/countries/edit/:id
#/locations/governorates/new     #/locations/governorates/edit/:id
#/locations/districts/new        #/locations/districts/edit/:id
#/locations/neighborhoods/new    #/locations/neighborhoods/edit/:id
#/locations/requests/new
```

- Every level except the missing-location request is admin-only; the server
  enforces it and the screen only decides what is worth showing.
- A parent select is always present, so a governorate is created under a
  country, a district under a governorate, a neighborhood under a district —
  and the child select resets when its parent changes, so a district belonging
  to another governorate can never be offered.
- **A country is addable and editable**: Arabic name, English name, ISO 3166-1
  alpha-2 code, and international calling code. The code is upper-cased and
  validated as two Latin letters, the calling code as 1–4 digits, and both are
  checked for clashes in the service so the form gets a readable message instead
  of a constraint error. The default country (`is_default`) cannot be
  deactivated, because the governorate cascade falls back to it.
- The public country read stays open; the admin read (`/countries/manage`)
  includes a deactivated country so it can be re-enabled.

### 8.4 Long forms are a wizard, not one scroll

A form that carries several unrelated concerns is not a long vertical stack and
not a set of empty steps waiting for a pop-up. It is an ordered wizard: one step
visible at a time, each step a real editing surface with its own controls, and one
navigation bar for the whole form.

The four steps are declared in one place per form, and the strip, the guard and
the "go to the problem" behaviour all read that same list, so they cannot disagree
about what a step is or where a field lives.

**Teacher** (`#/teachersAdmin/new`, `…/edit/:id`):

```text
1 البيانات الأساسية            who the teacher is: name, contact, photo, location
2 المواد والأسعار والعروض      one priced row per subject, each with its own place,
                              currency, billing period, language, discount and promo
3 أوقات التوفر والجدول         the weekly windows the teacher accepts bookings in
4 المؤهلات والخبرات            qualifications, and the stages they are qualified for
```

**Institution** (`#/schools/new`, `#/schools/edit/:id`) — every institution type,
because all five share one core:

```text
1 المعلومات الأساسية          name, type, logo (upload), contact, address and location
2 المراحل والرسوم والسعة       the stages it teaches, with its own fee, currency,
                              billing period, language, delivery mode and capacity
3 المواد والتخصصات            the subjects it teaches, with a language and a fee each
4 الوثائق والتراخيص            licence / ownership / accreditation file uploads
```

Rules the wizard obeys:

- **One footer, never two.** The step strip is at the top; the footer is a single
  bar holding Cancel, the step counter (n / 4), Back and either Next or the one
  Save. A form no longer shows a save/cancel pair repeated on every step.
- **Strict validation.** Nothing is submitted while a required field on *any* step
  is empty. The guard walks the steps in order, opens the step that owns the first
  missing field, rings that field and names it in the message
  («أكمل الحقل المطلوب: … — في خطوة «…»»), so the user is told what is missing and
  where. `ufValidate()` reads the rules once; `render()` re-applies the mark after
  the repaint, so the highlight survives the re-render that shows the step.
- **No native prompts.** A subject the catalog lacks is proposed from real fields
  inside the step, with its own validation, not from a `window.prompt`.
- **A repeatable list is a button that appends one row plus a delete button per
  row** — teacher subjects, availability, qualifications; institution stages,
  subjects, documents. Never a count field that must be committed before the rows
  it describes can appear.
- **Draft sync before every step change**, so a value typed on one step is never
  lost when another step renders.

### 8.5 Real uploads, not file paths

A field that carries an image is a real upload control: a file picker, an
immediate local preview, and explicit change and remove actions. The stored path
is the only thing the form submits, so nothing else about the payload changes.

| Endpoint | Guard | Purpose |
|---|---|---|
| `POST /api/admin/uploads/image?scope=avatars\|logos\|documents` | `requireRole('admin')` | Raw image body, original name in `X-File-Name`; returns `{path, mime, size, url}`. |
| `POST /api/documents/upload?organizationId=&docType=` | owner of that institution, or admin | An institution's licence / accreditation file. Private: streamed as an attachment, never served statically. |

The image endpoint decides the type by **sniffing the magic bytes**, never by the
extension the client claims, and refuses anything that is not JPG, PNG or WEBP
(WEBP is checked at its `WEBP` marker, not just the `RIFF` header). Every stored
name is random and the file lands in the folder its scope names. The directory
`/uploads/images` is served statically, which is exactly why the validation is
strict: anything that reaches it is publicly readable by design, so only genuine
images can. Institution documents deliberately stay out of it.

Teacher avatars and institution logos both come from this one endpoint, so the
"change file / remove" behaviour cannot differ between the two screens.

### 8.6 The stage grade ladder

Adding a stage carries its grades with it, so the platform admin does not have to
create each grade afterwards:

- name (Arabic), English name, code, description;
- a repeatable row per grade name — "إضافة صف" appends, the trash button removes;
- a blank row is dropped rather than rejected, so a half-typed ladder never
  blocks the stage, and the graded rows are posted as the `grades` array the
  service already accepts, which derives each grade code from the stage code
  (`SEC` → `SEC1`, `SEC2`, …).
- The code field's example is a **stage-shaped** code (`مثال: SEC أو ثانوية`),
  because that code is what an institution offering points at — never a subject
  code such as `MATH`.

### 8.7 What this does not touch

The exception is the authentication screens. Login and sign-up keep their
current split layout and side imagery (`auth-pages.css` / `auth-pages.js`);
they are only required to stay responsive.

The form system itself is UI, CSS and routing: it does not add, remove or rename
a column, and it changes no endpoint's payload. Three **additive, re-runnable**
migrations were needed by the features in this phase and are the only schema
movement:

| Migration | Why |
|---|---|
| `036_locations_country_admin.sql` | `locations_countries.name_en`, so a country has a bilingual name; plus an index on `code` |
| `037_teacher_subject_promo.sql` | `teacher_pricing.discount_percent` + `promo_label`, so a promotion rides on the same priced row as the list price instead of contradicting it |
| `038_teacher_subject_mode.sql` | `teacher_pricing.location_mode`, so the *place* a lesson happens is declared per subject, in the same three tokens the weekly availability already uses |

All three are nullable-only additions, so every pre-existing row keeps its exact
meaning. Never edit an applied migration — add a new numbered one.

**The place of a lesson is per subject.** The teacher-level booleans the public
directory filters on (`offers_online`, `travels_to_student_home`,
`accepts_student_home`) are now *derived* from the subject rows whenever a save
carries subjects, on both create and update, so a profile cannot claim to teach
online while none of its subjects says so. There is one source of truth and the
two layers cannot contradict each other. The location mode is a property of the
offer, like the delivery mode of an institution offering, so it stays visible to
an anonymous reader; the price beside it does not.

### 8.8 Tenant isolation of the priced offering

The platform catalog (`#/academic`) is an abstract, price-free definition. The
money lives in the institution's own offering, and that offering is per tenant:

- an institution's fees, capacity, delivery mode and teaching language are its
  own rows, so changing one school's amounts never touches another's;
- the platform admin may edit any institution's offering;
- an owner may edit **only** the institution they belong to. They see every
  other institution exactly as a visitor does, and a direct write to another
  tenant returns `404` rather than confirming it exists;
- capacity stays derived: `remaining_seats = capacity - current_students`, the
  row shows the computed number, and the badge reads
  «متوفر مقاعد (فاضي) · 12» / «مكتمل السعة (مليان)» / «السعة غير معلنة»;
- a subject an institution defines for itself is a row in the **same** `subjects`
  table with `organization_id` set and `review_status = 'pending'`. The
  institution's "+" proposes it; only the platform admin approves or rejects it,
  from the «مقترحات المؤسسات» tab of `#/academic`. A global catalog row is never
  up for review, and the review route is admin-only on the server.

### 8.9 General form capabilities

Forms should support:
- comfortable inputs
- clear labels
- required/optional distinction
- inline validation
- searchable selects
- preserved values
- previous/next
- save progress
- unsaved-change warning where relevant

## 9. Future Role Information Architecture

Private Teacher / Freelancer:
```text
Overview
Profile
Subjects
Stages/Grades
Languages
Teaching Modes
Pricing
Schedule
Availability
Attendance
Absence/Leave
Holidays
Summer Classes
Remedial/Reinforcement Classes
Students
Bookings
Messages
Offers
Reviews
Verification
```

Client:
```text
Overview
Search
Recently Viewed
Favorites
Compare
Applications
Bookings
Messages
Notifications
Family/Students
Profile
```

These are future role experiences and should not be fully built during the current Admin-first stage.

## 10. Responsive / Touch / Android

The same V4 must work on desktop, tablet, and Android/mobile.

Target widths:
```text
360, 375, 390, 412, 430
768, 820
normal desktop widths
```

Requirements:
- no uncontrolled horizontal overflow
- important touch targets about 44×44 CSS px where practical
- no essential hover-only behavior
- responsive mobile drawer
- Arabic drawer from right / English drawer from left
- usable tables on small screens
- stacked forms where needed
- topbar adapts without uncontrolled overflow

Validate each integrated screen for:
- Desktop
- Tablet
- Android/mobile
- Touch
- Arabic RTL
- English LTR
- Light Mode
- Dark Mode

Do not create a separate mobile product.

## 10A. Institution Cards, Detail Chips, Report Header, Announcement Ticker

Approved additions to the frozen system. They reuse the existing shell; none of
them introduces a new visual language.

**Institution cards and rows.** A card or a table row that represents an
institution must carry, at minimum: the official logo, the name and type, the
owner/principal name with a symbolic avatar, the location as
(المحافظة · المديرية · الحي), and the contact block. Phone and email render in
an `dir="ltr"` span so `+967` stays at the start of the number inside an RTL
layout. A green WhatsApp action sits next to the number and opens
`https://wa.me/967...` in a new tab. Cards open the full details page; they are
not the place for a full record.

**Facilities and services are one component.** Both lists render through the
same chip component under their own heading, so a service looks exactly like a
facility, with its price in the chip when one exists. Services must not degrade
into plain text. Delivery values are exactly three — حضوري / عن بُعد / مدمج —
and a status word such as «نشط» never appears in that list.

**Themes stay six.** `theme-presets.json` ships six presets and the picker
lists all six: الأخضر التعليمي (education-green, the default and the only
brand-approved palette for the shell), الكحلي والذهبي, الخمري والرملي,
التركواز والصحراء, البنفسجي والوردي الترابي, البترولي والبرونزي. No preset may
be deleted or hidden. Any new theme is added, never swapped in.

**Print and export carry the header.** The printed institution report is an A4
document with the platform header (mark + platform name) on one side and the
institution's own logo, name and type on the other, the issue date in the
footer, and tables ruled for paper. The same document is what Excel, PDF and
Word export. Money columns in a spreadsheet are real numbers with a separate
currency column, not pre-formatted text, so a reader can sum them.

**Announcement ticker.** The top strip is a continuous horizontal marquee:
`ticker-ltr` for English and `ticker-rtl` for Arabic, the content duplicated
once so the loop has no gap, paused on hover or focus, and replaced with a
wrapping static line under `prefers-reduced-motion`. It reads published rows
from the advertisements table (`/api/advertisements?placement=ticker`) and stays
visible with an invitation message when no row is published. It is hidden in
print.

## 11. Design Freeze / Implementation Safety

During backend hardening or requirements work, do not redesign the approved V4 shell or visual system.

Agents must:
- inspect the existing implementation first
- reuse the existing shell and design system
- change only the requested module/section
- avoid broad visual rewrites

## 12. Implementation status — current qoder-test build

The approved V4 shell, palette and six theme presets are unchanged by the
earlier development build described in this section. The `?v=` query in
`index.html` is bumped whenever `app.js` or `styles.css` change so a browser
never serves a cached copy. New screens added by this build (the teacher and
institution wizards, the organization academic setup and offering screens, and
the country admin form) all render through the single `formPage()` builder and
the single `.uf-page` block, so they inherit the same centred 760px card, the
40px fields with an 8px radius, the 28/72 label grid and the shared `.uf-tabs`
wizard footer. Tables continue to paginate and filter server-side, and a whole
row or whole card remains the click target.

The superseded `design-prototype-v4/temp-v4/` detail template pack and the
unused `assets/images/school-logo-*.svg` placeholders were removed. The live
detail pages use the shared shell and the entity media resolver described above;
the remaining project images and generic reference images are still used by
that resolver or by the public pages.

## 13. Teacher and client account details

The chosen second teacher prototype is implemented in the shared teacher profile
renderer used by the public directory and admin dashboard. It has a compact
dark-green identity header, a plain statistics strip, per-subject cards, and a
contact card alongside the details. The contact action uses the teacher's real
contact value and selected subject. Only uploaded photos belong to the teacher's
gallery; a generic portrait is labeled as illustrative. Anonymous visitors see
the same profile structure with prices withheld by the server.

The admin client account detail follows the same visual rhythm and opens from
a whole clickable account row. Add and edit use dedicated `#/students/new` and
`#/students/edit/:id` routes in the shared form shell. The detail groups account
and declared profile data, consent-based activity summaries, and feedback.
It does not imply an academic student record. The client dashboard at
`#/client` exposes profile preferences, a clear activity opt-in, and a feedback
form. Empty activity views say that no data has been recorded.

The landing page reads organization and teacher totals and cards from their
public API directories, and governorate totals from the location catalog. Its
search controls lead to those same directories, and an admin sees a direct link
to the protected student/client account section. Published hero slides remain
under the marketing dashboard's API control. No student count is published.

The Users & Access screen retains one global sidebar item and follows the
institution module's `.section-tabs.ac-tabs` pattern. Main tabs and user-detail
tabs use hash routes so refresh and Back retain the selected view. All eight
main tabs stay visible in a compact four-column grid, becoming two columns on
narrow screens without horizontal scrolling. User rows are full keyboard-accessible click targets. Membership
add/edit uses the shared dedicated `formPage()` rather than an inline editor.
Only data-backed user tabs are shown; sessions explicitly identify the current
in-memory limitation, and no fabricated documents or academic records are
shown.

The `#/access` overview uses six small linked metrics with one label, icon and
number per item. They use restrained green accents and stay in two columns on
mobile; all numbers use western digits `0–9` in both UI languages. The values
come from PostgreSQL and link to the corresponding section. Recent activity and
quick links sit below the metrics. Arabic mode translates visible role, status,
permission and audit labels while preserving machine codes in API payloads. The owner
staff directory reuses the same compact table/actions and dedicated `formPage()`
layout, with separate controls for editing, suspending, archiving and restoring
an institution assignment.

### Reports & Analytics Center

The Reports entry opens a single reporting environment, not a CRUD page.

**Landing header.** The catalog opens with a static, image-led banner: the
platform photograph (`assets/images/hero-yemen.jpg`) fills the header under a
neutral dark scrim — no brand-colour gradient — and the live headline figures
sit in translucent statistic cards on top (institutions, teachers, users, active
advertisements). Two mini visuals share the banner: a small institutions-by-type
donut and a 14-day activity sparkline. The numbers come from one light
`/api/reports/headline` call and are real; the banner is read-only.

**Executive overview cards.** KPI cards are a strict **three-per-row** grid on
desktop (two below 820px, one below 520px), never a long row of identical tiles.
Each card has an icon, the primary number, a label, an optional context line and
a trend badge — but a trend is shown only when the previous equal-length period
actually supports a percentage.

**Analytics colour language.** Positive/active is green (`#2F7A59`),
warning/pending amber (`#C98A1B`), negative/rejected terracotta (`#A64E3E`),
information blue (`#2E6F9E`), neutral grey. Charts use this fixed palette so
they read on both light and dark surfaces; every colour lives in
`reports-center.css` tokens, never hardcoded in JavaScript.

**Report view.** A cover block states the title, period and generated date; a
period selector (today → custom range), per-report filters, a nav of report
types, and Print / Export / Save actions follow. KPIs, then charts, then tables,
then limitation notes. Charts are chosen by the question (donut for
distribution, horizontal bars for ranking, area/line for time, grouped bars for
capacity vs students), each with a title, tooltip, no-data state and RTL/dark
support. Clicking a chart legend chip filters the table below — the drill-down
is real, not decoration. Charts and tables never fabricate a trend: a metric
with no stored history shows a professional empty state instead.

**Tables** carry an entity cell with the real logo, badge cells for status,
date/number formatting, a search box, column-visibility menu, sortable headers,
server-side pagination and a per-table CSV export. The whole entity name links to
the record; a details view (not a modal) opens for entities.

**Exports** are part of the product: PDF (print template with branded header,
KPI blocks, charts and branded table headers), Word (cover, KPI grid, chart
images, styled tables, RTL Arabic), Excel (styled workbook, freeze panes,
auto-filter, number/date formats) and CSV. The Export Center previews before
downloading; the Import Center downloads a template, validates, and only then
writes.

All report screens respond from 320px up with no page-level horizontal
scrolling, switch cleanly between Arabic RTL and English LTR (charts included),
and keep their contrast in every theme preset and in dark mode.

### Advertisement Management Center — statistic cards

The lifecycle cards on the advertisements overview (`ads-center.css`) follow
rules that exist because their opposites were tried and rejected.

**A card keeps a card's proportions.** The grid is
`repeat(auto-fit, minmax(190px, 300px))` with a start-aligned row, so a track is
capped at 300px. An uncapped `1fr` ceiling let two surviving states stretch to
659px on a 1330px row — a 659×123 slab where an 11.5px label floated alone on a
625px line. Do not reintroduce a `1fr` ceiling, and do not add a breakpoint that
forces fixed column counts: the capped `auto-fit` already lands on 2-up, 3-up or
4-up, and a `≤1400px` rule forcing four stretched columns is what produced 227px
cards on a 1000px screen.

**Air steps down on narrow screens; it never collapses.** Desktop is
`padding:16px 18px` with a `min-height:126px` floor and
`align-content:space-between`, so the share meter pins to the bottom edge. Below
560px the card is a single column and the block tightens in two documented steps
— `14px 15px` / `112px` floor at ≤560px, `13px 14px` / `104px` at ≤400px — which
is what a 265px-wide card should look like at 320px. What is forbidden is going
edge-to-edge or near it: **no card padding below 12px**, and the value may step
`30px → 26px → 24px` while the icon shrinks with it. An earlier draft flattened
padding to `11px` on mobile, which is the cramped look this section exists to
prevent. The 300×126 desktop box and the 265×104 320px box are both correct;
an unaccounted third box is not.

**Arabic type never goes below 12px.** The card label is `12.5px` and it is
*held* at `12.5px` by the ≤560px rule — only the number steps — dropping to
`12px` at ≤400px, and the empty-state line is `12px`. An earlier rule dropped
the label to 10.5px on mobile, which is exactly the small-Arabic-type this
document forbids. Contrast for the 30px value is 6.65:1 light and 5.58:1 dark.

**Only populated states become cards.** Each card is one clickable filter; the
states with no rows collapse into a single line of small, still-linked chips so
nothing becomes unreachable, and they stop competing with the rows that need a
decision.

**Two engineering rules this screen earned the hard way:**

1. *Module tokens are declared on `:root`, not only on the page wrapper.* They
   are `--ads-*` prefixed so they cannot collide. Scoping them to `.ads-page`
   alone meant that any markup escaping the wrapper silently lost every
   `var(--ads-card)` / `var(--ads-line)` and fell back to transparent surfaces
   with no border.
2. *A page wrapper must be closed by its own tag.* `statHero` opened `<section>`
   and closed it with `</div></div>`. The second `</div>` had no div in scope, so
   the parser popped the section **and** the enclosing `.ads-page`, and every
   element after the hero became a sibling of the wrapper. The layout still
   measured perfectly — equal widths, correct heights, no overflow — which is
   exactly why the fault survived: geometry passed while the screen was blank.
   When a container's tokens are declared on that container, assert in review
   that `container.querySelectorAll(':scope > *')` still holds the whole body,
   and that one card's computed `background-color` is not `rgba(0, 0, 0, 0)`.

**Measured card box by viewport** (the matrix these rules are checked against —
re-measure it rather than reasoning about the breakpoints):

| viewport | card | cards per row |
|---|---|---|
| 1425 / 1024 / 820 | 300×126 | 2 |
| 560 | 505×112 | 1 |
| 400 | 345×104 | 1 |
| 360 | 305×104 | 1 |
| 320 | 265×104 | 1 |

No page-level horizontal scrolling at any of these widths, and no card is wider
than its viewport.


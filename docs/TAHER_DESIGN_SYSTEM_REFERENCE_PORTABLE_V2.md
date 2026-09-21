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

### 8.4 Long forms are tabbed, not stacked

A form that carries several unrelated concerns does not become one long column.
The teacher add/edit screen is the reference: four horizontal tabs inside the
same `.uf-card`, one concern each.

```text
البيانات الأساسية            Basic info
المواد والأسعار والعروض      Subjects, pricing and offers
أوقات التوفر والجدول         Availability and schedule
المؤهلات والخبرات            Qualifications and experience
```

- The strip (`.uf-tabs`) spans both grid tracks and sits above the fields.
- Switching a tab runs the form's own draft sync first, so a value typed on one
  tab is never lost when another tab renders — the same draft map the dynamic
  rows already used.
- A repeatable list (priced subjects, weekly slots, qualifications, grade names)
  is always **a button that appends one row plus a delete button per row**, never
  a count field that has to be committed before the rows it describes can
  appear. That is the pattern used for teacher subjects, availability,
  qualifications, and the stage grade ladder.

### 8.5 The stage grade ladder

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

### 8.6 What this does not touch

The exception is the authentication screens. Login and sign-up keep their
current split layout and side imagery (`auth-pages.css` / `auth-pages.js`);
they are only required to stay responsive.

The form system itself is UI, CSS and routing: it does not add, remove or rename
a column, and it changes no endpoint's payload. Two **additive, re-runnable**
migrations were needed by the features in this phase and are the only schema
movement:

| Migration | Why |
|---|---|
| `036_locations_country_admin.sql` | `locations_countries.name_en`, so a country has a bilingual name; plus an index on `code` |
| `037_teacher_subject_promo.sql` | `teacher_pricing.discount_percent` + `promo_label`, so a promotion rides on the same priced row as the list price instead of contradicting it |

Both are nullable-only additions, so every pre-existing row keeps its exact
meaning. Never edit an applied migration — add a new numbered one.

### 8.7 Tenant isolation of the priced offering

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

### 8.8 General form capabilities

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

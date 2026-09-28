# MADARASATI / TAHER — Architecture & Dashboard Control Map

**Purpose:** Consolidated handoff for the latest agreed dashboard architecture, role scopes, permissions, organization ownership, and agent working rules.

## 1. Product Model

MADARASATI is an education marketplace + management platform.

Public categories:
- Private Schools
- Government Schools
- Private Teachers
- Colleges & Universities
- Institutes

Authenticated experiences:
1. Super Admin
2. Education Organization Owner
3. Private Teacher / Freelancer
4. Client / Parent / Guardian / Student

Dashboard experiences are role/context experiences, not separate applications.

## 2. Shared Organization Core

One shared Education Organization Core is used for:
- private_school
- government_school
- college
- university
- institute

Behavior is driven by:
- organization type
- capabilities
- tenant scope
- role
- permissions

Do not create five duplicate organization systems or codebases.

## 3. Super Admin / Admin Scope

Admin is the central platform governance layer.

Main groups:
- Overview
- Providers
- People
- Academic
- Marketplace & Engagement
- Operations
- Locations
- Governance

The approved visual sidebar groups include:
- الرئيسية
- إدارة المدارس
- إدارة المعاهد
- إدارة الكليات
- المعلمون
- الطلاب
- الحجوزات
- التحقق والمراجعة
- البيانات الأكاديمية
- المناطق
- العروض
- الإعلانات
- التقارير والتحليلات
- المستخدمون والصلاحيات
- الإعدادات

Admin/Super Admin controls shared/global reference data and platform governance, including:
- Stages
- Grades
- Subjects
- Languages
- Locations
- Service Types
- Other controlled reference lists
- Verification and governance
- Platform access/permissions
- Platform settings and operational controls where a real backend exists

Admin should not casually overwrite organization-owned operational data, especially detailed organization fees.

## 4. Organization Owner Scope

Use a shared Owner Core plus type-specific modules.

Shared Owner Core:
- Organization Identity
- Basic Information
- Owner
- Contact Information
- Official Documents
- Verification
- Photos / Logo
- Location
- Common Services
- Memberships
- Settings
- Activity

Potential type-specific modules:

### Private School
- Stages
- Grades
- Subjects
- Capacity / Seats
- Fees
- Schedule
- Transportation
- Admissions
- Other approved school modules

### Government School
Shared Core + government-school academic/configuration requirements.

### College
- Departments
- Programs
- Courses
- Subjects
- Fees
- Academic Calendar
- Schedule

### University
- Faculties / Colleges
- Departments
- Programs
- Courses
- Subjects
- Fees
- Academic Calendar
- Schedule

### Institute
- Training Programs
- Courses
- Subjects
- Fees
- Schedule

Owner controls only their organization/tenant data through backend authorization. Owner A must not access Owner B's subjects, fees, capacity, or services.

## 5. Private Teacher / Freelancer Scope

A Private Teacher is a freelancer/provider, not an educational organization.

One user can have:
- one Teacher/Freelancer profile
- optional memberships with one or more organizations
- independent teaching configuration

Future sections:
- Overview
- Professional Profile
- Subjects
- Stages / Grades
- Languages
- Teaching Modes
- Pricing
- Schedule
- Availability
- Attendance
- Absence / Leave
- Holidays
- Summer Classes
- Remedial / Reinforcement Classes
- Students
- Bookings
- Messages
- Offers
- Reviews
- Verification

Teacher configuration should reuse global:
- locations
- stages
- grades
- subjects
- languages
- service/delivery modes

Teacher registration/verification remains controlled by Admin.

## 6. Client / Parent / Guardian / Student Scope

Client experience is intentionally lighter.

Potential sections:
- Overview
- Search
- Recently Viewed
- Favorites
- Compare
- Applications
- Bookings
- Messages
- Notifications
- Family / Students
- Profile

Client can, where enabled:
- revisit providers
- send inquiries/messages
- follow conversations
- submit admissions/registration inquiries/applications
- track status
- provide documents
- receive replies
- book visits/interviews

Detailed student/parent requirements are not to be invented beyond approved requirements.

The `students` admin route is displayed as "العملاء" / "Clients" so existing
deep links keep working. It lists only registered `client` accounts; the
dashboard count uses the same role filter. Admins can create a client, edit the
account and profile, suspend/reactivate it, and soft-delete it through the
protected `/api/users` routes. The seven protected fixture accounts remain
undeletable. Lists are filtered and paginated on the server.

Migration 039 adds `client_profiles` for declared kind (`student`, `parent`,
`both`, `other`, or `unspecified`), interests, preferred locations, contact
preference, internal notes, and activity consent. Registered location remains
on `user_profiles` and uses the locations catalog. Kind is a declared profile
attribute, never proof of enrolment or guardianship. `client_feedback` holds
suggestions, complaints and inquiries with an admin-managed status. The client
can edit their own non-admin profile fields and submit feedback from `#/client`;
only admins see internal notes and the feedback queue.

`client_activity_events` records first-party visits to public sections and
searches for authenticated clients only after their explicit opt-in. Admin
insights aggregate the last 90 days into visited sections, active hours,
searched locations and search terms. The same admin detail reads actual booking
and admission counts plus last login from the existing operational tables.
With no consent the API records no browsing events;
revoking consent deletes that client's events. Anonymous visitors have no
`users` row and are not presented as named clients. The protected client data
is not published on the landing page. Actual parent-child authority and
academic enrolment still need separate approved requirements and server-side
authorization; classification alone grants no access to a student's records.
Migration 040 indexes event time for cleanup of expired activity.

## 7. Academic Model

Subject is the primary global academic catalog unit.

Do not create a parallel Curriculum + Subjects system without explicit approval.

Global catalogs:
- Stages
- Grades
- Subjects
- Languages

Organizations select global catalog items and configure how they use them.

A stage/grade configuration may include:
- Stage
- Grade
- Subjects
- Teaching Language
- Delivery Mode
- Capacity
- Current Students
- Remaining Seats
- Fees
- Schedule
- Availability

Teaching language can exist at:
- stage level
- subject level

Delivery modes:
- In-person
- Online
- Hybrid

Independent subject/course/tutoring offerings may include:
- Subject
- Target Stage/Level
- Teaching Language
- Teacher
- Delivery Mode
- Schedule
- Capacity
- Fee
- Duration

## 8. Capacity

Core fields/concepts:
- Total Capacity
- Current Students
- Remaining Seats
- Availability Status

Preferred calculation:
`remaining = capacity - current_students`

Initially, Current Students may be updated manually by the organization owner if an authoritative enrollment system is not yet available. Future automatic derivation should reuse actual enrollment/registration records.

## 9. Fees

No standalone Fees Dashboard module.

Fees belong to the context where they apply:
- Stage / Grade
- Subject
- Program / Course
- Service

Subject fees are optional.

Stage and subject fees may coexist, but the system must not automatically add or double-count them without an explicit pricing rule.

Detailed fee visibility:
- Public unauthenticated users: no detailed fees
- Authenticated clients: only allowed fee details
- Owner: own organization detailed fees only
- Owner: must not see competitor detailed fees
- Super Admin: permission-controlled
- Teacher competitor-pricing visibility remains a separate policy decision where not already resolved

## 10. Services

Use a shared Services structure rather than a sidebar/dashboard module for every service type.

Examples:
- Transportation
- Entertainment
- Activities
- Sports
- Trips
- Library
- Meals
- Other services

Entertainment belongs under Services.
Transportation belongs under Services/Capabilities.

## 11. Marketing / Offers

Offers remain separate Marketing entities.

An offer does not overwrite the base fee.

Potential offer fields:
- Start Date
- End Date
- Discount
- Conditions
- Organization
- Stage / Program scope

## 12. Verification / Provider Governance

Provider lifecycle:
`ACCOUNT_CREATED → PROFILE_INCOMPLETE → VERIFICATION_REQUIRED → VERIFICATION_SUBMITTED → UNDER_REVIEW → APPROVED → ACTIVE`

Alternative states may include:
- REJECTED
- MORE_INFORMATION_REQUIRED
- SUSPENDED
- ARCHIVED

Duplicate-provider detection and ownership-claim flow remain required.

## 13. Delete Governance

Protected records should not be casually hard-deleted.

Normal flow:
`ACTIVE → DEACTIVATED / ARCHIVED → DELETION_REQUESTED → ADMIN_APPROVED → PURGED`

Permanent purge is restricted and audited.

Exception — protected system accounts: the seven permanent test accounts
(`db/seed-fixed-users.js`, `users.is_protected`) never enter this flow. The API
refuses `DELETE /api/users/:id` and `PATCH /api/users/:id` with
`status: 'deleted'` with `403 FORBIDDEN`, and re-running the seed restores any
account that was changed behind the API's back. See the appendix entry
العاشر.

## 14. Tenant Isolation and Authorization

Organization-owned data must be scoped by:
`organization_id`

Backend authorization is mandatory.
Frontend hiding is not security.

Required security examples:
- Owner A cannot access Organization B Subjects
- Owner A cannot access Organization B Fees
- Owner A cannot access Organization B Capacity
- Owner A cannot access Organization B Services
- Teacher cannot access another teacher's protected records
- Client cannot access Admin endpoints
- Unauthenticated users cannot access detailed fees

## 15. Dashboard Architecture

Dashboard is a composition/read-model layer, not the source of business truth.

Approved architecture:
**Modular Monolith + API-First + Shared PostgreSQL + Shared Design System + Shared App Shell + Explicit Domain Ownership + Extraction-Ready Modules**

No immediate microservice split.

## 16. Current Implementation Scope

The current implementation priority is:
> **Admin Dashboard first**

Future sequence:
1. Owner
2. Teacher / Freelancer
3. Client

Do not fully build the future dashboards before their requirements are explicitly approved.

The existing approved Admin Dashboard structure must not be redesigned as part of the academic requirements work.

## 17. Design and UX Rules

Keep the shared shell stable:
- green + warm brown/terracotta identity
- Arabic RTL / English LTR
- light/dark modes
- responsive desktop/tablet/mobile
- touch-friendly controls
- premium tables
- contextual KPI cards
- full detail pages for complex entities
- guided forms for large workflows

Do not create a separate mobile product.

Do not rebuild the whole shell for every module.

## 18. Agent Working Rules

Before implementation:
1. Read `AGENTS.md`.
2. Read the relevant project references and this document.
3. Inspect the existing implementation first.
4. Reuse existing implementation.
5. Search before creating tables, routes, APIs, catalogs, or modules.
6. Use LSP/syntax checks and endpoint checks.
7. Report exact files changed.

Do not:
- duplicate existing catalogs/systems
- redesign approved architecture
- perform broad refactors without need
- perform destructive migrations without approval
- reset seed data
- deploy/merge/push unless explicitly requested

If a change requires migration, backfill, production data changes, or an unresolved business decision:
> **BLOCKED — REQUIRES APPROVAL**

## 19. Previously Unresolved Decisions — Now Resolved

Both items below were approved and implemented. See the appendix at the end of
this document for the full decision log.

1. ~~Nullable `grade_id` uniqueness requires a PostgreSQL partial unique index
   or equivalent because ordinary UNIQUE constraints do not prevent duplicates
   when nullable values are NULL.~~
   **RESOLVED** — `db/migrations/023_academic_capacity_and_fee_uniqueness.sql`
   adds one partial unique index per pricing scope
   (`organization_fees_grade_scope_key`, `..._stage_scope_key`,
   `..._org_scope_key`). Verified: duplicates are rejected in all three scopes
   while distinct scopes coexist.

2. ~~Fee source of truth must be explicitly defined between stage fees, subject
   fees, service pricing, and any fee-record/detail structure to avoid ambiguity
   and double counting.~~
   **RESOLVED** — the priced entity is the single source of truth. A fee belongs
   to exactly one scope (stage, grade, or organization), enforced by the partial
   unique indexes above. There is no standalone fee module.

## 20. Final Reminder

These documents define the approved business/architecture direction. They do not by themselves authorize runtime, API, database, migration, seed, or frontend implementation changes.

---
## ملحق القرارات المعمارية وقواعد الصلاحيات المعتمدة (Architectural Refinements)


### أولاً: مصفوفة الصلاحيات (صاحب المؤسسة مقابل المدير العام)
1. **صلاحيات مباشرة لصاحب المؤسسة (Owner Direct Powers):**
   - تفعيل واختيار المراحل والصفوف الخاصة بمؤسسته من الكتالوج العام.
   - إضافة وإدارة الباقات والخدمات (نقل، ترفيه، أنشطة) ورسومها.
   - تحديد وتعديل الرسوم الخاصة بمؤسسته بحرية تامة.
   - إضافة ونشر **عروض المؤسسة (School Offers)** وخصوماتها مباشرة دون الحاجة لموافقة مسبقة.
   - حرية كتابة وإضافة اسم **الحي (Neighborhood)** الذي تقع فيه المؤسسة لتسهيل الوصول والتسجيل.

2. **صلاحيات حصرية وموافقات المدير العام (Admin Approvals & Governance):**
   - **الإعلانات والدعاية الممولة (Platform Ads):** يمكن لصاحب المؤسسة طلب إعلان، لكن نشره مشروط بموافقة المدير العام (Approval) وتحديد السعر وفترة العرض.
   - **المحافظات والمديريات:** تدار مركزياً من المدير العام (مع وجود زر إضافة `+` للمدير العام لإدخال أي محافظة أو مديرية جديدة فوراً). وإذا احتاجت مؤسسة مديرية جديدة غير موجودة ترفع طلباً للمدير العام.
   - **المواد والمراحل العامة:** اعتماد الكتالوج المرجعي للمنصة ومنع تكرار المسميات.

### ثانياً: قواعد البيانات والتشغيل
1. **سياق العام الدراسي (Academic Year Context):** ربط عروض المؤسسة بـ `academic_year_id` / `term_id` لحفظ الأرشيف ومنع تداخل أعداد الطلاب عبر السنوات.
2. **مرونة العملات والرسوم:** دعم تحديد العملة (`currency`: YER, SAR, USD) ودورية السداد (سنوي، فصلي، شهري) مع بقاء الرسوم تابعة للكيان المسعر.
3. **المسار الأكاديمي (Track / Section):** دعم المسار (عام، علمي، أدبي، مهني) على مستوى المرحلة أو الصف.
4. **حساب السعة:** احتساب المقاعد المتبقية يعتمد حصراً على الطلاب المقيدين فعلياً (`Enrolled`):
   `remaining = capacity - current_students`
5. **فريق العمل (Staff Roles):** دعم رتبة `Staff / Manager` داخل المؤسسة لإدخال البيانات دون امتلاك صلاحيات المالك الحساسة (`Owner`).
---

## ملحق سجل القرارات المنفذة (Decision Log)

هذا السجل يوثّق القرارات الثمانية التي كانت متوقفة (`BLOCKED — REQUIRES APPROVAL`)
والحالة الفعلية لكل منها. القاعدة الحاكمة: **المذكرة والكود لا يفترقان أبداً.**

| # | القرار | الحالة | المرجع في الكود |
|---|--------|--------|-----------------|
| 1 | حارس العضوية `requireOrgMember` على مسارات المؤسسات | ✅ منفذ | `server/modules/identity/auth.js`, `server/modules/academic/router.js` |
| 2 | «المادة» هي الأساس الأكاديمي الوحيد؛ «المناهج» تصنيف لا نظام موازٍ | ✅ منفذ | `db/migrations/024_architectural_decision_markers.sql` |
| 3 | الجداول المطبَّعة هي مصدر الحقيقة؛ JSONB كاش مؤقت | ✅ منفذ | `db/migrations/024_architectural_decision_markers.sql` |
| 4 | حذف «الرسوم» من الشريط الجانبي والمسارات | ✅ منفذ | `design-prototype-v4/app.js`, `design-prototype-v4/admin-core.js` |
| 5 | مواءمة الشريط الجانبي مع 15 بنداً | ✅ منفذ | `design-prototype-v4/app.js` |
| 6 | فهرس جزئي لـ `grade_id` + الكيان المسعر كمصدر وحيد للرسوم | ✅ منفذ | `db/migrations/023_academic_capacity_and_fee_uniqueness.sql` |
| 7 | إنشاء `AGENTS.md` وتصحيح `.gitignore` لتعقب `docs/` | ✅ منفذ | `AGENTS.md`, `.gitignore` |
| 8 | هجرة `delivery_mode` / `capacity` / `current_students` | ✅ منفذ | `db/migrations/023_academic_capacity_and_fee_uniqueness.sql` |

### الأول: عزل المؤسسات (Tenant Isolation)

أُضيف `requireOrgMember` ويُطبَّق على المسارات الستة
`/api/academic/org/:orgId/{stages,grades,subjects,curricula,languages,teaching-methods}`.

قاعدة التخويل: يُسمح بالمرور لمن هو **مدير عام** (`admin`)، أو **مالك المؤسسة**،
أو **عضو نشط** في المؤسسة. غير المصرح له يستلم `404` لا `403`، حتى لا يؤكد الرد
وجود المؤسسة أصلاً.

نتيجة التحقق الفعلي:

| الحالة | النتيجة |
|--------|---------|
| مستخدم مسجّل غير عضو | `404` × 6 |
| مدير النظام | `200` × 6 |
| عضو نشط | `200` × 6 |
| عضو موقوف | `404` × 6 |
| زائر غير مسجّل | `401` |
| الفهارس العامة (`/api/academic/:catalog`) | `200` (تبقى مفتوحة) |

> **قاعدة دائمة:** أي مسار جديد تحت `/org/:orgId/` يجب أن يحمل
> `requireOrgMember`. مسار يقرأ بيانات مؤسسة بـ `requireAuth` وحده يُعدّ خللاً.

### الثاني: نموذج المناهج والمواد

`subjects` هو الأساس الأكاديمي الوحيد. `curricula` هو **كتالوج تصنيف**
(وزاري / أهلي / دولي) يتبع المادة والمرحلة، وليس نظاماً موازياً. لذلك:

- لا يُنشأ نظام مواد ثانٍ.
- `organization_subjects` هو مسار ربط المواد بالمؤسسة.
- `organization_curricula` يكمّله ولا يستبدله.

القرار مثبَّت كـ `COMMENT` على الجداول في الهجرة `024` ليجده أي مطوّر لاحق في مكانه.

### الثالث: مصدر الحقيقة للبيانات الأكاديمية

الجداول المطبَّعة (`organization_stages`, `organization_grades`,
`organization_subjects`, `organization_curricula`, `organization_languages`)
هي **مصدر الحقيقة**. حقول JSONB على جدول `organizations`
(`subjects`, `stages`, `grades`, `languages`, `teaching_methods`, `fees`,
`fee_details`, `curriculum`, `stage_availability`) هي **كاش انتقالي** فقط.

المطلوب تدريجياً: نقل الواجهة للقراءة والكتابة من الجداول المطبَّعة، وعدم كتابة
أي منطق جديد يستهدف JSONB. الحقول تحمل `COMMENT` صريحاً بذلك في الهجرة `024`.

### الرابع والخامس: وحدة الرسوم والشريط الجانبي

حُذف بند «الرسوم» ومساره (`fees`) وصفحته (`adminFeesPage`) بالكامل، لأن الرسوم
خاصية تُدار داخل سياق الكيان المسعر (المرحلة، المادة، الدورة، الخدمة). كُذلك حُذف
`payments` (وحدة مستقبلية بلا منطق مالي) و`marketing` بعد فكّه.

الشريط الجانبي المعتمد — 13 بنداً بهذا الترتيب:

| # | المسار | البند |
|---|--------|-------|
| 1 | `admin` | الرئيسية |
| 2 | `schools` | إدارة المؤسسات الدراسية |
| 3 | `teachersAdmin` | المعلمون |
| 4 | `students` | العملاء |
| 5 | `bookings` | الحجوزات |
| 6 | `verify` | التحقق والمراجعة |
| 7 | `academic` | البيانات الأكاديمية |
| 8 | `locations` | المناطق |
| 9 | `offers` | العروض |
| 10 | `ads` | الإعلانات |
| 11 | `reports` | التقارير والتحليلات |
| 12 | `access` | المستخدمون والصلاحيات |
| 13 | `settings` | الإعدادات |

عدد البنود انخفض من 15 إلى 13 لأن البنود الثلاثة (2 و3 و4 سابقاً) كانت **شاشة
واحدة** أصلاً، فدمج روابطها في مدخل واحد أزال تكرار الكتالوج نفسه ثلاث مرات.

البنود 2 و3 و4 اندمجت في تنفيذ واحد (`adminInstitutionsPage()`)، التزاماً بقاعدة
«عدم بناء خمسة أنظمة مكررة». وهي شاشة واحدة بخمس تابات صريحة ظاهرة دائماً:

- مدارس خاصة
- مدارس حكومية
- كليات
- جامعات
- معاهد

مدخل الشريط الجانبي الواحد («إدارة المؤسسات الدراسية») يحدد التاب المفتوح عند
الوصول فقط، ولا يخفي بقية الأنواع. أسماء المسارات القديمة (`schools` /
`institutesAdmin` / `collegesAdmin` / `institutions`) باقية كمرادفات حتى لا ينكسر
رابط قديم.

### السادس والثامن: الفهارس الجزئية والسعة

**الفهارس:** بما أن PostgreSQL يعتبر كل `NULL` قيمة مستقلة، فإن `UNIQUE` عادي لا
يمنع تكرار رسوم على مستوى المؤسسة أو المرحلة. لذلك أُنشئ فهرس فريد جزئي لكل نطاق
تسعير (`023`)، مع استثناء الصفوف المحذوفة منطقياً (`deleted_at IS NULL`).

**السعة:** أُضيفت الأعمدة `delivery_mode` و`capacity` و`current_students` على
`organization_stages` و`organization_grades`، مع عمود مُولَّد
`remaining_seats = capacity - current_students`.

- `remaining_seats` **مُولَّد دائماً** ولا يجوز كتابته مباشرة؛ هذا يمنع أي قيمة
  تخالف المعادلة.
- `capacity = NULL` تعني «غير محددة» وينتج عنها متبقٍ `NULL`.
- تجاوز السعة واقع حقيقي، لذلك المتبقي يُسمح أن يكون **سالباً** ولا يُقيَّد بالصفر.
- `delivery_mode` صفة على العرض: `on_site` | `online` | `hybrid`.

نتيجة التحقق الفعلي (داخل معاملة أُلغيت بالكامل، ولم تبقَ أي بيانات اختبار):

| الفحص | النتيجة |
|-------|---------|
| تكرار على مستوى المؤسسة | مرفوض |
| تكرار على مستوى المرحلة | مرفوض |
| تكرار على مستوى الصف | مرفوض |
| نطاقات تسعير مختلفة | تتواجد معاً (3 صفوف) |
| سعة 120 ومسجّل 45 | `remaining_seats = 75` |
| سعة 120 ومسجّل 150 | `remaining_seats = -30` (مقبول) |
| كتابة مباشرة لـ `remaining_seats` | مرفوضة (عمود مُولَّد) |
| `delivery_mode` غير صالح | مرفوض |

### السابع: ميثاق العمل المستمر

أُنشئ `AGENTS.md` في الجذر ويحمل: الهوية التقنية، المذكرات الثلاث الحاكمة، قواعد
المعمارية التسع، تجميد الشريط الجانبي، قواعد نظام التصميم، قواعد الأمان، وأسلوب
التحقق. وحُذف استبعاد `/AGENTS.md` و`/docs/` من `.gitignore` ليُعتمد تعقّب
المذكرات في Git بشكل دائم ورسمي.

**قاعدة مستمرة:** في نهاية كل مرحلة، تُحدَّث المذكرة الحاكمة وتُودَع مع الكود في
نفس الـ commit، ثم تُرفع. لا يفترق المستودع عن المذكرات أبداً.

### التاسع: فصل الكتالوج العام عن عرض المؤسسة، وإدارة المؤسسات، والتقارير

هذه المرحلة نفّذت الفصل الصريح بين مستويين، وأعادت تنظيم قسم إدارة المؤسسات،
وأضافت شاشة تفاصيل موسّعة مع تقارير قابلة للطباعة والتصدير.

**أولاً: المستويان.**

| | الكتالوج العام للمنصة | عرض المؤسسة |
|---|---|---|
| الشاشة | «البيانات الأكاديمية» `#/academic` | شاشة تفاصيل المؤسسة |
| من يديره | المدير العام وحده | المؤسسة نفسها |
| المحتوى | أسماء المراحل والصفوف (+ المسار: عام / علمي / أدبي) والمواد العامة ولغات التدريس وتصنيفات المناهج (وزاري / أهلي / دولي) | المرحلة المختارة، الرسوم + العملة (YER, SAR, USD) + دورية السداد، لغة التدريس، طريقة التدريس، السعة والمقاعد المتبقية، ومواد المؤسسة برسومها ولغاتها |
| ممنوع فيه | أي مبلغ أو عملة أو سعة — المنصة لا تسعّر المرحلة مركزياً | أي تعريف ثانٍ لمرحلة أو صف أو مادة؛ العرض يشير إلى الكتالوج ولا ينسخه |

`remaining_seats` عمود مُولَّد (`capacity - current_students`) ولا يُكتب من أي
مسار، والسالب مقبول.

**ثانياً: قسم إدارة المؤسسات بخمس تابات صريحة.** التابات الخمس ظاهرة دائماً —
مدارس خاصة، مدارس حكومية، كليات، جامعات، معاهد — ومدخل الشريط الجانبي (المدارس /
المعاهد / الكليات) يحدد التاب المفتوح عند الوصول فقط، ولا يخفي بقية الأنواع.
العرض الأساسي (كروت أو جدول) يُظهر: شعار المؤسسة، الاسم والنوع، اسم المالك/المدير
مع أفتار رمزي، الموقع (المحافظة · المديرية · الحي)، الهاتف والإيميل بخانة
`dir="ltr"` ليبقى `+967` في أوله، وزر واتساب أخضر يفتح `wa.me/967...`.

**ثالثاً: شاشة التفاصيل الموسّعة والتقارير.** الضغط على أي صف أو كرت يفتح شاشة
تفاصيل كاملة: الهوية والشعار والنبذة، المالك والاتصال والواتساب، الموقع الجغرافي
(وإن غابت الإحداثيات يبحث زر الخريطة عن «اسم المؤسسة + الحي + المحافظة» في
Google Maps)، الوثائق والتراخيص، جدول المراحل والرسوم للمؤسسة، جدول المواد
الخاصة بها، ثم المرافق والخدمات بشاراتها. وفي رأس الصفحة: [تعديل]، [طباعة]
يشغل مستنداً مهيأً للورق بترويسة المنصة وشعار المؤسسة، و[تصدير] إلى
Excel (.xlsx) و PDF و Word (.docx). أعمدة الرسوم في ملف Excel تُكتب **أرقاماً**
مع عمود عملة مستقل، لا نصاً منسقاً، حتى يمكن جمعها داخل الجدول.

**رابعاً: إصلاحات الواجهة.** حُذفت «نشط» من قائمة طرق التدريس — طرق التدريس
ثلاث فقط (حضوري / عن بُعد / مدمج) و«نشط» حالة مؤسسة لا طريقة تدريس. الخدمات
تُرسم بالشارة نفسها التي تُرسم بها المرافق أسفل عنوانها. والثيمات الستة في
`theme-presets.json` تبقى كاملة في القائمة: الأخضر التعليمي، الكحلي والذهبي،
الخمري والرملي، التركواز والصحراء، البنفسجي والوردي الترابي، البترولي والبرونزي.

**خامساً: خلل مُصلَح في وحدة التسويق.** كان `repository.js` يحوّل كل قيمة
كائنية إلى `JSON.stringify` قبل تمريرها، وعمود `placement` من النوع `TEXT[]`
في `hero_slides` و`advertisements`، فكان PostgreSQL يرفض
`["ticker"]` بالخطأ `22P02` ويفشل إنشاء أي إعلان أو سلايد من الواجهة (400).
أُضيف `toParam` الذي يمرّر المصفوفات كمصفوفات ويمسك الترميز JSON على كائنات
JSONB وحده. النتيجة: إعلان شريط متحرك أُنشئ فعلاً عبر
`POST /api/admin/advertisements` بنجاح، وظهر في
`GET /api/advertisements?placement=ticker` وفي الشريط العلوي المتحرك.

**سادساً: الشريط الإعلاني المتحرك.** الشريط العلوي شريط متحرك أفقي متصل
(`ticker-ltr` للإنجليزية و`ticker-rtl` للعربية) يعرض نسختين من المحتوى
لضمان حلقة بلا فجوة، يتوقف عند المرور أو التركيز، ويحترم
`prefers-reduced-motion`. بياناته من جدول الإعلانات المنشورة عبر
`/api/advertisements?placement=ticker`، ويبقى ظاهراً برسالة دعوة عند غياب
الإعلانات.

### العاشر: الحسابات التجريبية الدائمة المحمية

تُسكَّن سبعة حسابات تغطي كل رتبة، بكلمة مرور موحّدة واحدة: `Admin@123`.
يُولّدها `db/seed-fixed-users.js` بـ `bcryptjs.hashSync('Admin@123', 10)` —
نفس معامل التكلفة الذي يستخدمه مسار التسجيل، فيتطابق التحقق عند الدخول.

| البريد | الرتبة | الربط بالمؤسسة |
|---|---|---|
| `admin@test.com` | `admin` | — (مدير المنصة) |
| `private@test.com` | `owner` | مدرسة خاصة — مدارس النهضة الأهلية |
| `gov@test.com` | `owner` | مدرسة حكومية — مدرسة الشهيد الحمدي الأساسية |
| `collage@test.com` | `owner` | كلية — كلية العلوم الطبية - صنعاء |
| `inst@test.com` | `owner` | معهد — معهد صنعاء التقني |
| `teacher@test.com` | `teacher` | سجل في `teacher_profiles` (موثّق) |
| `student@test.com` | `client` | — |

**قواعد التثبيت:**

1. التسكين بـ `ON CONFLICT (email) DO UPDATE`، فإعادة تشغيل السكربت لا تفشل ولا
   تُكرّر، بل تُصلح أي انحراف: حساب محذوف أو موقوف أو كلمة مروره مُبدَّلة يعود
   إلى حالة سليمة معروفة.
2. ربط الملكية يذهب إلى أول مؤسسة من النوع المطلوب مرتّبة بالـ slug، فتستقر
   إعادة التشغيل على نفس المؤسسة ولا تتنقل بين الصفوف.
3. الحماية عبر العمود `users.is_protected` (الهجرة 032) وتُفرض داخل
   `modules/identity/service.js` لا في المسار، فتغطي أي مستدعٍ مستقبلي. بابا
   الحذف مغلقان معاً: `DELETE /api/users/:id` و`PATCH /api/users/:id` بالقيمة
   `status: 'deleted'`، وكلاهما يُرجع `403 FORBIDDEN`.
4. السكربت يعمل تلقائياً في نهاية `node db/migrate.js up` — حتى حين لا توجد
   هجرة معلّقة — ويشغّله `scripts/preview-up.sh` أيضاً. هذا ما يضمن بقاء
   الحسابات بعد إعادة بناء الحاوية.

**دليل التنفيذ:** الدخول بالحسابات السبعة أُرجع `200` لكلٍّ منها؛ `DELETE` و
`PATCH status=deleted` على حساب محمي أُرجعا `403`؛ حذف حساب عادي أُرجع `200`
(فالحماية مُوجَّهة لا شاملة)؛ وحساب أُفسد مباشرة في SQL (حُذف منطقياً وصار
`is_protected=false`) عاد سليماً بعد إعادة تشغيل البذرة بلا تكرار في
`organization_memberships`.

هذه حسابات تطوير محلية بكلمة مرور منشورة عن قصد؛ لا تُسكَّن في نشر حقيقي ولا
تُستخدم فيه.


### الحادي عشر: قسم المعلمين `#/teachersAdmin` — إعادة بناء كاملة

نطاق هذه المرحلة هو قسم المعلمين وحده (واجهة وخادماً)، ولم تُمَسّ بقية الأقسام.

**أولاً: المعلم كيان مستقل.** المعلم ليس عضواً في مؤسسة: له حساب دخول حقيقي في
`users` برتبة `teacher`، وسجل في `teacher_profiles`، ومواد بأسعارها، ووثائقه،
وموقعه، وأوقات توفره. الأسعار تُحدَّد **لكل مادة** لا على مستوى المنصة ولا على
مستوى المعلم، والزائر العام لا يرى الأرقام (تسعير مُقيَّد).

**ثانياً: القائمة.** مبدّل عرض (كروت / جدول) وستّ تابات: الكل، موثّق، بانتظار
التحقق، موقوف، طلب حذف، وقائمة طلبات الحذف، مع بحث ومرشّح مادة ومرشّح بلد. كل
الترشيح والترقيم على الخادم (`limit=100`)، فلا تُرسم آلاف الصفوف في الواجهة.
العرض الأساسي يحمل: الأفتار الرمزي أو صورة المعلم، الاسم والعنوان المهني،
الموقع (المحافظة · المديرية · الحي)، الهاتف والإيميل بخانة `dir="ltr"` ليبقى
`+967` في أوله، وزر واتساب أخضر يفتح `wa.me/967...`، وشارات التوثيق والحالة.

**ثالثاً: شاشة التفاصيل.** أربع تابات: الملف والتواصل، المواد والأسعار، الوثائق
والشهادات، الحالة والحذف — وفي الرأس [رجوع]، [تعديل]، [طباعة]، وتصدير
Excel (.xlsx) و PDF و Word (.docx) بترويسة المنصة وصورة المعلم.

**رابعاً: نموذج الإضافة والتعديل.** هوية (اسم عربي/إنجليزي، بريد، كلمة مرور عند
الإضافة فقط وتُشفَّر bcrypt على الخادم، هاتف وواتساب بصيغة E.164، عنوان تفصيلي،
عنوان مهني، سنوات خبرة، جنس، مهارات، رابط صورة، نبذة)، ثم تسلسل الموقع
(البلد ← المحافظة ← المديرية ← الحي) بأربع قوائم مترابطة، ثم طرق التدريس الثلاث
(دروس عن بعد / الانتقال إلى منزل الطالب / استقبال الطلاب في مقر المعلم)، ثم
المراحل من الكتالوج العام، ثم صفوف المواد المسعّرة (مادة، مبلغ، عملة
YER/SAR/USD، دورية شهرية/بالساعة، لغة عربي/إنجليزي)، ثم أوقات التوفر، ثم
المؤهلات. زر `+` بجانب قائمة المواد يقترح مادة جديدة للكتالوج العام
(`POST /api/teachers/subjects`) ويرفض الاسم المكرر بـ `SUBJECT_EXISTS`.

**خامساً: الوثائق.** ملف واحد لكل وثيقة (PDF أو صورة، 10 ميجابايت كحد أقصى)،
تُرفع كـ `application/octet-stream` مع ترميز اسم الملف العربي في ترويسة
`X-File-Name`، ويراجعها المدير العام (اعتماد / رفض / حذف). التنزيل عبر
`GET /api/teachers/documents/:id/file` بترويسة `Content-Disposition` تحمل
الاسم العربي بترميز RFC 5987 وبديلاً ASCII، لأن الترويسة لا تقبل محارف غير
لاتينية.

**سادساً: دورة الحياة.** إيقاف/إعادة تفعيل، وتوثيق/إلغاء توثيق. والحذف **طلب**
لا نقرة: سبب مكتوب لا يقل عن عشرة أحرف، ينتقل بالسجل إلى `deletion_requested`،
ثم يبتّ فيه قسم التحقق والمراجعة. الاعتماد حذف منطقي
(`deleted_at` + `profile_status='inactive'`) فيبقى الأثر للتدقيق. الحسابات
المحمية (`users.is_protected`) تُرفض قبل تسجيل الطلب بـ `403`، وطلب ثانٍ أثناء
وجود طلب مفتوح يُرفض بـ `409`، ومسار الحذف بنقرة واحدة (`DELETE /api/teachers/:id`)
غير موجود (`404`). ولا تدخل هذه القرارات الواجهة العامة: كل مسارات الكتابة
وقائمة الحذف والوثائق الخاصة تمر بـ `requireAuth` + `requireRole('admin')`.

**سابعاً: التقارير.** [طباعة] يفتح مستنداً مهيأً للورق (ترويسة المنصة، الشعار
أو الصورة، جداول الهوية والاتصال والمواد والأسعار والأوقات والمؤهلات والوثائق).
Excel يُصدَّر بخمس أوراق والرسوم **أرقاماً** مع عمود عملة مستقل. و PDF يمرّ من
محرّك المتصفح نفسه (نفس مستند الطباعة) لأن تشكيل العربية يحتاج خطاً مضمّناً لا
يضمنه مُولِّد PDF في الواجهة.

**ثامناً: أخطاء ظهرت أثناء الاختبار وأُصلحت.**

| الخطأ | الأثر | الإصلاح |
|---|---|---|
| القوائم الأربع للموقع بلا معالج `change` | التسلسل لم يعمل أبداً: اختيار المحافظة لم يجلب المديريات | أُضيف وسيط اختياري لـ `wSel` وربط القوائم الأربع بمعالجاتها |
| معالجات الصفوف الديناميكية كانت تزامن صفوفها فقط | إعادة الرسم تمحو ما كُتب في الحقول العادية (الاسم، البريد، كلمة المرور) فيفشل الحفظ | كل معالج يلتقط المسودة كاملة أولاً، وأُضيف `ac-t-password` إلى حقول الالتقاط |
| `prepareProfileFields` لم يمرّر `headline` | العنوان المهني يُهمَل صامتاً في الإضافة والتعديل مع أنه يظهر في الكرت والتفاصيل والتقرير | أُضيف تمرير `headline` |
| رابط الوثيقة كان `/documents/:id/download` | مسار غير موجود فلا تُفتح الوثيقة | صار `/documents/:id/file` |
| قائمة الحذف تعرض أزرار اعتماد/رفض على طلبات مُبتّة | قرار مكرر على صف منتهٍ | الصف المُبتّ يعرض حالته ومن قرّره وكلمة «مُبتّ» بلا أزرار |
| القراءات العامة كانت ترسل أجر المعلم و`amount` كل مادة إلى زائر مجهول | خرق قاعدة «تسعير مُقيَّد» على مستوى الخادم لا الواجهة | `optionalAuth` + بوابة `canSeePricing` في `mapTeacher`: المبلغ والعملة والدورية تُحذف ويُعاد `pricingGated: true` |
| صفحة دليل المعلمين العامة `#/teachers` كانت فارغة دائماً | `/api/teachers` يرد بمغلّف `{items, total}` والواجهة تتعامل معه كمصفوفة | الواجهة تقرأ `items` وتحفظ `pricingGated` |
| مكوّنات في شاشات المعلمين كانت بارتفاع 37–43px | خرق قاعدة 44×44 في مذكرة التصميم | رُفع `min-height` لحقول النموذج والفلترة وأزرار الهيرو وواتساب إلى 44px، مع `min-width` لزرّي التصدير — داخل `admin-core.css` دون المساس بالهيكل المشترك |

**تاسعاً: دليل التنفيذ.** كل ما يلي نُفّذ على الخادم الحقيقي بجلسة حقيقية:

| الفحص | النتيجة |
|---|---|
| تسلسل الموقع: أمانة العاصمة (12 مديرية) ← السبعين (3 أحياء: حدة، بيت بوس، عطان) ← حدة | القيم الأربع اختيرت من الواجهة وحُفظت في الصف |
| إنشاء معلم من الواجهة (اسم، بريد، كلمة مرور، عنوان مهني، موقع، مادة مسعّرة) | `201` وأُغلق النموذج، والصف في PostgreSQL يحمل `headline` والموقع و`8500 YER` للمادة |
| صف مادة بلا مبلغ | `400 VALIDATION_ERROR` برسالة «Every subject needs a price (amount)» بدل `500` من قيد `NOT NULL` |
| دخول المعلم المنشأ ببريده وكلمته | `200` والجلسة تحمل `role: "teacher"` |
| تعديل العنوان المهني من الواجهة | تغيّر فعلياً في `teacher_profiles.headline` (فُحص بـ psql) وبقيت المادة بسعرها |
| تصدير | `.xlsx` و`.docx` بترويسة OOXML صحيحة، وزر PDF يفتح مستند الطباعة نفسه (محرّك المتصفح) |
| مستند الطباعة | `dir="rtl"` وترويسة المنصة حاضرة و5 جداول و21 صفاً |
| حذف بنقرة واحدة | `404` |
| طلب حذف بسبب قصير | `400` |
| طلب حذف صحيح | `201` والحالة `deletion_requested` |
| طلب ثانٍ أثناء طلب مفتوح | `409` |
| رفض الطلب | الحالة تعود `active` والسجل باقٍ |
| اعتماد الطلب | حذف منطقي (`profile_status='inactive'` + `deleted_at`) و`users.status='deleted'` ودخول المعلم `401` |
| طلب حذف حساب محمي | `403` |
| عرض 360px | لا تمرير أفقي على القائمة ولا التفاصيل ولا أي تاب، وكل هدف لمس في شاشات المعلمين ≥44px |
| الإنجليزية | `dir="ltr"` والعناوين والتابات مترجمة (Teachers / All / Verified / …) |
| زائر مجهول على `/api/teachers` و`/:id` | لا مبلغ ولا عملة ولا `hourlyRate`، و`pricingGated: true`، ودليل المعلمين العام يعرض بطاقتين بعد أن كان فارغاً |
| جلسة مدير على المسارين نفسيهما | `pricingGated: false` والمبالغ ظاهرة كما هي |
| الثيمات الستة | موجودة كلها في `theme-presets.json` وتُطبَّق في الواجهة |

**بند مفتوح (خارج نطاق هذه المرحلة):** زر القائمة `☰` في الهيكل المشترك مقاسه
40×40px، وهو أقل من قاعدة 44×44؛ إصلاحه يخص `styles.css` المشترك لا قسم
المعلمين، فتُرك لتغيير مستقل. وكذلك جسم JSON مشوّه في أي مسار كتابة يُرجع
`500` بدل `400` لأن معالج أخطاء التحميل العام في `pg-app.js` لا يميّز خطأ
`express.json`. الإصلاح يخص طبقة مشتركة لكل الوحدات، فتُرك لتغيير مستقل.

### بنود لم تُنفَّذ بعد (تحتاج قراراً أو مرحلة مستقلة)

هذه البنود وردت في القرارات المعتمدة أعلاه ولم تُطلب في نطاق هذه المرحلة، وهي
مسجّلة هنا حتى لا تُنسى:

1. `academic_year_id` / `term_id` على عروض المؤسسة (سياق العام الدراسي).
2. عمود `currency` (YER, SAR, USD) ودورية السداد — ✅ منفذ على مستوى عرض
   المؤسسة: `organization_fees.currency` و`frequency` معروضان في جدول المراحل
   والرسوم ويُصدَّران كعمود عملة مستقل.
3. المسار الأكاديمي (عام، علمي، أدبي، مهني) على المرحلة أو الصف.
4. رتبة `Staff / Manager` داخل المؤسسة (`organization_memberships.membership_role`
   موجود، ويحتاج حوكمة صلاحيات).
5. تعبئة الفهارس الأكاديمية العالمية (`subjects`, `academic_stages`,
   `academic_grades`, `curricula`, `languages`, `teaching_methods`) — كلها فارغة حالياً.
6. نقل الواجهة تدريجياً من حقول JSONB إلى الجداول المطبَّعة — بدأ فعلياً:
   شاشة تفاصيل المؤسسة تقرأ المراحل والمواد من عرض المؤسسة المطبَّع، ولم يبقَ
   في JSONB سوى حقول الكاش الانتقالية.

## حالة التنفيذ الحالية (بناء qoder-test — بيئة تطوير)

تم التحقق منها مقابل قاعدة التطوير المحلية في 2026-09-26:

- قاعدة البيانات: `madarasati_dev` على PostgreSQL، طُبِّقت كل الترحيلات
  (001–038) من الصفر على قاعدة نظيفة، ثم شُغِّل بذر الحسابات المحمية — بلا
  أي انحراف عن مخطط الكود الحالي.
- الوحدات التي تعمل قراءةً وكتابةً عبر الـAPI: identity/auth (تسجيل دخول
  حقيقي)، organizations، locations، academic، teachers، admissions، bookings،
  communication، marketplace، ownership، documents، admin، marketing.
- الحسابات المحمية السبعة (`admin@test.com`, `private@test.com`,
  `gov@test.com`, `collage@test.com`, `inst@test.com`, `teacher@test.com`,
  `student@test.com`) موجودة مع `users.is_protected = true`، وروابط المالك
  بالمؤسسات في `organization_memberships` قائمة.
- 40 مؤسسة نموذجية (عشرة لكل قسم: خاصة / حكومية / معاهد / كليات وجامعات)،
  مع بيان المرافق والخدمات وعروض المراحل.
- البند 5 أعلاه («تعبئة الفهارس الأكاديمية العالمية») صار منفَّذاً، والبند 3
  (المسار الأكاديمي) منفَّذ كعمود `academic_grades.track`.
- `remaining_seats` عمود مشتق `capacity − current_students` لا يكتبه أي مسار
  تطبيقي؛ على PostgreSQL 12+ عمود مُولَّد (ترحيل 023)، وعلى خادم التطوير
  الحالي PostgreSQL 10 يُفرض بنفس العقد عبر Trigger.
- ملاحظتان توافقيتان لخادم التطوير (PostgreSQL 10) على ملفَي ترحيل لم يكونا
  مطبَّقين: `005` استخدم `EXECUTE PROCEDURE` بدل `EXECUTE FUNCTION`، و`023`
  استبدل العمود المُولَّد بـTrigger. الترحيلات المطبَّقة سابقاً لا تُعدَّل؛
  وترقية الخادم إلى PostgreSQL 12+ تعيد `remaining_seats` عموداً مُولَّداً.

## Users & Access implementation checkpoint — 28 September 2026

The owner dashboard now links to `#/owner/staff`, where each institution has
its own staff directory and dedicated add/edit form. A staff assignment links an
already registered account by exact email; it never changes that account's
platform role. Institution roles such as receptionist, accountant, manager and
controller are editable membership labels, with optional department and job
title. They do not yet grant operational permissions in bookings, admissions or
other domain modules. Those modules retain their existing server guards until
each operation has an approved permission mapping.
Creating a staff assignment currently requires an existing active account;
a secure invitation and account-claim flow is still required for a person who
has not registered. The directory is paginated and searchable on the server.

Migration `046_staff_membership_archive.sql` adds staff metadata and archive
fields to `organization_memberships`. Removing staff sets `archived_at` and
`status='inactive'` while preserving the user, audit trail and assignment for
later analysis. An archived assignment can be restored for an active account.
The owner may manage only their own organization; a foreign organization returns
`404`. The owner cannot assign an owner/admin membership, edit an owner or
protected membership, or change the staff member's global account status. The
normalized active owner membership is an ownership source alongside
`organizations.owner_user_id`, which is unpopulated on imported organizations.

The account directory shows platform role, client classification, teacher
association, institution affiliation and account state. Client classifications
are account labels, not verified student enrollment or guardian authority;
anonymous visitors have no account row. The overview cards link to their live
sections and display PostgreSQL counts. A deleted account retains its historical
membership, which is archived in the same soft deletion operation.

The single `#/access` sidebar entry now has route-backed tabs for overview,
users, roles, permissions, organization memberships, registration requests,
security, and audit. `#/access/users/:id/:tab` keeps user details in the same
module. Counts, users, memberships, grants, active sessions, and audit entries
come from PostgreSQL or the running API session store; the old decorative
permission matrix is no longer the active renderer.

Migration `043_identity_access_extensions.sql` adds `user_permission_overrides`
for direct grants and denies, optionally scoped to an organization. The existing
`roles`, `permissions`, `role_permissions`, `users.role_id`, and
`organization_memberships` remain authoritative. Migration `044` adds the
missing unique index on `(user_id, organization_id)` after checking for legacy
duplicates. `requirePermission` resolves
role grants and direct overrides on the server; a direct deny wins. Current use
is limited to identity/Users & Access APIs. Other domain routers still use their
existing `requireRole` and `requireOrgMember` guards; the new matrix must not be
described as controlling every route yet. Admin mutation of a protected user's
role/status and self role/status mutation are rejected. Admin-created membership
changes and permission overrides are audited.

Sessions remain in memory. User details can show and revoke sessions in the
current API process, without claiming durable history or device identification.
The `up-no-seed` migration command applies forward migrations without the
normal fixed-account reseed; ordinary `up` retains its documented reseed.
Registration requests read the existing `pending_registrations` table. That
table has no review status or decision fields, so approval/rejection workflows
are not implied by the tab. Academic student and guardian identities are still
separate open work; a client classification is not an enrolment or guardian
relationship.

### IAM gap and security audit

| Capability | Current state | Remaining work |
|---|---|---|
| Login identity, account status, protected fixtures | Existing; protected role/status mutations now refused | Fixed fixtures are still local-development only |
| Roles and permissions | Four system roles, a PostgreSQL permission catalog, role grants, and an identity-route permission guard | Custom role assignment and enforcement across every domain router remain open |
| Organization memberships | Existing multi-organization table; list/add/edit/remove APIs and unique user/institution index now available | Owner/staff capability checks still need per-operation review across all tenant modules |
| Direct grants and denies | New `user_permission_overrides`, effective-permission read, audit, and deny-first resolution | Non-identity routers still enforce their earlier role guards |
| User administration | Existing account list/edit/soft delete and new detail tabs | Restore, durable password-reset workflow, and richer account lifecycle are not exposed |
| Registration requests | Existing `pending_registrations` read restored | No review status, documents, approval decision, or identity-link workflow exists yet |
| Students and guardians | Admissions applications and client classifications exist | No normalized student enrolment or guardian relationship domain exists; the client CRM is not a student record |
| Teachers | Existing `teacher_profiles` link to `users` | Role/membership permissions are not yet a unified teacher authorization model |
| Sessions | Live in-memory sessions can be listed and revoked per user | No durable device/session history; changing the session architecture needs its own design review |
| Audit | Existing `audit_logs`; new membership and direct-permission mutations are recorded | Complete coverage and filters across every admin operation remain open |

The existing `app_sections` registry from migration `042` has not been made a
global route authorization source. Its public-page CRUD rows are catalog rows,
not evidence of real public-page create/delete capabilities. The previous
`/api/profiles/:userId` read allowed any authenticated user to request another
profile; it now allows only the subject or a platform admin with `access.view`.
Cross-tenant membership reads and writes return `404` before exposing a foreign
organization. These findings are implementation limits, not sample data to
display as functional controls.

## 15. Marketing: Advertisements vs Offers

Two separate systems with different permissions, both served by
`server/modules/marketing` and backed by PostgreSQL.

**Offers (العروض)** are institution-owned promotions and are self-served: an
institution owner creates, edits, activates/deactivates and deletes offers for
their **own** institutions only. Cross-tenant access returns `404`, so owner A
can never touch owner B's offers. Admin views/manages all. Offers appear on the
institution card (`offersCount`) and in the public offer popup
(`GET /api/offers?organizationId=…`), filtered to `active` within the schedule
window.

**Advertisements (الإعلانات)** are public advertising space controlled by the
MADARASATI administration. An owner (or user) SUBMITS an advertisement, which
always enters `pending`; only a Program Administrator approves it. The stored
statuses are `pending / approved / paused / rejected / cancelled / archived`,
and `scheduled / active / expired` are **derived** from `approved` + the
start/end window (never stored). Public eligibility is exactly:

    status = 'approved' AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())

A pending, rejected, paused, cancelled, archived or out-of-window ad is never
public. Approval is enforced in the backend: the owner submission route forces
`pending` and strips `status`/review fields, so a `status:"approved"` sent by an
owner is ignored. A material owner edit (image, message, target, placement,
schedule) returns an approved ad to `pending`.

Advertiser (المعلن) is a real reference, not free text: it is an institution
owner (via `organization_id`) or a private teacher (via `teacher_id`), chosen
from `GET /api/advertisements/advertisers`.

Key routes:

    # public
    GET  /api/advertisements?placement=ticker      (approved + in window)
    POST /api/advertisements/:id/click             (genuine CTA click)
    POST /api/advertisements/:id/impression        (ad shown; distinct from click)
    GET  /api/offers?organizationId=…              (active + in window)
    GET  /api/hero-slides?placement=public_hero    (landing hero; local fallback)

    # owner (requireAuth; tenant-scoped)
    GET/POST /api/offers/mine, /api/offers, PUT/DELETE /api/offers/:id
    GET  /api/advertisements/mine
    POST /api/advertisements                        (submits -> pending)
    PUT  /api/advertisements/:id                    (content edit -> pending on material change)
    POST /api/advertisements/:id/cancel, /resubmit
    POST /api/uploads/banner                        (owner banner upload)

    # admin (requireAuth + requireRole('admin'))
    GET/POST/PUT/DELETE /api/admin/advertisements
    POST /api/admin/advertisements/:id/review       (approve | reject | request_changes)
    POST /api/admin/advertisements/:id/status       (pause | resume | cancel | archive)
    GET/POST/PUT/DELETE /api/admin/offers
    GET/POST/PUT/DELETE /api/admin/hero-slides
    POST /api/admin/uploads/banner

Image upload (banner) is magic-byte sniffed (JPG/PNG/WEBP), capped at 8 MB,
stored under `uploads/marketing` with a random name, served at
`/uploads/marketing/...`; executable content is refused. Clicks and impressions
are real counters (never incremented by page load or admin preview); CTR is
derived, never fabricated.

Android currently consumes none of these endpoints, so there is no Android
contract to break. The only implemented advertisement placement is `ticker`;
`banner`/`sidebar` were removed because no frontend rendered them.

## Reports & Analytics Center

`#/reports` is one sidebar entry (the frozen 13th admin item) that opens a full
reporting environment rather than a statistics panel. It is served by a
dedicated `server/modules/reports` module mounted at `/api/reports`, mounted
after `admin` and before `marketing`, and every route carries
`requireAuth` + `requireRole('admin')`. Reports aggregate across tenants, so
authorization is enforced on the server — not by hiding a tab. Anonymous callers
get `401`, non-admin callers get `403`.

The module is a three-layer pipeline:

    router → service (aggregation + normalization) → repository (SQL)

Every report is delivered to the UI and to every exporter as ONE normalized
model, so the screen and the exported file can never disagree:

    { id, category, title{ar,en}, subtitle{ar,en}, period, generatedAt,
      scope, kpis[], charts[], tables[], notes[] }

`GET /api/reports/report?type=…&from&to&preset&…filters` is the single data
endpoint. `type` selects the report; the remaining query parameters are its
filters (`orgType`, `verified`, `governorateId`, `status`, `role`, `adType`,
`actorUserId`, `action`, `entityType`, `id`, `limit`, `offset`). Report types:
`overview`, `institutions`, `institution`, `teachers`, `teacher`, `users`,
`admissions`, `offers`, `advertisements`, `ad-performance`, `academic`,
`locations`, `activity`. `GET /api/reports/catalog` lists them with category and
icon; `GET /api/reports/filter-options` returns the governorate/country/type/
status dictionaries the screens filter with; `GET /api/reports/headline`
returns the small live summary the landing banner shows.

Two kinds of number are kept apart and never blended: current-state counts
(what is true now) and period/event counts (rows whose `created_at`/`submitted_at`
falls in the selected period). A metric that has no stored history is simply not
produced — for example advertisement impressions and clicks are cumulative
counters with no daily table, so the ad-performance report states that no
historical trend exists instead of drawing a fabricated one.

Exports are built from the same model client-side (no build step, no charting
library): a styled `.xlsx` workbook (real cell values, styled headers, freeze
panes, auto-filter, number/date formats, one sheet per table and a chart-data
sheet), a branded `.docx` document (cover, KPI grid, chart images rasterised
from the same SVG, tables, RTL for Arabic), CSV, and a print-ready HTML document
whose "Save as PDF" produces a correctly shaped Arabic PDF. PDF uses the
browser writer because embedded Arabic shaping needs a font the no-build SPA
does not ship.

Saved reports store the *configuration* only (`type`, period, filters), never a
copy of business data; re-opening re-queries PostgreSQL. They live in
`saved_reports` (migration `047`), owner-scoped to the admin user.

The Import Center validates an institutions CSV and refuses malformed data: a
`dryRun` returns the full error report with nothing written, and a real run is
all-or-nothing and audited (`action = 'import'`). Names are resolved to real
governorate/district rows, slugs are de-duplicated, and only
`data_source = 'import'` rows are created with `verification_status = 'pending'`
so an import can never self-verify.

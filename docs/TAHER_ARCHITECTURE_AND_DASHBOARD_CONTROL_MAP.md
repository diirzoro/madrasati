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

الشريط الجانبي المعتمد — 15 بنداً بهذا الترتيب:

| # | المسار | البند |
|---|--------|-------|
| 1 | `admin` | الرئيسية |
| 2 | `schools` | إدارة المدارس |
| 3 | `institutesAdmin` | إدارة المعاهد |
| 4 | `collegesAdmin` | إدارة الكليات |
| 5 | `teachersAdmin` | المعلمون |
| 6 | `students` | الطلاب |
| 7 | `bookings` | الحجوزات |
| 8 | `verify` | التحقق والمراجعة |
| 9 | `academic` | البيانات الأكاديمية |
| 10 | `locations` | المناطق |
| 11 | `offers` | العروض |
| 12 | `ads` | الإعلانات |
| 13 | `reports` | التقارير والتحليلات |
| 14 | `access` | المستخدمون والصلاحيات |
| 15 | `settings` | الإعدادات |

البنود 2 و3 و4 تشترك في تنفيذ واحد (`adminInstitutionsPage(group)`) بحسب قاعدة
«عدم بناء خمسة أنظمة مكررة»، وكل بند يعرض شريحته من الكتالوج:

- `schools` → مدارس خاصة + مدارس حكومية
- `institutes` → معاهد
- `colleges` → كليات + جامعات

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

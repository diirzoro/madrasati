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

## 19. Current Explicitly Unresolved Decisions

Before schema implementation:
1. Nullable `grade_id` uniqueness requires a PostgreSQL partial unique index or equivalent because ordinary UNIQUE constraints do not prevent duplicates when nullable values are NULL.
2. Fee source of truth must be explicitly defined between stage fees, subject fees, service pricing, and any fee-record/detail structure to avoid ambiguity and double counting.

## 20. Final Reminder

These documents define the approved business/architecture direction. They do not by themselves authorize runtime, API, database, migration, seed, or frontend implementation changes.

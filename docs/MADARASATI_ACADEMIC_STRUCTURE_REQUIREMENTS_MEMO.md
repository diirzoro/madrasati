# MADARASATI / TAHER — Academic Structure, Subjects, Languages, Capacity, Fees & Services

## Architecture & Dashboard Requirements Memo

**Date:** 19 September 2026  
**Status:** OWNER REQUIREMENT — DOCUMENTATION / ARCHITECTURE LOCK  
**Implementation:** NOT AUTHORIZED YET

---

## 1. Purpose

This memo documents the currently approved requirements for the academic structure and management of stages, subjects, languages, capacity, fees, and services inside MADARASATI.

**This memo does not authorize implementation yet.**

Before any Runtime / DB / API changes:

1. Read `AGENTS.md`.
2. Read the current official project references.
3. Inspect the existing implementation.
4. Reuse existing implementation; do not create duplicate systems, tables, routes, or catalogs.
5. Wait for explicit approval before changes that require migrations or schema changes.

---

## 2. Architectural Principle

The following concepts must remain separate:

- **Dashboard Experience**
- **Organization / Tenant**
- **Organization Type**
- **Role**
- **Module**
- **Permission**
- **Global Catalog**
- **Tenant-specific Configuration / Data**

Do not create a separate dashboard or separate codebase for each organization type.

The five educational organization types share a **Shared Organization Core**, with type-specific academic modules.

### Organization Types

- Private School
- Government School
- College
- University
- Institute

### Dashboard / Role Experiences

- Admin / Super Admin
- Owner
- Teacher / Freelancer
- Client

These are dashboard experiences and roles, not separate applications.

---

## 3. Current Development Scope

The current development scope is:

> **Admin Dashboard only**

Do not build the Owner, Teacher, or Client dashboards fully at this stage.

Future sequence:

1. Owner
2. Teacher / Freelancer
3. Client

Existing placeholders should remain minimal until their requirements are formally defined.

---

# 4. Academic Model — Core Decision

## Subject is the Primary Academic Catalog Unit

Do not create two parallel systems:

> Curriculum + Subjects

Instead:

> **Subjects / المواد الدراسية = the primary academic unit in the Global Catalog.**

A subject can be used inside:

- Stage
- Grade
- Program
- Course
- Independent tutoring / reinforcement program

A separate Curriculum system should not be introduced unless the Owner explicitly approves it later.

---

# 5. Global Academic Catalogs

Super Admin controls the shared reference catalogs.

## Academic Catalog

### Stages

Examples:

- Kindergarten
- Primary
- Preparatory / Intermediate
- Secondary

### Grades

Examples:

- Grade 1
- Grade 2
- ...
- First Secondary
- Second Secondary
- Third Secondary

### Subjects

Examples:

- Mathematics
- Arabic Language
- English Language
- History
- Physics
- Chemistry
- Programming
- Information Technology
- Electrical / Electricity
- Other approved subjects

### Languages

A simple Global Language Catalog should exist, for example:

- Arabic
- English
- French

Additional languages can be added later.

---

# 6. Stage / Grade Configuration

The organization does not create global stage or subject names from scratch.

Instead, the organization selects items from the Global Catalog and creates its own tenant-specific configuration.

Example:

### First Secondary

The organization selects:

- Mathematics
- Arabic
- English
- Physics
- Chemistry

Then it configures how those subjects are taught in that organization.

---

# 7. What Can Be Configured for a Stage / Grade

A stage / grade configuration can include:

- Stage
- Grade
- Subjects
- Teaching Language
- Delivery Mode
- Capacity
- Current Students
- Remaining Seats
- Fees
- Schedule / Times where applicable
- Availability

---

# 8. Teaching Language

Teaching language must be supported at more than one level.

## Stage-level Teaching Language

Example:

> First Secondary → Arabic

## Subject-level Teaching Language

A subject can have a different teaching language inside the same stage.

Example:

> First Secondary → Arabic  
> Programming → English

Therefore, the stage language must not prevent individual subjects from having their own language.

This is especially important for colleges, universities, and institutes.

---

# 9. Delivery / Attendance Mode

The system should support:

- In-person
- Online
- Hybrid

This should not become a separate Dashboard module.

It is a property of the relevant stage, program, course, or subject configuration as needed.

---

# 10. Capacity / Student Seats

Capacity is a core requirement.

Each stage / grade or educational offering may have:

- Total Capacity
- Current Students
- Remaining Seats
- Availability Status

Example:

> Capacity = 30  
> Current Students = 25  
> Remaining Seats = 5

Preferred calculation:

> `remaining = capacity - current_students`

The user should not normally enter Remaining Seats manually if the system can calculate it.

---

# 11. Source of Current Student Count

Initially, if the electronic enrollment system is not yet the authoritative source, the organization owner may update:

> Current Students

manually.

However, the architecture must allow this to become automatically derived from actual enrollment / registration records in the future.

Do not create a duplicate student-count system unnecessarily.

---

# 12. Fees — Important Decision

## No Separate Fees Module

Do not create:

> Dashboard → Fees → Create Fees

Fees are a property of the context they belong to.

Fees may exist at:

### Stage / Grade

Example:

> Primary → 30,000 per year  
> Preparatory → 35,000 per year  
> Secondary → 40,000 per year

### Subject

Subject fees are **optional**.

Example:

> Mathematics → 5,000  
> English → 4,000  
> Physics → 6,000

### Program / Course

A program or course may have its own optional fee.

### Service

A paid service may have its own fee.

---

# 13. Optional Subject Fees

Subject fees are not mandatory.

The organization may use:

### Model A — Stage Fee Only

Example:

> Secondary = 40,000 per year

No individual subject fees are required.

### Model B — Subject Fees

Example:

> Mathematics = 5,000  
> English = 4,000  
> Physics = 6,000

### Model C — Both

The organization may use stage fees and individual subject fees where appropriate.

The system must not automatically add or double-count fees unless the pricing rule is explicitly configured.

Before implementation of final fee calculations, the exact UX/business rule for:

- Included in Stage Fee
- Separate Subject Fee
- Combined / custom pricing

must be explicitly defined.

---

# 14. Fee Aggregation

The architecture should support:

> Stage → Subjects → Subject Fees

so the system can know the fees associated with subjects in a stage.

However:

**Do not assume that the sum of subject fees automatically becomes the final stage fee.**

The owner may define:

> Stage Fee = 30,000

independently of individual subject fees.

Or may define subject fees.

Or may use both.

Therefore, the data model must support these alternatives without duplication or unintended fee aggregation.

---

# 15. Offers

Offers are separate from the base fee.

Example:

> Original Fee = 40,000  
> Special Offer = 35,000

The offer should remain a separate **Marketing / Offer** entity.

The offer should not overwrite the original fee.

Potential offer properties include:

- Start Date
- End Date
- Discount
- Conditions
- Organization
- Stage / Program scope

according to the existing marketing architecture.

---

# 16. Independent Subjects / Programs

A subject is not limited to being part of a stage.

A subject can also be offered independently.

Examples:

- Mathematics tutoring
- English course
- Programming course
- Reinforcement class

An independent subject/program may contain:

- Subject
- Target Stage / Level
- Teaching Language
- Teacher
- Delivery Mode
- Schedule
- Capacity
- Fee
- Duration

This supports both:

> Stage-based Education

and:

> Independent Subject / Course / Tutoring

---

# 17. Services

Do not create a separate Dashboard module for every service type.

Use a shared **Services** structure.

Examples:

- Transportation
- Entertainment
- Activities
- Sports
- Trips
- Library
- Meals
- Other services

Global Service Types can be centrally controlled, while organizations select and configure them.

---

# 18. Entertainment Is a Service

Entertainment should be represented as a service rather than as a separate major module.

Example:

### Service

> Entertainment Trip

Possible properties:

- Type: Entertainment
- Activity: Garden
- Location: Inside / Outside
- Paid / Free
- Fee
- Days
- Start Time
- End Time
- Capacity
- Details

Examples:

- Garden
- Amusement park
- Beach
- Trip
- Sports activity
- Other approved activities

---

# 19. Transportation

Transportation is also a Service / Capability.

It may include:

- Available / Not Available
- Routes / Areas
- Fee
- Schedule
- Capacity
- Other configuration

Do not invent database fields that are not supported by the current schema. Inspect the existing implementation first.

---

# 20. Information Hierarchy

The general model is:

### Global Catalog

Defines:

> What is this thing?

Example:

> Mathematics

### Organization Configuration

Defines:

> How does this organization use it?

Example:

> Mathematics  
> Stage: First Secondary  
> Language: Arabic  
> Fee: 5,000  
> Delivery: In-person

Therefore:

> **Global Subject ≠ Organization Subject Configuration**

The same subject can be configured differently by different organizations.

---

# 21. Location

Location remains Global Reference Data.

Canonical hierarchy:

> Country  
> → Governorate / Region  
> → District / Directorate  
> → Neighborhood / Area  
> → Address  
> → Coordinates

Organizations select their location from the global location catalog.

Do not duplicate governorates, districts, or neighborhoods for every organization.

---

# 22. Public Frontend vs Backend / Data Model

The immediate priority is the **Backend and Dashboard/Data Model**, not the exact public card presentation.

The current work should focus on:

- Database model
- API contracts
- Dashboard modules
- Global catalogs
- Tenant configuration
- Permissions
- Validation
- Relationships
- Organization isolation

The exact public presentation can be controlled later through the frontend/API presentation layer.

---

# 23. Public Card — Current Direction Only

The current direction for the public card is intentionally concise.

Location should show the full hierarchy:

> Governorate → District → Neighborhood

and not only a neighborhood name.

Public stage information should be summarized at a high level, such as:

> Primary / Preparatory / Secondary

rather than listing every grade in the main card.

Detailed fees should not appear on the public card.

Full details are available inside the details view according to the authentication/access policy.

These are presentation-layer rules and do not justify creating additional backend modules.

---

# 24. Contact / Registration

Inside the authenticated details experience, the platform may support:

- Phone
- WhatsApp
- Inquiry
- Registration Request
- Application

Requests should appear in the organization owner's Dashboard.

A full request workflow should not be invented until its requirements are explicitly approved.

---

# 25. Owner Dashboard — Future Structure

When Owner Dashboard development begins, do not create five independent dashboards.

Use:

> **Shared Owner Core + Type-specific Modules**

## Shared Owner Core

Common to all organization types:

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

Then add type-specific academic functionality.

### Private School

Potential modules:

- Stages
- Grades
- Subjects
- Capacity
- Fees
- Schedule
- Transportation
- Admissions
- Other approved school modules

### Government School

Shared Core plus government-school academic structure and relevant configuration.

### College

Potential modules:

- Departments
- Programs
- Courses
- Subjects
- Fees
- Academic Calendar
- Schedule

### University

Potential modules:

- Faculties / Colleges
- Departments
- Programs
- Courses
- Subjects
- Fees
- Academic Calendar
- Schedule

### Institute

Potential modules:

- Training Programs
- Courses
- Subjects
- Fees
- Schedule

---

# 26. Teacher / Freelancer

Teacher is a **Freelancer / Provider**, not an educational organization.

The future Teacher Dashboard should support concepts such as:

- Subjects
- Stages / Grades
- Languages
- Teaching Modes
- Pricing
- Schedule
- Availability

Teaching language is important at teacher level.

Examples:

> Teacher → French

> Teacher → English

> Teacher → Arabic

The teacher's supported teaching languages should use the Global Language Catalog rather than arbitrary duplicate text values where appropriate.

---

# 27. Client

The Client Dashboard should initially remain lightweight.

Potential areas:

- Recently Viewed
- Favorites
- Visited Institutions
- Applications
- Bookings
- Messages
- Profile

Detailed Student / Parent requirements are not finalized yet and should not be invented.

---

# 28. Permissions & Tenant Isolation

Any organization-owned data must be scoped by:

> `organization_id`

Backend authorization is mandatory.

Frontend hiding is not sufficient.

For example:

Owner A must not be able to access through the API:

- Organization B Subjects
- Organization B Fees
- Organization B Capacity
- Organization B Services

even if the frontend attempts to hide those sections.

---

# 29. Admin / Super Admin

Super Admin controls Global Catalogs and platform governance, including:

- Stages
- Grades
- Subjects
- Languages
- Locations
- Service Types
- Other controlled reference lists

Super Admin should not casually overwrite organization-owned operational data.

The existing approved Admin Dashboard must not be redesigned as part of this work.

---

# 30. Critical Anti-Duplication Rule

Before creating any:

- Table
- API
- Route
- Dashboard section
- Catalog
- Service
- Subject system
- Fee system
- Language system

the programmer/agent must search the project first.

Do not create a second implementation of something that already exists.

Especially inspect existing implementations for:

- Subjects
- Academic Stages
- Grades
- Languages
- Services
- Fees
- Organizations
- Locations

---

# 31. Implementation Order

When implementation is explicitly approved, use this order:

### Phase A — Audit

Review the existing schema and implementation.

### Phase B — Existing Capability Map

Determine what already exists for:

- Stages
- Grades
- Subjects
- Languages
- Organization academic configuration
- Services
- Capacity
- Fees

### Phase C — Gap Analysis

Identify only what is actually missing.

### Phase D — Database

Identify only the migrations/schema changes that are truly required.

### Phase E — API

Define or update API contracts.

### Phase F — Admin Dashboard

Build the global catalog and administration controls.

### Phase G — Owner Configuration

Build organization-specific academic configuration later.

### Phase H — Public / Client Presentation

Apply the public presentation rules after the backend and dashboard model are stable.

---

# 32. Explicit Instruction to Programmer / Agent

**Do not start coding directly from this memo.**

The first task is:

> **Audit the existing implementation and compare it against this architecture memo.**

Report:

1. What already exists.
2. What needs modification.
3. What requires a migration.
4. What can be reused.
5. What conflicts with the current architecture.
6. What requires an Owner decision.

Do not create new tables, routes, modules, or duplicate catalogs simply because the memo mentions them.

This memo defines **business and architecture requirements**.

Implementation must be based on inspection of the current project.

---

# 33. Final Architecture Lock

The current approved conceptual model is:

```text
GLOBAL CATALOGS
│
├── Stages
├── Grades
├── Subjects
├── Languages
├── Locations
└── Service Types
        │
        ▼
ORGANIZATION / TENANT
│
├── Academic Structure
│   ├── Stage / Grade
│   │   ├── Subjects
│   │   ├── Teaching Language
│   │   ├── Delivery Mode
│   │   ├── Capacity
│   │   ├── Current Students
│   │   ├── Remaining Seats
│   │   └── Optional Fees
│   │
│   └── Independent Programs
│       ├── Subject / Course
│       ├── Language
│       ├── Teacher
│       ├── Capacity
│       └── Optional Fee
│
├── Services
│   ├── Transportation
│   ├── Entertainment
│   ├── Activities
│   └── Other Services
│
└── Marketing
    └── Offers
```

## Core Rules

1. **Stages define what is taught.**
2. **Subjects are the primary academic Global Catalog unit.**
3. **Do not create a parallel Curriculum system unless explicitly approved later.**
4. **Languages are a reusable Global Catalog.**
5. **Teaching language can be defined for the stage and/or individual subject.**
6. **Delivery mode can be In-person, Online, or Hybrid.**
7. **Capacity and student availability are core academic/organizational data.**
8. **Remaining seats should be calculated whenever reliable source data allows it.**
9. **Fees are optional.**
10. **Fees can exist at Stage/Grade, Subject, Program/Course, or Service level.**
11. **There is no separate Fees Dashboard module.**
12. **Subject fees are optional.**
13. **Stage fees can exist independently of subject fees.**
14. **Do not automatically aggregate fees unless an explicit pricing rule is configured.**
15. **Offers remain separate Marketing entities.**
16. **Entertainment belongs under Services.**
17. **Transportation belongs under Services/Capabilities.**
18. **Organization-specific data must be isolated by `organization_id`.**
19. **Backend authorization is mandatory; frontend hiding is not security.**
20. **Reuse existing implementation and never create duplicate systems without an approved gap analysis.**
21. **Current implementation scope remains Admin Dashboard first.**
22. **Owner, Teacher, and Client dashboards are future phases.**
23. **The existing approved Admin Dashboard structure must not be redesigned as part of this requirements work.**

---

## Status

**OWNER REQUIREMENTS CAPTURED — WAITING FOR IMPLEMENTATION REVIEW / EXPLICIT IMPLEMENTATION APPROVAL**

No runtime, API, database, migration, or frontend changes are authorized by this memo alone.

---

# 34. Teacher / Freelancer Addendum

Teacher is a **Freelancer / Provider**, not an educational organization.

The same user account may be associated with one or more educational organizations through the existing membership/organization model while maintaining an independent Teacher/Freelancer profile.

### Teacher capabilities

- Profile and contact information
- Global location hierarchy
- Teaching stages / grades
- Global subjects
- Global teaching languages
- Teaching methods / styles
- Teaching modes and service areas
- Qualifications and verification documents
- Verification lifecycle
- Optional organization memberships
- Independent availability / pricing / schedule

A teacher must not need a separate account for every organization where they teach.

### Admin control

Admin controls verification, required documents, permissions, and public/marketplace visibility. A teacher cannot mark their own verification documents as approved.

### Security

Teacher/organization data must respect the existing authorization and tenant model. Reuse existing location, academic, service, organization membership, and document systems where possible.

## 35. Pre-Implementation Decisions Still Required

Two issues were intentionally left open for explicit Owner approval before schema work:

1. **Nullable `grade_id` uniqueness:** PostgreSQL UNIQUE constraints do not, by themselves, prevent duplicate rows when the nullable column is NULL. Use an appropriate partial unique index or equivalent constraint strategy.
2. **Fee source of truth:** Before implementation, explicitly choose how `stage_fee`, `subject_fee`, service pricing, and any fee-record/detail table relate, so there is one clear authoritative source and no accidental double counting.

No migration/API/frontend implementation is authorized until these decisions are resolved and the existing implementation has been audited.

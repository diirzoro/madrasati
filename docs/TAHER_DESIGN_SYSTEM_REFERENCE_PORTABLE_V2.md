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
إدارة المدارس
إدارة المعاهد
إدارة الكليات
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

This list is frozen at 15 entries. `إدارة المدارس`، `إدارة المعاهد`، and
`إدارة الكليات` are three sidebar entries backed by **one** page
implementation, filtered by institution type:

| Entry | Types shown |
|---|---|
| `إدارة المدارس` | مدارس خاصة، مدارس حكومية |
| `إدارة المعاهد` | معاهد |
| `إدارة الكليات` | كليات، جامعات |

Never fork a separate management system per institution type.

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

Large workflows:
- guided wizard

Small additions:
- modal/drawer

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

## 11. Design Freeze / Implementation Safety

During backend hardening or requirements work, do not redesign the approved V4 shell or visual system.

Agents must:
- inspect the existing implementation first
- reuse the existing shell and design system
- change only the requested module/section
- avoid broad visual rewrites

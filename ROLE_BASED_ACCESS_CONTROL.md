# Role-Based Access Control - Frontend Permissions

This document outlines what each user role can see and do in the Inkinki Smart School system.

## Roles Overview

The system has three main user roles:
- **Admin** - Full system access
- **Teacher** - Limited to assigned classes/subjects
- **Accountant** - Financial management access

---

## ADMIN (Full Access)

### Can See:
- ✅ Dashboard Overview (all statistics)
- ✅ All Students (list, details, create, edit, delete)
- ✅ All Staff (list, details, create, edit, delete)
- ✅ All Teachers (list, details, create, edit, delete)
- ✅ All Classes (list, details, create, edit, delete)
- ✅ Class Teachers (list, details, create, edit, delete)
- ✅ All Parents (list, details, create, edit, delete)
- ✅ All Subjects (list, details, create, edit, delete)
- ✅ Academic Years (list, details, create, edit, delete)
- ✅ Fee Types (list, details, create, edit, delete)
- ✅ Fee Management (all fees, create, edit, delete)
- ✅ Expenses (all expenses, create, edit, delete)
- ✅ Attendance (all records, create, edit, delete)
- ✅ Test Marks (all marks, create, edit, delete, publish/unpublish)
- ✅ Exam Marks (all marks, create, edit, delete, publish/unpublish)
- ✅ Inventory (if exists)
- ✅ Settings/Profile

### Can Do:
- ✅ **Create, Read, Update, Delete** for all modules
- ✅ **Publish/Unpublish** marks
- ✅ **Bulk operations** (bulk create, bulk publish)
- ✅ **Export data** (all modules)
- ✅ **Manage all users** and permissions
- ✅ **View all reports** and analytics
- ✅ **Access system settings**
- ✅ **View and edit own profile**

### Cannot Do:
- ❌ Nothing - Admin has unrestricted access

---

## TEACHER (Limited Access)

### Can See:
- ✅ Dashboard Overview (limited stats - only assigned classes)
- ✅ Students (only assigned classes - view and details)
- ✅ Classes (only assigned classes - view and details)
- ✅ Teaching Schedule (view assigned teaching schedules)
- ✅ Subjects (only assigned subjects - view and details)
- ✅ Academic Years (view only - for reference)
- ✅ Attendance (only assigned classes - create, view, edit)
- ✅ Test Marks (only assigned classes/subjects - create, view, edit, publish)
- ✅ Exam Marks (only assigned classes/subjects - create, view, edit, publish)
- ✅ Own Profile

### Cannot See:
- ❌ Staff Management
- ❌ Teacher Management
- ❌ Parents Management
- ❌ Fee Types
- ❌ Fee Management
- ❌ Expenses
- ❌ Inventory
- ❌ Settings (except own profile)

### Can Do:
- ✅ **Create, Read, Update** for:
  - Attendance (assigned classes only)
  - Test Marks (assigned classes/subjects only)
  - Exam Marks (assigned classes/subjects only)
- ✅ **Publish/Unpublish** own marks
- ✅ **View students** in assigned classes
- ✅ **View own profile** and edit own profile
- ✅ **View academic years** (read-only)

### Cannot Do:
- ❌ **Delete** any records
- ❌ **Create/Edit/Delete** students, staff, teachers, classes
- ❌ **Manage fees** or expenses
- ❌ **Access other teachers'** data
- ❌ **Bulk operations** (except own marks)
- ❌ **Export data** (except own class reports)
- ❌ **View reports** (except own class reports)
- ❌ **Access system settings**

---

## ACCOUNTANT (Financial Access)

### Can See:
- ✅ Dashboard Overview (financial statistics only)
- ✅ Students (list and details - view only, for fee purposes)
- ✅ Parents (list and details - view only, for fee purposes)
- ✅ Fee Types (list, details, create, edit, delete)
- ✅ Fee Management (all fees - create, edit, delete, view)
- ✅ Expenses (all expenses - create, edit, delete, view)
- ✅ Academic Years (view only - for fee period reference)
- ✅ Own Profile

### Cannot See:
- ❌ Staff Management
- ❌ Teacher Management
- ❌ Class Teachers Management
- ❌ Classes Management
- ❌ Subjects Management
- ❌ Attendance
- ❌ Test Marks
- ❌ Exam Marks
- ❌ Inventory
- ❌ Settings (except own profile)

### Can Do:
- ✅ **Create, Read, Update, Delete** for:
  - Fee Types
  - Fee Management (fees, invoices, payments)
  - Expenses
- ✅ **View (read-only)**:
  - Students (for fee assignment)
  - Parents (for fee assignment)
  - Academic Years (for period reference)
- ✅ **Generate fee reports**
- ✅ **Export financial data**
- ✅ **View own profile** and edit own profile

### Cannot Do:
- ❌ **Create/Edit/Delete** students, staff, teachers, classes
- ❌ **Manage attendance** or marks
- ❌ **Publish marks**
- ❌ **Access academic/teaching** data
- ❌ **View other users'** profiles
- ❌ **System settings** access

---

## Summary Table

| Module | Admin | Teacher | Accountant |
|--------|-------|---------|------------|
| **Dashboard** | ✅ Full | ✅ Limited | ✅ Financial |
| **Students** | ✅ CRUD | ✅ View (assigned) | ✅ View only |
| **Staff** | ✅ CRUD | ❌ No access | ❌ No access |
| **Teachers** | ✅ CRUD | ❌ No access | ❌ No access |
| **Classes** | ✅ CRUD | ✅ View (assigned) | ❌ No access |
| **Class Teachers** | ✅ CRUD | ✅ View (assigned) | ❌ No access |
| **Parents** | ✅ CRUD | ❌ No access | ✅ View only |
| **Subjects** | ✅ CRUD | ✅ View (assigned) | ❌ No access |
| **Academic Years** | ✅ CRUD | ✅ View only | ✅ View only |
| **Fee Types** | ✅ CRUD | ❌ No access | ✅ CRUD |
| **Fee Management** | ✅ CRUD | ❌ No access | ✅ CRUD |
| **Expenses** | ✅ CRUD | ❌ No access | ✅ CRUD |
| **Attendance** | ✅ CRUD | ✅ CRUD (assigned) | ❌ No access |
| **Test Marks** | ✅ CRUD + Publish | ✅ CRUD + Publish (assigned) | ❌ No access |
| **Exam Marks** | ✅ CRUD + Publish | ✅ CRUD + Publish (assigned) | ❌ No access |
| **Inventory** | ✅ CRUD | ❌ No access | ❌ No access |
| **Profile** | ✅ Edit own | ✅ Edit own | ✅ Edit own |

### Legend:
- ✅ = Full access (CRUD = Create, Read, Update, Delete)
- ✅ View = Read-only access
- ✅ Limited = Restricted to assigned classes/subjects
- ❌ = No access

---

## Important Notes

1. **Teachers** can only see/edit data for classes/subjects they are assigned to via the Class Teachers relationship.

2. **Accountant** has full financial access but no academic/teaching access.

3. **Admin** has unrestricted access to all modules and can perform all operations.

4. **All roles** can view and edit their own profile information.

5. **Publish/Unpublish** functionality is only available for marks (Test Marks and Exam Marks) and only for Admin and Teachers (for their assigned classes).

6. **Bulk operations** (like bulk create, bulk publish) are restricted to Admin only, except Teachers can bulk publish their own marks.

7. **Data export** capabilities vary by role:
   - Admin: Can export all data
   - Teacher: Can export only their assigned class data
   - Accountant: Can export financial data only

---

## Implementation Notes

- Role-based access should be enforced both on the **frontend** (UI visibility) and **backend** (API permissions)
- Teachers' access is filtered by their `class_teacher` assignments
- Accountant's access is limited to financial modules only
- Admin bypasses all restrictions

---

*Last Updated: November 7, 2025*


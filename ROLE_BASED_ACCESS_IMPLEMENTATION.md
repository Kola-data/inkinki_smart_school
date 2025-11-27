# Role-Based Access Control Implementation

This document describes the frontend implementation of role-based access control (RBAC) based on `ROLE_BASED_ACCESS_CONTROL.md`.

## Implementation Summary

### ✅ Completed Components

1. **Role Permissions Utility** (`client/src/utils/rolePermissions.ts`)
   - Defines user roles: `admin`, `teacher`, `accountant`
   - Provides permission checking functions
   - Returns visible navigation items based on role
   - Module constants for consistent module identification

2. **Role Protected Route** (`client/src/components/RoleProtectedRoute.tsx`)
   - Wraps routes to check if user has permission to view the module
   - Redirects to dashboard if user lacks permission

3. **Role Permissions Hook** (`client/src/hooks/useRolePermissions.ts`)
   - Custom React hook for easy access to permissions in components
   - Provides `canView`, `canCreate`, `canUpdate`, `canDelete`, `canPublish`, `canExport`
   - Provides role checks: `isAdmin`, `isTeacher`, `isAccountant`

4. **Updated Components:**
   - ✅ `Login.tsx` - Now stores `staff_role` in localStorage
   - ✅ `Sidebar.tsx` - Shows only role-appropriate navigation items
   - ✅ `App.tsx` - All routes wrapped with `RoleProtectedRoute`

## How to Use in Pages

### Example: Hiding Create/Edit/Delete Buttons

```typescript
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { MODULES } from '../../utils/rolePermissions';

export default function SomeManagementPage() {
  const { canCreate, canUpdate, canDelete, canPublish, MODULES } = useRolePermissions();

  return (
    <div>
      {/* Only show create button if user can create */}
      {canCreate(MODULES.STUDENTS) && (
        <button onClick={handleCreate}>Create Student</button>
      )}

      {/* Only show edit button if user can update */}
      {canUpdate(MODULES.STUDENTS) && (
        <button onClick={handleEdit}>Edit</button>
      )}

      {/* Only show delete button if user can delete */}
      {canDelete(MODULES.STUDENTS) && (
        <button onClick={handleDelete}>Delete</button>
      )}

      {/* Only show publish button if user can publish */}
      {canPublish(MODULES.TEST_MARKS) && (
        <button onClick={handlePublish}>Publish</button>
      )}
    </div>
  );
}
```

### Example: Conditional Rendering Based on Role

```typescript
import { useRolePermissions } from '../../hooks/useRolePermissions';

export default function SomePage() {
  const { isAdmin, isTeacher, isAccountant } = useRolePermissions();

  return (
    <div>
      {isAdmin && <AdminOnlySection />}
      {isTeacher && <TeacherOnlySection />}
      {isAccountant && <AccountantOnlySection />}
    </div>
  );
}
```

### Example: Filtering Data Based on Role

```typescript
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { useEffect, useState } from 'react';

export default function MarksPage() {
  const { isTeacher, role } = useRolePermissions();
  const [marks, setMarks] = useState([]);

  useEffect(() => {
    fetchMarks();
  }, []);

  const fetchMarks = async () => {
    // If teacher, only fetch marks for assigned classes
    if (isTeacher) {
      // Fetch only assigned class marks
      const response = await api.get('/test-marks/?teacher_id=...');
    } else {
      // Admin/Accountant can see all
      const response = await api.get('/test-marks/');
    }
  };
}
```

## Navigation Visibility

The sidebar automatically shows/hides menu items based on role:

- **Admin**: Sees all menu items
- **Teacher**: Sees Dashboard, Students, Classes, Subjects, Academic Years, Attendance, Test Marks, Exam Marks
- **Accountant**: Sees Dashboard, Students, Parents, Fee Types, Fee Management, Expenses, Academic Years

## Route Protection

All routes are protected by `RoleProtectedRoute`:
- If user tries to access a route they don't have permission for, they're redirected to `/dashboard`
- This prevents direct URL access to restricted pages

## Next Steps for Full Implementation

### 1. Update Individual Pages

Each page should use `useRolePermissions` to:
- Hide/show action buttons (Create, Edit, Delete, Publish)
- Filter data based on role (e.g., teachers only see assigned classes)
- Show/hide sections based on permissions

### 2. Backend API Filtering

The backend should also filter data based on role:
- Teachers: Only return data for assigned classes/subjects
- Accountants: Only return financial data
- Admin: Return all data

### 3. Data Filtering Examples

**For Teachers:**
```typescript
// In TestMarksManagement.tsx
const { isTeacher } = useRolePermissions();

useEffect(() => {
  if (isTeacher) {
    // Fetch only marks for teacher's assigned classes
    fetchTeacherMarks();
  } else {
    // Fetch all marks
    fetchAllMarks();
  }
}, [isTeacher]);
```

**For Accountants:**
```typescript
// In StudentManagement.tsx
const { isAccountant } = useRolePermissions();

// Accountants can only view (read-only)
{isAccountant && (
  <div className="read-only-mode">
    {/* Disable all edit/delete buttons */}
  </div>
)}
```

## Testing

To test the implementation:

1. **Login as Admin**: Should see all menu items and have full access
2. **Login as Teacher**: Should see limited menu items, only assigned class data
3. **Login as Accountant**: Should see financial menu items only

## Files Modified/Created

### Created:
- `client/src/utils/rolePermissions.ts`
- `client/src/components/RoleProtectedRoute.tsx`
- `client/src/hooks/useRolePermissions.ts`
- `ROLE_BASED_ACCESS_IMPLEMENTATION.md`

### Modified:
- `client/src/modules/auth/Login.tsx` - Store staff_role
- `client/src/modules/dashboard/partials/Sidebar.tsx` - Role-based navigation
- `client/src/modules/App.tsx` - Role-based route protection

## Notes

- Role is stored in `localStorage` under `staff.staff_role`
- If role is not set, user has no permissions (defaults to no access)
- All permission checks are done client-side - backend should also enforce permissions
- Teachers' data filtering (assigned classes) needs to be implemented per page

---

*Last Updated: November 7, 2025*



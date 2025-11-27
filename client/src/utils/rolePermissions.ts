/**
 * Role-Based Access Control Utilities
 * Based on ROLE_BASED_ACCESS_CONTROL.md
 */

export type UserRole = 'admin' | 'teacher' | 'accountant';

export interface RolePermissions {
	canView: (module: string) => boolean;
	canCreate: (module: string) => boolean;
	canUpdate: (module: string) => boolean;
	canDelete: (module: string) => boolean;
	canPublish: (module: string) => boolean;
	canExport: (module: string) => boolean;
}

// Module names
export const MODULES = {
	DASHBOARD: 'dashboard',
	STUDENTS: 'students',
	STAFF: 'staff',
	TEACHERS: 'teachers',
	CLASSES: 'classes',
	CLASS_TEACHERS: 'class-teachers',
	PARENTS: 'parents',
	SUBJECTS: 'subjects',
	ACADEMIC_YEARS: 'academic-years',
	FEE_TYPES: 'fee-types',
	FEE_MANAGEMENT: 'fee-management',
	EXPENSES: 'expenses',
	ATTENDANCE: 'attendance',
	TEST_MARKS: 'test-marks',
	EXAM_MARKS: 'exam-marks',
	INVENTORY: 'inventory',
	PROFILE: 'profile',
} as const;

/**
 * Get user role from localStorage
 * Roles are: 'admin', 'teacher', 'accountant' (all lowercase as per StaffForm)
 */
export function getUserRole(): UserRole | null {
	try {
		const staff = localStorage.getItem('staff');
		if (staff) {
			const staffData = JSON.parse(staff);
			const role = staffData.staff_role?.toLowerCase().trim();
			// Only return if it's a valid role
			if (role === 'admin' || role === 'teacher' || role === 'accountant') {
				return role as UserRole;
			}}
	} catch (error) {}
	return null;
}

/**
 * Check if user has a specific role
 */
export function hasRole(role: UserRole): boolean {
	const userRole = getUserRole();
	return userRole === role;
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
	return hasRole('admin');
}

/**
 * Check if user is teacher
 */
export function isTeacher(): boolean {
	return hasRole('teacher');
}

/**
 * Check if user is accountant
 */
export function isAccountant(): boolean {
	return hasRole('accountant');
}

/**
 * Get permissions for a specific role
 */
export function getRolePermissions(role: UserRole | null): RolePermissions {
	if (!role) {
		// No role = no permissions
		return {
			canView: () => false,
			canCreate: () => false,
			canUpdate: () => false,
			canDelete: () => false,
			canPublish: () => false,
			canExport: () => false,
		};
	}

	// Admin has all permissions
	if (role === 'admin') {
		return {
			canView: () => true,
			canCreate: () => true,
			canUpdate: () => true,
			canDelete: () => true,
			canPublish: () => true,
			canExport: () => true,
		};
	}

	// Teacher permissions
	if (role === 'teacher') {
		return {
			canView: (module: string) => {
				const viewableModules = [
					MODULES.DASHBOARD,
					MODULES.STUDENTS,
					MODULES.CLASSES,
					MODULES.CLASS_TEACHERS, // Teachers can see teaching schedules
					MODULES.SUBJECTS,
					MODULES.ACADEMIC_YEARS,
					MODULES.ATTENDANCE,
					MODULES.TEST_MARKS,
					MODULES.EXAM_MARKS,
					MODULES.PROFILE,
				];
				return viewableModules.includes(module as any);
			},
			canCreate: (module: string) => {
				const creatableModules = [
					MODULES.ATTENDANCE,
					MODULES.TEST_MARKS,
					MODULES.EXAM_MARKS,
				];
				return creatableModules.includes(module as any);
			},
			canUpdate: (module: string) => {
				const updatableModules = [
					MODULES.ATTENDANCE,
					MODULES.TEST_MARKS,
					MODULES.EXAM_MARKS,
					MODULES.PROFILE,
				];
				return updatableModules.includes(module as any);
			},
			canDelete: () => false, // Teachers cannot delete
			canPublish: (module: string) => {
				return module === MODULES.TEST_MARKS || module === MODULES.EXAM_MARKS;
			},
			canExport: (module: string) => {
				// Teachers can only export their own class data
				return module === MODULES.TEST_MARKS || module === MODULES.EXAM_MARKS || module === MODULES.ATTENDANCE;
			},
		};
	}

	// Accountant permissions
	if (role === 'accountant') {
		return {
			canView: (module: string) => {
				const viewableModules = [
					MODULES.DASHBOARD,
					MODULES.STUDENTS,
					MODULES.PARENTS,
					MODULES.ACADEMIC_YEARS,
					MODULES.FEE_TYPES,
					MODULES.FEE_MANAGEMENT,
					MODULES.EXPENSES,
					MODULES.PROFILE,
				];
				return viewableModules.includes(module as any);
			},
			canCreate: (module: string) => {
				const creatableModules = [
					MODULES.FEE_TYPES,
					MODULES.FEE_MANAGEMENT,
					MODULES.EXPENSES,
				];
				return creatableModules.includes(module as any);
			},
			canUpdate: (module: string) => {
				const updatableModules = [
					MODULES.FEE_TYPES,
					MODULES.FEE_MANAGEMENT,
					MODULES.EXPENSES,
					MODULES.PROFILE,
				];
				return updatableModules.includes(module as any);
			},
			canDelete: (module: string) => {
				const deletableModules = [
					MODULES.FEE_TYPES,
					MODULES.FEE_MANAGEMENT,
					MODULES.EXPENSES,
				];
				return deletableModules.includes(module as any);
			},
			canPublish: () => false, // Accountants cannot publish marks
			canExport: (module: string) => {
				// Accountants can only export financial data
				return module === MODULES.FEE_MANAGEMENT || module === MODULES.EXPENSES || module === MODULES.FEE_TYPES;
			},
		};
	}

	// Default: no permissions
	return {
		canView: () => false,
		canCreate: () => false,
		canUpdate: () => false,
		canDelete: () => false,
		canPublish: () => false,
		canExport: () => false,
	};
}

/**
 * Get current user's permissions
 */
export function getCurrentUserPermissions(): RolePermissions {
	const role = getUserRole();
	return getRolePermissions(role);
}

/**
 * Check if a module should be visible in navigation for current user
 */
export function canViewModule(module: string): boolean {
	const role = getUserRole();
	
	// Dashboard is always accessible
	if (module === MODULES.DASHBOARD) {
		return true;
	}
	
	// If no role, deny access (except dashboard which is handled above)
	if (!role) {
		return false;
	}
	
	const permissions = getCurrentUserPermissions();
	return permissions.canView(module);
}

/**
 * Get visible navigation items for current user
 */
export function getVisibleNavigationItems() {
	const role = getUserRole();// Debug log
	
	if (!role) {// If no role, return at least dashboard
		return [
			{ name: 'Dashboard', path: '/dashboard', module: MODULES.DASHBOARD },
		];
	}
	
	// Admin sees everything - organized by data dependencies
	if (role === 'admin') {
		return [
			// Dashboard
			{ name: 'Dashboard', path: '/dashboard', module: MODULES.DASHBOARD },
			
			// === SETUP & CONFIGURATION (Foundation) ===
			// These should be set up first as they're needed by other modules
			{ name: 'Academic Years', path: '/dashboard/academic-years', module: MODULES.ACADEMIC_YEARS },
			{ name: 'Classes', path: '/dashboard/classes', module: MODULES.CLASSES },
			{ name: 'Subjects', path: '/dashboard/subjects', module: MODULES.SUBJECTS },
			{ name: 'Fee Types', path: '/dashboard/fees', module: MODULES.FEE_TYPES },
			
			// === PEOPLE MANAGEMENT ===
			// Staff first (base for teachers), then teachers, then students and parents
			{ name: 'Staff', path: '/dashboard/staff', module: MODULES.STAFF },
			{ name: 'Teachers', path: '/dashboard/teachers', module: MODULES.TEACHERS },
			{ name: 'Parents', path: '/dashboard/parents', module: MODULES.PARENTS },
			{ name: 'Students', path: '/dashboard/students', module: MODULES.STUDENTS },
			
			// === ACADEMIC OPERATIONS ===
			// Teaching schedule needs classes, teachers, subjects
			{ name: 'Teaching Schedule', path: '/dashboard/class-teachers', module: MODULES.CLASS_TEACHERS },
			// Attendance needs students, classes, subjects
			{ name: 'Attendance', path: '/dashboard/attendance', module: MODULES.ATTENDANCE },
			// Marks need students, subjects, classes, academic years
			{ name: 'Test Marks', path: '/dashboard/test-marks', module: MODULES.TEST_MARKS },
			{ name: 'Exam Marks', path: '/dashboard/exam-marks', module: MODULES.EXAM_MARKS },
			// Reports need all marks data
			{ name: 'Student Reports', path: '/dashboard/student-reports', module: MODULES.STUDENTS },
			
			// === FINANCIAL MANAGEMENT ===
			// Fee management needs fee types, students, academic years
			{ name: 'Fee Management', path: '/dashboard/fee-management', module: MODULES.FEE_MANAGEMENT },
			// Expenses need academic years
			{ name: 'Expenses', path: '/dashboard/expenses', module: MODULES.EXPENSES },
		];
	}
	
	// Teacher sees limited items - organized by workflow
	if (role === 'teacher') {
		return [
			// Dashboard
			{ name: 'Dashboard', path: '/dashboard', module: MODULES.DASHBOARD },
			
			// === REFERENCE DATA ===
			// Teachers need to see these for context
			{ name: 'Academic Years', path: '/dashboard/academic-years', module: MODULES.ACADEMIC_YEARS },
			{ name: 'Classes', path: '/dashboard/classes', module: MODULES.CLASSES },
			{ name: 'Subjects', path: '/dashboard/subjects', module: MODULES.SUBJECTS },
			
			// === TEACHING OPERATIONS ===
			// Their teaching schedule
			{ name: 'Teaching Schedule', path: '/dashboard/class-teachers', module: MODULES.CLASS_TEACHERS },
			// Students they teach
			{ name: 'Students', path: '/dashboard/students', module: MODULES.STUDENTS },
			// Academic operations
			{ name: 'Attendance', path: '/dashboard/attendance', module: MODULES.ATTENDANCE },
			{ name: 'Test Marks', path: '/dashboard/test-marks', module: MODULES.TEST_MARKS },
			{ name: 'Exam Marks', path: '/dashboard/exam-marks', module: MODULES.EXAM_MARKS },
		];
	}
	
	// Accountant sees financial items - organized by workflow
	if (role === 'accountant') {
		return [
			// Dashboard
			{ name: 'Dashboard', path: '/dashboard', module: MODULES.DASHBOARD },
			
			// === REFERENCE DATA ===
			// Academic years needed for financial records
			{ name: 'Academic Years', path: '/dashboard/academic-years', module: MODULES.ACADEMIC_YEARS },
			
			// === PEOPLE (for billing) ===
			// Students and parents needed for fee management
			{ name: 'Students', path: '/dashboard/students', module: MODULES.STUDENTS },
			{ name: 'Parents', path: '/dashboard/parents', module: MODULES.PARENTS },
			
			// === FINANCIAL MANAGEMENT ===
			// Fee types first (configuration), then fee management, then expenses
			{ name: 'Fee Types', path: '/dashboard/fees', module: MODULES.FEE_TYPES },
			{ name: 'Fee Management', path: '/dashboard/fee-management', module: MODULES.FEE_MANAGEMENT },
			{ name: 'Expenses', path: '/dashboard/expenses', module: MODULES.EXPENSES },
		];
	}
	
	return [];
}


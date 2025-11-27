import { useMemo } from 'react';
import { getCurrentUserPermissions, getUserRole, MODULES } from '../utils/rolePermissions';

/**
 * Custom hook to get current user's role permissions
 */
export function useRolePermissions() {
	const permissions = useMemo(() => getCurrentUserPermissions(), []);
	const role = useMemo(() => getUserRole(), []);

	return {
		role,
		permissions,
		canView: (module: string) => permissions.canView(module),
		canCreate: (module: string) => permissions.canCreate(module),
		canUpdate: (module: string) => permissions.canUpdate(module),
		canDelete: (module: string) => permissions.canDelete(module),
		canPublish: (module: string) => permissions.canPublish(module),
		canExport: (module: string) => permissions.canExport(module),
		isAdmin: role === 'admin',
		isTeacher: role === 'teacher',
		isAccountant: role === 'accountant',
		MODULES,
	};
}



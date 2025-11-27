import { Navigate } from 'react-router-dom';
import { canViewModule, getUserRole } from '../utils/rolePermissions';

interface RoleProtectedRouteProps {
	children: React.ReactNode;
	module: string;
}

/**
 * Role-based protected route component
 * Redirects to dashboard if user doesn't have permission to view the module
 */
export default function RoleProtectedRoute({ children, module }: RoleProtectedRouteProps) {
	const role = getUserRole();
	const hasPermission = canViewModule(module);
	
	// If no role, allow access (will be handled by ProtectedRoute)
	if (!role) {
		return <>{children}</>;
	}
	
	// If user doesn't have permission, redirect to dashboard
	if (!hasPermission) {
		// For dashboard itself, always allow (to prevent redirect loop)
		if (module === 'dashboard') {
			return <>{children}</>;
		}
		return <Navigate to="/dashboard" replace />;
	}
	
	return <>{children}</>;
}


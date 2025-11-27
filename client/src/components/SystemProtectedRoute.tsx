import { Navigate } from 'react-router-dom';

interface SystemProtectedRouteProps {
	children: React.ReactNode;
}

export default function SystemProtectedRoute({ children }: SystemProtectedRouteProps) {
	const token = localStorage.getItem('system_token');
	
	if (!token) {
		return <Navigate to="/system/login" replace />;
	}
	
	return <>{children}</>;
}


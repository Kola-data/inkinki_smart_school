import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './dashboard/Dashboard';

export default function App() {
	return (
		<div className="min-h-screen text-gray-800">
			<Routes>
				<Route path="/" element={<Navigate to="/dashboard" replace />} />
				<Route path="/dashboard" element={<Dashboard />} />
			</Routes>
		</div>
	);
}



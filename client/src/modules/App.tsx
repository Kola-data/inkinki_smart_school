import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './dashboard/Dashboard';
import Login from './auth/Login';
import Register from './auth/Register';
import Sidebar from './dashboard/partials/Sidebar';
import Topbar from './dashboard/partials/Topbar';
import ProtectedRoute from '../components/ProtectedRoute';
import StaffManagement from './dashboard/pages/StaffManagement';
import TeacherManagement from './dashboard/pages/TeacherManagement';
import AcademicYearManagement from './dashboard/pages/AcademicYearManagement';
import SubjectManagement from './dashboard/pages/SubjectManagement';
import ClassManagement from './dashboard/pages/ClassManagement';
import ClassTeacherManagement from './dashboard/pages/ClassTeacherManagement';
import { useState } from 'react';

// Placeholder components for dashboard routes
function DashboardPlaceholder({ title }: { title: string }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	
	const toggleSidebar = () => {
		setSidebarOpen(!sidebarOpen);
	};
	
	return (
		<div className="flex bg-gray-50 min-h-screen">
			<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
			<div className="flex-1 flex flex-col min-h-screen overflow-hidden">
				<Topbar 
					onMenuClick={toggleSidebar} 
					sidebarOpen={sidebarOpen}
				/>
				<main className="flex-1 overflow-y-auto p-8">
					<div className="max-w-4xl mx-auto">
						<h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
						<div className="bg-white rounded-[3px] shadow-card p-8 text-center">
							<p className="text-gray-600">This page is under construction. Coming soon!</p>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}

export default function App() {
	return (
		<div className="min-h-screen text-gray-800">
			<Routes>
				<Route path="/" element={<Navigate to="/login" replace />} />
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<Dashboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/students"
					element={
						<ProtectedRoute>
							<DashboardPlaceholder title="Students" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/staff"
					element={
						<ProtectedRoute>
							<StaffManagement />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/teachers"
					element={
						<ProtectedRoute>
							<TeacherManagement />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/classes"
					element={
						<ProtectedRoute>
							<ClassManagement />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/class-teachers"
					element={
						<ProtectedRoute>
							<ClassTeacherManagement />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/parents"
					element={
						<ProtectedRoute>
							<DashboardPlaceholder title="Parents" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/fees"
					element={
						<ProtectedRoute>
							<DashboardPlaceholder title="Fee Management" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/attendance"
					element={
						<ProtectedRoute>
							<DashboardPlaceholder title="Attendance" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/subjects"
					element={
						<ProtectedRoute>
							<SubjectManagement />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/academic-years"
					element={
						<ProtectedRoute>
							<AcademicYearManagement />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/settings"
					element={
						<ProtectedRoute>
							<DashboardPlaceholder title="Settings" />
						</ProtectedRoute>
					}
				/>
			</Routes>
		</div>
	);
}



import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './dashboard/Dashboard';
import Login from './auth/Login';
import Register from './auth/Register';
import ResetPasswordRequest from './auth/ResetPasswordRequest';
import ResetPasswordConfirm from './auth/ResetPasswordConfirm';
import Sidebar from './dashboard/partials/Sidebar';
import Topbar from './dashboard/partials/Topbar';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import SystemProtectedRoute from '../components/SystemProtectedRoute';
import { MODULES } from '../utils/rolePermissions';
import StaffManagement from './dashboard/pages/StaffManagement';
import TeacherManagement from './dashboard/pages/TeacherManagement';
import AcademicYearManagement from './dashboard/pages/AcademicYearManagement';
import SubjectManagement from './dashboard/pages/SubjectManagement';
import ClassManagement from './dashboard/pages/ClassManagement';
import ClassTeacherManagement from './dashboard/pages/ClassTeacherManagement';
import ParentManagement from './dashboard/pages/ParentManagement';
import StudentManagement from './dashboard/pages/StudentManagement';
import FeeTypeManagement from './dashboard/pages/FeeTypeManagement';
import FeeManagement from './dashboard/pages/FeeManagement';
import ExpenseManagement from './dashboard/pages/ExpenseManagement';
import AttendanceManagement from './dashboard/pages/AttendanceManagement';
import TestMarksManagement from './dashboard/pages/TestMarksManagement';
import ExamMarksManagement from './dashboard/pages/ExamMarksManagement';
import StudentReports from './dashboard/pages/StudentReports';
import SystemLogin from './system/auth/SystemLogin';
import SystemDashboard from './system/dashboard/SystemDashboard';
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
				<Route path="/reset-password" element={<ResetPasswordRequest />} />
				<Route path="/reset-password/confirm" element={<ResetPasswordConfirm />} />
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.DASHBOARD}>
								<Dashboard />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/students"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.STUDENTS}>
								<StudentManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/staff"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.STAFF}>
								<StaffManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/teachers"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.TEACHERS}>
								<TeacherManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/classes"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.CLASSES}>
								<ClassManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/class-teachers"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.CLASS_TEACHERS}>
								<ClassTeacherManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/parents"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.PARENTS}>
								<ParentManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/fees"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.FEE_TYPES}>
								<FeeTypeManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/fee-types"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.FEE_TYPES}>
								<FeeTypeManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/fee-management"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.FEE_MANAGEMENT}>
								<FeeManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/attendance"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.ATTENDANCE}>
								<AttendanceManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/subjects"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.SUBJECTS}>
								<SubjectManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/academic-years"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.ACADEMIC_YEARS}>
								<AcademicYearManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/expenses"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.EXPENSES}>
								<ExpenseManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/test-marks"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.TEST_MARKS}>
								<TestMarksManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/exam-marks"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.EXAM_MARKS}>
								<ExamMarksManagement />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/student-reports"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.STUDENTS}>
								<StudentReports />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/settings"
					element={
						<ProtectedRoute>
							<RoleProtectedRoute module={MODULES.PROFILE}>
								<DashboardPlaceholder title="Settings" />
							</RoleProtectedRoute>
						</ProtectedRoute>
					}
				/>
				
				{/* System Management Routes */}
				<Route path="/system/login" element={<SystemLogin />} />
				<Route
					path="/system/dashboard"
					element={
						<SystemProtectedRoute>
							<SystemDashboard />
						</SystemProtectedRoute>
					}
				/>
			</Routes>
		</div>
	);
}



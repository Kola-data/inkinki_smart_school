import { useState } from 'react';
import Sidebar from './partials/Sidebar';
import Topbar from './partials/Topbar';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AccountantDashboard from './components/AccountantDashboard';
import { getUserRole } from '../../utils/rolePermissions';

export default function Dashboard() {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const role = getUserRole();

	const toggleSidebar = () => {
		setSidebarOpen(!sidebarOpen);
	};

	const renderDashboard = () => {
		switch (role) {
			case 'teacher':
				return <TeacherDashboard />;
			case 'accountant':
				return <AccountantDashboard />;
			case 'admin':
			default:
				return <AdminDashboard />;
		}
	};

	return (
		<div className="flex bg-gray-50 min-h-screen">
			<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
			<div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:ml-64">
				<Topbar 
					onMenuClick={toggleSidebar} 
					sidebarOpen={sidebarOpen}
				/>
				<main className="flex-1 overflow-y-auto p-6 space-y-6">
					{renderDashboard()}
				</main>
			</div>
		</div>
	);
}

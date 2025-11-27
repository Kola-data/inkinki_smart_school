import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import SystemUserManagement from './pages/SystemUserManagement';
import SystemAnalytics from './pages/SystemAnalytics';
import PaymentSeasonsManagement from './pages/PaymentSeasonsManagement';
import SchoolPaymentRecordsManagement from './pages/SchoolPaymentRecordsManagement';
import toast from 'react-hot-toast';

export default function SystemDashboard() {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [systemUser, setSystemUser] = useState<any>(null);
	const [activePage, setActivePage] = useState('analytics');
	const navigate = useNavigate();

	useEffect(() => {
		const userStr = localStorage.getItem('system_user');
		if (!userStr) {
			navigate('/system/login');
			return;
		}
		setSystemUser(JSON.parse(userStr));
	}, [navigate]);

	const handleLogout = () => {
		localStorage.removeItem('system_token');
		localStorage.removeItem('system_user');
		toast.success('Logged out successfully');
		navigate('/system/login');
	};

	if (!systemUser) {
		return <div>Loading...</div>;
	}

	return (
		<div className="flex bg-gray-50 min-h-screen">
			{/* Sidebar */}
			<aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
				sidebarOpen ? 'translate-x-0' : '-translate-x-full'
			}`}>
				<div className="flex flex-col h-full">
					{/* Logo */}
					<div className="p-6 border-b border-indigo-800">
						<h1 className="text-xl font-bold">System Management</h1>
						<p className="text-sm text-indigo-300 mt-1">Inkingi Smart School</p>
					</div>

					{/* Navigation */}
					<nav className="flex-1 p-4 space-y-2">
						<button
							onClick={() => setActivePage('analytics')}
							className={`w-full text-left px-4 py-3 rounded-[3px] transition ${
								activePage === 'analytics'
									? 'bg-indigo-800 text-white'
									: 'text-indigo-200 hover:bg-indigo-800'
							}`}
						>
							<div className="flex items-center">
								<svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
								</svg>
								<span>Dashboard</span>
							</div>
						</button>
						<button
							onClick={() => setActivePage('users')}
							className={`w-full text-left px-4 py-3 rounded-[3px] transition ${
								activePage === 'users'
									? 'bg-indigo-800 text-white'
									: 'text-indigo-200 hover:bg-indigo-800'
							}`}
						>
							<div className="flex items-center">
								<svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
								</svg>
								<span>System Users</span>
							</div>
						</button>
						<button
							onClick={() => setActivePage('payment-seasons')}
							className={`w-full text-left px-4 py-3 rounded-[3px] transition ${
								activePage === 'payment-seasons'
									? 'bg-indigo-800 text-white'
									: 'text-indigo-200 hover:bg-indigo-800'
							}`}
						>
							<div className="flex items-center">
								<svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span>Payment Seasons</span>
							</div>
						</button>
						<button
							onClick={() => setActivePage('school-payment-records')}
							className={`w-full text-left px-4 py-3 rounded-[3px] transition ${
								activePage === 'school-payment-records'
									? 'bg-indigo-800 text-white'
									: 'text-indigo-200 hover:bg-indigo-800'
							}`}
						>
							<div className="flex items-center">
								<svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								<span>School Payment Records</span>
							</div>
						</button>
					</nav>

					{/* User Info & Logout */}
					<div className="p-4 border-t border-indigo-800">
						<div className="mb-4">
							<p className="text-sm font-medium">{systemUser.full_name}</p>
							<p className="text-xs text-indigo-300">{systemUser.role}</p>
						</div>
						<button
							onClick={handleLogout}
							className="w-full px-4 py-2 bg-indigo-800 hover:bg-indigo-700 rounded-[3px] transition text-sm"
						>
							Logout
						</button>
					</div>
				</div>
			</aside>

			{/* Overlay for mobile */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* Main Content */}
			<div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:ml-64">
				{/* Topbar */}
				<header className="bg-white shadow-sm border-b border-gray-200">
					<div className="flex items-center justify-between px-6 py-4">
						<button
							onClick={() => setSidebarOpen(!sidebarOpen)}
							className="lg:hidden text-gray-600 hover:text-gray-900 rounded-[3px] p-2 hover:bg-gray-100 transition"
						>
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						</button>
						<h2 className="text-xl font-semibold text-gray-900">
							{activePage === 'analytics' ? 'System Dashboard' : activePage === 'users' ? 'System Users Management' : activePage === 'payment-seasons' ? 'Payment Seasons Management' : activePage === 'school-payment-records' ? 'School Payment Records Management' : 'Dashboard'}
						</h2>
						<div className="flex items-center space-x-4">
							<span className="text-sm text-gray-600">{systemUser.full_name}</span>
						</div>
					</div>
				</header>

				{/* Page Content */}
				<main className="flex-1 overflow-y-auto p-6">
					{activePage === 'analytics' && <SystemAnalytics />}
					{activePage === 'users' && <SystemUserManagement />}
					{activePage === 'payment-seasons' && <PaymentSeasonsManagement />}
					{activePage === 'school-payment-records' && <SchoolPaymentRecordsManagement />}
				</main>
			</div>
		</div>
	);
}


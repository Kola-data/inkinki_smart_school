import { useState } from 'react';
import Sidebar from './partials/Sidebar';
import Topbar from './partials/Topbar';
import StatCards from './partials/StatCards';
import AnalyticsChart from './partials/AnalyticsChart';
import FeeAnalytics from './partials/FeeAnalytics';
import ActivityTable from './partials/ActivityTable';

export default function Dashboard() {
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
				<main className="flex-1 overflow-y-auto p-6 space-y-6">
					<div className="mb-6">
						<h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
						<p className="text-gray-600 mt-1">Welcome back! Here's what's happening at your school today.</p>
					</div>

					<StatCards />

					<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
						<div className="xl:col-span-2">
							<AnalyticsChart />
						</div>
						<div>
							<FeeAnalytics />
						</div>
					</div>

					<ActivityTable />
				</main>
			</div>
		</div>
	);
}

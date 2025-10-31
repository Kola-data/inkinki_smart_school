import Sidebar from './partials/Sidebar';
import Topbar from './partials/Topbar';
import StatCards from './partials/StatCards';
import ActivityTable from './partials/ActivityTable';

export default function Dashboard() {
	return (
		<div className="flex">
			<Sidebar />
			<div className="flex-1 min-h-screen">
				<Topbar />
				<main className="p-6 space-y-6">
					<StatCards />
					<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
						<div className="xl:col-span-2 bg-white rounded-lg shadow-card p-4">
							<div className="flex items-center justify-between mb-2">
								<h3 className="font-semibold">Traffic Sources</h3>
								<button className="text-sm text-primary-600">Actions</button>
							</div>
							<div className="h-64 grid place-items-center text-gray-400">Chart Placeholder</div>
						</div>
						<div className="bg-white rounded-lg shadow-card p-4">
							<h3 className="font-semibold mb-2">Income</h3>
							<div className="h-64 grid place-items-center text-gray-400">Gauge Placeholder</div>
						</div>
					</div>
					<ActivityTable />
				</main>
			</div>
		</div>
	);
}



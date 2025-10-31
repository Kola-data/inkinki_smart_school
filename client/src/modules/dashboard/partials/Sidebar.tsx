export default function Sidebar() {
	return (
		<aside className="hidden lg:flex w-64 min-h-screen bg-white shadow-card flex-col">
			<div className="px-6 py-4 font-semibold text-primary-700">Inkinki</div>
			<nav className="px-3 py-2 space-y-1 text-sm">
				<a className="block rounded px-3 py-2 bg-primary-50 text-primary-700" href="#">Dashboard</a>
				<a className="block rounded px-3 py-2 hover:bg-gray-100" href="#">Analytics</a>
				<a className="block rounded px-3 py-2 hover:bg-gray-100" href="#">Projects</a>
				<a className="block rounded px-3 py-2 hover:bg-gray-100" href="#">Users</a>
			</nav>
		</aside>
	);
}



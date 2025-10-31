export default function Topbar() {
	return (
		<header className="h-14 bg-white shadow-card flex items-center justify-between px-4">
			<h1 className="font-semibold">Minimal Dashboard</h1>
			<div className="flex items-center gap-3 text-sm">
				<input className="hidden md:block bg-gray-100 rounded px-3 py-1.5" placeholder="Search..." />
				<div className="w-8 h-8 rounded-full bg-primary-600 grid place-items-center text-white">A</div>
			</div>
		</header>
	);
}



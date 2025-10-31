const rows = Array.from({ length: 8 }).map((_, i) => ({
	name: `User ${i + 1}`,
	email: `user${i + 1}@mail.com`,
	location: ['Iceland', 'United States', 'Germany'][i % 3],
	status: ['Active', 'Inactive'][i % 2],
	title: ['Software Tester', 'Scrum Master', 'Team Leader'][i % 3],
	university: ['Seoul National University', 'Columbia University', 'Brown University'][i % 3],
}));

export default function ActivityTable() {
	return (
		<div className="bg-white rounded-lg shadow-card p-4">
			<div className="flex items-center justify-between mb-3">
				<h3 className="font-semibold">Overview</h3>
				<div className="text-sm text-gray-500">Displaying {rows.length} results</div>
			</div>
			<div className="overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead className="text-gray-500">
						<tr>
							<th className="text-left p-2">Name</th>
							<th className="text-left p-2">Email</th>
							<th className="text-left p-2">Location</th>
							<th className="text-left p-2">Status</th>
							<th className="text-left p-2">Job Title</th>
							<th className="text-left p-2">University</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => (
							<tr key={r.email} className="border-t">
								<td className="p-2">{r.name}</td>
								<td className="p-2 text-gray-600">{r.email}</td>
								<td className="p-2">{r.location}</td>
								<td className="p-2">
									<span className={`px-2 py-0.5 rounded-full text-xs ${r.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
								</td>
								<td className="p-2">{r.title}</td>
								<td className="p-2">{r.university}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}



function Card({ title, value, delta }: { title: string; value: string; delta: string }) {
	return (
		<div className="bg-white rounded-lg shadow-card p-4">
			<div className="text-sm text-gray-500">{title}</div>
			<div className="mt-2 flex items-center gap-3">
				<div className="text-2xl font-semibold">{value}</div>
				<span className="text-green-600 text-sm">{delta}</span>
			</div>
		</div>
	);
}

export default function StatCards() {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
			<Card title="New Accounts" value="234%" delta="+5%" />
			<Card title="Total Expenses" value="71%" delta="-5%" />
			<Card title="Company Value" value="$1.45M" delta="+4%" />
			<Card title="New Employees" value="34 hires" delta="+8%" />
		</div>
	);
}



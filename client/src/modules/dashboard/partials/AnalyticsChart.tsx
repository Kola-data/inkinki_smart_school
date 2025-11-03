import { useDashboardStats } from '../hooks/useDashboardStats';
import { useEffect, useState } from 'react';

interface ChartDataPoint {
	label: string;
	value: number;
}

export default function AnalyticsChart() {
	const [schoolId, setSchoolId] = useState<string | null>(null);
	const { stats, loading } = useDashboardStats(schoolId);
	const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

	useEffect(() => {
		const storedStaff = localStorage.getItem('staff');
		if (storedStaff) {
			try {
				const staff = JSON.parse(storedStaff);
				if (staff.school_id) {
					setSchoolId(staff.school_id);
				}
			} catch {
				// Keep null
			}
		}
	}, []);

	useEffect(() => {
		if (stats) {
			setChartData([
				{ label: 'Students', value: stats.students },
				{ label: 'Staff', value: stats.staff },
				{ label: 'Teachers', value: stats.teachers },
				{ label: 'Classes', value: stats.classes },
			]);
		}
	}, [stats]);

	const maxValue = Math.max(...chartData.map((d) => d.value), 1);

	if (loading) {
		return (
			<div className="bg-white rounded-[3px] shadow-card p-6">
				<h3 className="text-lg font-semibold text-gray-800 mb-4">Overview Statistics</h3>
				<div className="h-64 grid place-items-center">
					<div className="animate-pulse text-gray-400">Loading chart...</div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-[3px] shadow-card p-6">
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-semibold text-gray-800">Overview Statistics</h3>
				<span className="text-sm text-gray-500">Last 30 days</span>
			</div>
			<div className="space-y-4">
				{chartData.map((item, index) => (
					<div key={index} className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="font-medium text-gray-700">{item.label}</span>
							<span className="text-gray-600 font-semibold">{item.value}</span>
						</div>
						<div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
							<div
								className="h-full bg-gradient-to-r from-primary-600 to-primary-700 rounded-full transition-all duration-500 ease-out"
								style={{ width: `${(item.value / maxValue) * 100}%` }}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}


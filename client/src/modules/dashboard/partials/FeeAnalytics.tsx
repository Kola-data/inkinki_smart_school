import { useDashboardStats } from '../hooks/useDashboardStats';
import { useEffect, useState } from 'react';

export default function FeeAnalytics() {
	const [schoolId, setSchoolId] = useState<string | null>(null);
	const { stats, loading } = useDashboardStats(schoolId);

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

	const paidPercentage = stats.totalFees > 0 ? (stats.paidFees / stats.totalFees) * 100 : 0;
	const pendingPercentage = stats.totalFees > 0 ? (stats.pendingFees / stats.totalFees) * 100 : 0;

	if (loading) {
		return (
			<div className="bg-white rounded-[3px] shadow-card p-6">
				<h3 className="text-lg font-semibold text-gray-800 mb-4">Fee Status</h3>
				<div className="h-64 grid place-items-center">
					<div className="animate-pulse text-gray-400">Loading...</div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-[3px] shadow-card p-6">
			<h3 className="text-lg font-semibold text-gray-800 mb-6">Fee Status</h3>
			
			<div className="space-y-6">
				<div className="relative">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-gray-700">Paid</span>
						<span className="text-sm font-semibold text-green-600">
							{stats.paidFees} ({paidPercentage.toFixed(1)}%)
						</span>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
						<div
							className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
							style={{ width: `${paidPercentage}%` }}
						/>
					</div>
				</div>

				<div className="relative">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-gray-700">Pending</span>
						<span className="text-sm font-semibold text-orange-600">
							{stats.pendingFees} ({pendingPercentage.toFixed(1)}%)
						</span>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
						<div
							className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
							style={{ width: `${pendingPercentage}%` }}
						/>
					</div>
				</div>

				<div className="pt-4 border-t border-gray-200">
					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-600">Total Fees</span>
						<span className="text-lg font-bold text-gray-900">{stats.totalFees}</span>
					</div>
				</div>
			</div>
		</div>
	);
}


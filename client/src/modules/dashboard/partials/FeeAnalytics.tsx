import { useDashboardStats } from '../hooks/useDashboardStats';
import { useEffect, useState } from 'react';

interface FeeAnalyticsProps {
	academicYearId?: string | null;
}

export default function FeeAnalytics({ academicYearId = null }: FeeAnalyticsProps) {
	const [schoolId, setSchoolId] = useState<string | null>(null);
	const { stats, loading } = useDashboardStats(schoolId, academicYearId);

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
			<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden">
				<div className="absolute top-0 left-0 right-0 h-1 bg-gray-300"></div>
				<h3 className="text-lg font-semibold text-gray-800 mb-4">Fee Status</h3>
				<div className="h-64 grid place-items-center">
					<div className="animate-pulse text-gray-400">Loading...</div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden">
			<div className="absolute top-0 left-0 right-0 h-1 bg-yellow-600"></div>
			<div className="mb-6">
				<h3 className="text-lg font-semibold text-gray-800">Fee Status</h3>
				<p className="text-xs text-gray-500 mt-1">Payment status breakdown of all fee records</p>
			</div>
			
			<div className="space-y-6">
				<div className="relative">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-gray-700">Paid Fees</span>
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
					<p className="text-xs text-gray-500 mt-1">Fees successfully collected</p>
				</div>

				<div className="relative">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-gray-700">Pending Fees</span>
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
					<p className="text-xs text-gray-500 mt-1">Fees awaiting payment</p>
				</div>

				<div className="pt-4 border-t border-gray-200">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-gray-600">Total Fee Records</span>
						<span className="text-lg font-bold text-gray-900">{stats.totalFees}</span>
					</div>
					<p className="text-xs text-gray-500">All fee records in the system</p>
				</div>
			</div>
		</div>
	);
}


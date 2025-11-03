import { useDashboardStats } from '../hooks/useDashboardStats';
import { useEffect, useState } from 'react';

interface StatCardProps {
	title: string;
	value: string | number;
	change?: string;
	changeType?: 'positive' | 'negative' | 'neutral';
	icon: string;
	color: string;
	loading?: boolean;
}

function StatCard({ title, value, change, changeType = 'neutral', icon, color, loading }: StatCardProps) {
	if (loading) {
		return (
			<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 hover:shadow-lg transition-shadow">
				<div className="animate-pulse">
					<div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
					<div className="h-8 bg-gray-200 rounded w-1/2"></div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 group">
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
					<div className="flex items-baseline gap-2">
						<p className="text-3xl font-bold text-gray-900">{value}</p>
						{change && (
							<span
								className={`text-sm font-medium ${
									changeType === 'positive'
										? 'text-green-600'
										: changeType === 'negative'
										? 'text-red-600'
										: 'text-gray-500'
								}`}
							>
								{change}
							</span>
						)}
					</div>
				</div>
				<div
					className={`w-12 h-12 rounded-[3px] ${color} flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform duration-200`}
				>
					{icon}
				</div>
			</div>
		</div>
	);
}

export default function StatCards() {
	const [schoolId, setSchoolId] = useState<string | null>(null);
	const { stats, loading } = useDashboardStats(schoolId);

	useEffect(() => {
		// Get school ID from localStorage or from logged-in staff
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

	const cards = [
		{
			title: 'Total Students',
			value: stats.students,
			change: '+12%',
			changeType: 'positive' as const,
			icon: '👨‍🎓',
			color: 'bg-blue-100 text-blue-600',
		},
		{
			title: 'Staff Members',
			value: stats.staff,
			change: '+3',
			changeType: 'positive' as const,
			icon: '👔',
			color: 'bg-purple-100 text-purple-600',
		},
		{
			title: 'Active Classes',
			value: stats.classes,
			change: undefined,
			changeType: 'neutral' as const,
			icon: '🏫',
			color: 'bg-green-100 text-green-600',
		},
		{
			title: 'Total Fees',
			value: `$${stats.totalFees.toLocaleString()}`,
			change: `${stats.paidFees} paid`,
			changeType: 'positive' as const,
			icon: '💰',
			color: 'bg-yellow-100 text-yellow-600',
		},
		{
			title: 'Teachers',
			value: stats.teachers,
			change: undefined,
			changeType: 'neutral' as const,
			icon: '👨‍🏫',
			color: 'bg-indigo-100 text-indigo-600',
		},
		{
			title: 'Parents',
			value: stats.parents,
			change: undefined,
			changeType: 'neutral' as const,
			icon: '👨‍👩‍👧‍👦',
			color: 'bg-pink-100 text-pink-600',
		},
		{
			title: 'Subjects',
			value: stats.subjects,
			change: undefined,
			changeType: 'neutral' as const,
			icon: '📚',
			color: 'bg-teal-100 text-teal-600',
		},
		{
			title: 'Attendance Rate',
			value: `${stats.attendanceRate}%`,
			change: '+5%',
			changeType: 'positive' as const,
			icon: '📅',
			color: 'bg-orange-100 text-orange-600',
		},
	];

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
			{cards.map((card, index) => (
				<StatCard key={index} {...card} loading={loading} />
			))}
		</div>
	);
}

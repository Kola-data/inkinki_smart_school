import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '../hooks/useDashboardStats';
import AnalyticsChart from '../partials/AnalyticsChart';
import FeeAnalytics from '../partials/FeeAnalytics';
import ActivityTable from '../partials/ActivityTable';
import AcademicYearFilter from './AcademicYearFilter';
import {
	UserGroupIcon,
	UsersIcon,
	AcademicCapIcon,
	BuildingOfficeIcon,
	BookOpenIcon,
	CurrencyDollarIcon,
	CalendarDaysIcon,
	InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface StatCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	description: string;
	icon: React.ReactNode;
	color: string;
	borderColor: string;
	onClick?: () => void;
	loading?: boolean;
}

function StatCard({ title, value, subtitle, description, icon, color, borderColor, onClick, loading }: StatCardProps) {
	if (loading) {
		return (
			<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden">
				<div className="absolute top-0 left-0 right-0 h-1 bg-gray-300"></div>
				<div className="animate-pulse">
					<div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
					<div className="h-8 bg-gray-200 rounded w-1/2"></div>
				</div>
			</div>
		);
	}

	return (
		<div
			onClick={onClick}
			className={`bg-white rounded-[3px] shadow-card p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 relative overflow-hidden ${
				onClick ? 'cursor-pointer hover:scale-105' : ''
			}`}
		>
			<div className={`absolute top-0 left-0 right-0 h-1 ${borderColor}`}></div>
			<div className="flex items-start justify-between mb-3">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<p className="text-sm font-medium text-gray-600">{title}</p>
						<div className="group relative">
							<InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
							<div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
								{description}
							</div>
						</div>
					</div>
					<p className="text-3xl font-bold text-gray-900">{value}</p>
					{subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
				</div>
				<div className={`w-12 h-12 rounded-[3px] ${color} flex items-center justify-center shadow-sm`}>
					{icon}
				</div>
			</div>
		</div>
	);
}

export default function AdminDashboard() {
	const navigate = useNavigate();
	const [schoolId, setSchoolId] = useState<string | null>(null);
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | null>(null);
	const { stats, loading } = useDashboardStats(schoolId, selectedAcademicYearId);

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

	const cards: StatCardProps[] = [
		{
			title: 'Total Students',
			value: stats.students,
			subtitle: 'Enrolled students',
			description: 'Enrolled students',
			icon: <UserGroupIcon className="w-6 h-6" />,
			color: 'bg-blue-100 text-blue-600',
			borderColor: 'bg-blue-600',
			onClick: () => navigate('/dashboard/students'),
		},
		{
			title: 'Staff Members',
			value: stats.staff,
			subtitle: 'All staff personnel',
			description: 'All staff personnel',
			icon: <UsersIcon className="w-6 h-6" />,
			color: 'bg-purple-100 text-purple-600',
			borderColor: 'bg-purple-600',
			onClick: () => navigate('/dashboard/staff'),
		},
		{
			title: 'Active Classes',
			value: stats.classes,
			subtitle: 'Classes in session',
			description: 'Classes in session',
			icon: <BuildingOfficeIcon className="w-6 h-6" />,
			color: 'bg-green-100 text-green-600',
			borderColor: 'bg-green-600',
			onClick: () => navigate('/dashboard/classes'),
		},
		{
			title: 'Total Fees',
			value: `${stats.totalFees}`,
			subtitle: `${stats.paidFees} paid, ${stats.pendingFees} pending`,
			description: `${stats.paidFees} paid, ${stats.pendingFees} pending`,
			icon: <CurrencyDollarIcon className="w-6 h-6" />,
			color: 'bg-yellow-100 text-yellow-600',
			borderColor: 'bg-yellow-600',
			onClick: () => navigate('/dashboard/fee-management'),
		},
		{
			title: 'Teachers',
			value: stats.teachers,
			subtitle: 'Teaching staff',
			description: 'Teaching staff',
			icon: <AcademicCapIcon className="w-6 h-6" />,
			color: 'bg-indigo-100 text-indigo-600',
			borderColor: 'bg-indigo-600',
			onClick: () => navigate('/dashboard/teachers'),
		},
		{
			title: 'Parents',
			value: stats.parents,
			subtitle: 'Registered parents',
			description: 'Registered parents',
			icon: <UsersIcon className="w-6 h-6" />,
			color: 'bg-pink-100 text-pink-600',
			borderColor: 'bg-pink-600',
			onClick: () => navigate('/dashboard/parents'),
		},
		{
			title: 'Subjects',
			value: stats.subjects,
			subtitle: 'Taught subjects',
			description: 'Taught subjects',
			icon: <BookOpenIcon className="w-6 h-6" />,
			color: 'bg-teal-100 text-teal-600',
			borderColor: 'bg-teal-600',
			onClick: () => navigate('/dashboard/subjects'),
		},
		{
			title: 'Attendance Rate',
			value: `${stats.attendanceRate}%`,
			subtitle: 'Overall attendance',
			description: `Overall attendance: ${stats.attendanceRate}%`,
			icon: <CalendarDaysIcon className="w-6 h-6" />,
			color: 'bg-orange-100 text-orange-600',
			borderColor: 'bg-orange-600',
			onClick: () => navigate('/dashboard/attendance'),
		},
	];

	return (
		<>
			<div className="mb-6">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
						<p className="text-gray-600 mt-1">Complete overview of your school's operations and performance.</p>
					</div>
					<div className="w-full sm:w-64">
						<AcademicYearFilter
							schoolId={schoolId}
							selectedAcademicYearId={selectedAcademicYearId}
							onChange={setSelectedAcademicYearId}
							placeholder="Filter by Academic Year"
						/>
					</div>
				</div>
			</div>

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
				{cards.map((card, index) => (
					<StatCard key={index} {...card} loading={loading} />
				))}
			</div>

			{/* Analytics Section */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
				<div className="xl:col-span-2">
					<AnalyticsChart academicYearId={selectedAcademicYearId} />
				</div>
				<div>
					<FeeAnalytics academicYearId={selectedAcademicYearId} />
				</div>
			</div>

			<ActivityTable />
		</>
	);
}



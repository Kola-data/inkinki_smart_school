import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { Link } from 'react-router-dom';

interface RecentActivity {
	id: string;
	type: string;
	title: string;
	description: string;
	time: string;
	status?: string;
}

export default function ActivityTable() {
	const [activities, setActivities] = useState<RecentActivity[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchRecentActivity() {
			try {
				const storedStaff = localStorage.getItem('staff');
				if (!storedStaff) return;

				const staff = JSON.parse(storedStaff);
				const schoolId = staff.school_id;

				// Fetch recent students, staff, and fees
				const [studentsRes, staffRes, feesRes] = await Promise.all([
					api.get(`/students`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/staff`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/fee-management`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
				]);

				const students = (studentsRes.data || []).slice(0, 3);
				const staffList = (staffRes.data || []).slice(0, 2);
				const fees = (feesRes.data || []).slice(0, 3);

				const activityList: RecentActivity[] = [
					...students.map((s: any) => ({
						id: s.std_id,
						type: 'student',
						title: `New Student: ${s.std_name}`,
						description: `Added to class ${s.current_class_name || 'N/A'}`,
						time: '2 hours ago',
						status: s.status || 'Active',
					})),
					...staffList.map((s: any) => ({
						id: s.staff_id,
						type: 'staff',
						title: `Staff Member: ${s.staff_name}`,
						description: `Role: ${s.staff_role || 'N/A'}`,
						time: '1 day ago',
						status: s.is_active ? 'Active' : 'Inactive',
					})),
					...fees.map((f: any) => ({
						id: f.fee_id,
						type: 'fee',
						title: `Fee Payment: ${f.student_name || 'Student'}`,
						description: `Amount: $${f.amount_paid || 0}`,
						time: '3 days ago',
						status: f.status || 'Pending',
					})),
				];

				setActivities(activityList.slice(0, 8));
			} catch (error) {
				console.error('Error fetching activity:', error);
			} finally {
				setLoading(false);
			}
		}

		fetchRecentActivity();
	}, []);

	if (loading) {
		return (
			<div className="bg-white rounded-[3px] shadow-card p-6">
				<h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
				<div className="space-y-4">
					{[1, 2, 3].map((i) => (
						<div key={i} className="animate-pulse">
							<div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
							<div className="h-3 bg-gray-200 rounded w-1/2"></div>
						</div>
					))}
				</div>
			</div>
		);
	}

	const getIcon = (type: string) => {
		switch (type) {
			case 'student':
				return '👨‍🎓';
			case 'staff':
				return '👔';
			case 'fee':
				return '💰';
			default:
				return '📝';
		}
	};

	const getStatusColor = (status: string) => {
		switch (status?.toLowerCase()) {
			case 'active':
			case 'paid':
			case 'completed':
				return 'bg-green-100 text-green-700';
			case 'pending':
				return 'bg-yellow-100 text-yellow-700';
			case 'inactive':
				return 'bg-gray-100 text-gray-700';
			default:
				return 'bg-blue-100 text-blue-700';
		}
	};

	return (
		<div className="bg-white rounded-[3px] shadow-card p-6">
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
				<Link
					to="/dashboard"
					className="text-sm text-primary-600 hover:text-primary-700 font-medium"
				>
					View All
				</Link>
			</div>
			
			<div className="space-y-4">
				{activities.length === 0 ? (
					<div className="text-center py-8 text-gray-500">
						<p>No recent activity</p>
					</div>
				) : (
					activities.map((activity) => (
						<div
							key={activity.id}
							className="flex items-start gap-4 p-4 rounded-[3px] hover:bg-gray-50 transition-colors border border-gray-100"
						>
							<div className="text-2xl flex-shrink-0">{getIcon(activity.type)}</div>
							<div className="flex-1 min-w-0">
								<p className="font-medium text-gray-900 truncate">{activity.title}</p>
								<p className="text-sm text-gray-600 mt-1">{activity.description}</p>
								<div className="flex items-center gap-3 mt-2">
									<span className="text-xs text-gray-500">{activity.time}</span>
									{activity.status && (
										<span
											className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
												activity.status
											)}`}
										>
											{activity.status}
										</span>
									)}
								</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}

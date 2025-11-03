import { useState, useEffect } from 'react';
import { api } from '../../../services/api';

interface DashboardStats {
	students: number;
	staff: number;
	parents: number;
	classes: number;
	teachers: number;
	subjects: number;
	totalFees: number;
	paidFees: number;
	pendingFees: number;
	attendanceRate: number;
}

export function useDashboardStats(schoolId: string | null) {
	const [stats, setStats] = useState<DashboardStats>({
		students: 0,
		staff: 0,
		parents: 0,
		classes: 0,
		teachers: 0,
		subjects: 0,
		totalFees: 0,
		paidFees: 0,
		pendingFees: 0,
		attendanceRate: 0,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!schoolId) {
			setLoading(false);
			return;
		}

		async function fetchStats() {
			try {
				setLoading(true);
				setError(null);

				// Fetch all data in parallel
				const [studentsRes, staffRes, parentsRes, classesRes, teachersRes, subjectsRes, feesRes] = await Promise.all([
					api.get(`/students`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/staff`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/parents`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/classes`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/teachers`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/subjects`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/fee-management`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
				]);

				const students = studentsRes.data || [];
				const staff = staffRes.data || [];
				const parents = parentsRes.data || [];
				const classes = classesRes.data || [];
				const teachers = teachersRes.data || [];
				const subjects = subjectsRes.data || [];
				const fees = feesRes.data || [];

				// Calculate fee statistics
				const totalFees = fees.length;
				const paidFees = fees.filter((f: any) => f.status === 'paid' || f.status === 'completed').length;
				const pendingFees = totalFees - paidFees;

				// Calculate attendance (simplified - you might want to fetch actual attendance data)
				const attendanceRate = 85; // Placeholder - can be calculated from attendance data

				setStats({
					students: students.length,
					staff: staff.length,
					parents: parents.length,
					classes: classes.length,
					teachers: teachers.length,
					subjects: subjects.length,
					totalFees,
					paidFees,
					pendingFees,
					attendanceRate,
				});
			} catch (err: any) {
				setError(err.response?.data?.detail || 'Failed to fetch dashboard statistics');
				console.error('Dashboard stats error:', err);
			} finally {
				setLoading(false);
			}
		}

		fetchStats();
	}, [schoolId]);

	return { stats, loading, error };
}


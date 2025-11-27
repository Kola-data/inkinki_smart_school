import { useState, useEffect } from 'react';
import api from '../../../services/api';

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

export function useDashboardStats(schoolId: string | null, academicYearId: string | null = null) {
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

				// Build params with optional academic year filter
				const baseParams: any = { school_id: schoolId };
				if (academicYearId) {
					baseParams.academic_id = academicYearId;
				}

				// Fetch all data in parallel
				const [studentsRes, staffRes, parentsRes, classesRes, teachersRes, subjectsRes, feesRes, attendanceRes] = await Promise.all([
					api.get(`/students`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/staff`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/parents`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/classes`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/teachers`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/subjects`, { params: { school_id: schoolId } }).catch(() => ({ data: [] })),
					api.get(`/fee-management`, { params: baseParams }).catch(() => ({ data: [] })),
					api.get(`/attendance`, { params: baseParams }).catch(() => ({ data: [] })),
				]);

				// Helper function to extract array from paginated or direct response
				const getArrayFromResponse = (data: any): any[] => {
					if (!data) return [];
					if (Array.isArray(data)) return data;
					if (data.items && Array.isArray(data.items)) return data.items;
					return [];
				};

				const students = getArrayFromResponse(studentsRes.data);
				const staff = getArrayFromResponse(staffRes.data);
				const parents = getArrayFromResponse(parentsRes.data);
				const classes = getArrayFromResponse(classesRes.data);
				const teachers = getArrayFromResponse(teachersRes.data);
				const subjects = getArrayFromResponse(subjectsRes.data);
				const fees = getArrayFromResponse(feesRes.data);
				const attendance = getArrayFromResponse(attendanceRes.data);

				// Filter staff by role (only count non-deleted staff)
				const activeStaff = staff.filter((s: any) => !s.is_deleted);
				const teachersCount = activeStaff.filter((s: any) => s.staff_role === 'teacher').length;
				const accountantsCount = activeStaff.filter((s: any) => s.staff_role === 'accountant').length;
				const adminsCount = activeStaff.filter((s: any) => s.staff_role === 'admin').length;

				// Calculate fee statistics (filtered by academic year if provided)
				const totalFees = fees.length;
				const paidFees = fees.filter((f: any) => f.status === 'paid' || f.status === 'completed').length;
				const pendingFees = totalFees - paidFees;

				// Calculate attendance rate from real data
				// Filter out deleted attendance records
				const activeAttendance = attendance.filter((a: any) => !a.is_deleted);
				const totalAttendanceRecords = activeAttendance.length;
				
				// Count present (present, late, excused are considered present)
				const presentCount = activeAttendance.filter((a: any) => {
					const status = (a.status || '').toLowerCase();
					return status === 'present' || status === 'late' || status === 'excused';
				}).length;
				
				// Calculate attendance rate as percentage
				const attendanceRate = totalAttendanceRecords > 0 
					? Math.round((presentCount / totalAttendanceRecords) * 100) 
					: 0;

				setStats({
					students: students.length,
					staff: activeStaff.length, // Total active staff
					parents: parents.length,
					classes: classes.length,
					teachers: teachers.length > 0 ? teachers.length : teachersCount, // Use teachers endpoint if available, otherwise count from staff
					subjects: subjects.length,
					totalFees,
					paidFees,
					pendingFees,
					attendanceRate,
				});
			} catch (err: any) {
				setError(err.response?.data?.detail || 'Failed to fetch dashboard statistics');} finally {
				setLoading(false);
			}
		}

		fetchStats();
	}, [schoolId, academicYearId]);

	return { stats, loading, error };
}


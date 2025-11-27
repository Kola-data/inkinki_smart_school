import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import AcademicYearFilter from './AcademicYearFilter';
import { 
	AcademicCapIcon, 
	UserGroupIcon, 
	BookOpenIcon,
	ChartBarIcon,
	ClipboardDocumentCheckIcon,
	InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface TeacherStats {
	myClasses: number;
	myStudents: number;
	mySubjects: number;
	totalAttendance: number;
	testMarksEntered: number;
	examMarksEntered: number;
	averageTestMark: number;
	averageExamMark: number;
}

interface StatCardProps {
	title: string;
	value: string | number;
	description: string;
	icon: React.ReactNode;
	color: string;
	onClick?: () => void;
}

function StatCard({ title, value, description, icon, color, onClick }: StatCardProps) {
	// Extract border color from icon color
	const borderColorMap: { [key: string]: string } = {
		'bg-blue-100': 'bg-blue-600',
		'bg-green-100': 'bg-green-600',
		'bg-purple-100': 'bg-purple-600',
		'bg-orange-100': 'bg-orange-600',
		'bg-indigo-100': 'bg-indigo-600',
		'bg-pink-100': 'bg-pink-600',
		'bg-teal-100': 'bg-teal-600',
		'bg-yellow-100': 'bg-yellow-600',
	};
	const borderColor = borderColorMap[color] || 'bg-gray-600';

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
							<div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
								{description}
							</div>
						</div>
					</div>
					<p className="text-3xl font-bold text-gray-900">{value}</p>
				</div>
				<div className={`w-12 h-12 rounded-[3px] ${color} flex items-center justify-center shadow-sm`}>
					{icon}
				</div>
			</div>
		</div>
	);
}

export default function TeacherDashboard() {
	const navigate = useNavigate();
	const [schoolId, setSchoolId] = useState<string | null>(null);
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | null>(null);
	const [stats, setStats] = useState<TeacherStats>({
		myClasses: 0,
		myStudents: 0,
		mySubjects: 0,
		totalAttendance: 0,
		testMarksEntered: 0,
		examMarksEntered: 0,
		averageTestMark: 0,
		averageExamMark: 0,
	});
	const [loading, setLoading] = useState(true);

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
		if (!schoolId) {
			setLoading(false);
			return;
		}

		async function fetchTeacherStats() {
			try {
				setLoading(true);
				
				// Build params with optional academic year filter
				const attendanceParams: any = { school_id: schoolId };
				const testMarksParams: any = { school_id: schoolId };
				const examMarksParams: any = { school_id: schoolId };
				
				if (selectedAcademicYearId) {
					attendanceParams.academic_id = selectedAcademicYearId;
					testMarksParams.academic_id = selectedAcademicYearId;
					examMarksParams.academic_id = selectedAcademicYearId;
				}
				
				// Add pagination params for marks endpoints
				const testMarksParamsWithPagination = { ...testMarksParams, page: 1, page_size: 100 };
				const examMarksParamsWithPagination = { ...examMarksParams, page: 1, page_size: 100 };
				
				const [scheduleRes, attendanceRes, testMarksRes, examMarksRes] = await Promise.all([
					api.get(`/class-teachers/?school_id=${schoolId}`).catch(() => ({ data: [] })),
					api.get(`/attendance/`, { params: attendanceParams }).catch(() => ({ data: [] })),
					api.get(`/test-marks/`, { params: testMarksParamsWithPagination }).catch(() => ({ data: [] })),
					api.get(`/exam-marks/`, { params: examMarksParamsWithPagination }).catch(() => ({ data: [] })),
				]);

				const schedule = getArrayFromResponse(scheduleRes.data);
				const attendance = getArrayFromResponse(attendanceRes.data);
				const testMarks = getArrayFromResponse(testMarksRes.data);
				const examMarks = getArrayFromResponse(examMarksRes.data);
				
				console.log('Teacher Dashboard - Marks Data:', {
					testMarksCount: testMarks.length,
					examMarksCount: examMarks.length,
					testMarksResponse: testMarksRes.data,
					examMarksResponse: examMarksRes.data,
				});

				const uniqueClasses = new Set(schedule.map((s: any) => s.cls_id));
				const uniqueSubjects = new Set(schedule.map((s: any) => s.subj_id));
				
				const studentsRes = await api.get(`/students/?school_id=${schoolId}&page=1&page_size=100`).catch(() => ({ data: [] }));
				const allStudents = getArrayFromResponse(studentsRes.data);
				const myStudents = allStudents.filter((s: any) => {
					const studentClassId = s.current_class || s.cls_id || s.current_class_obj?.cls_id;
					return studentClassId && Array.from(uniqueClasses).includes(String(studentClassId));
				});

				const testMarkValues = testMarks.map((m: any) => m.test_mark || 0).filter((v: number) => v > 0);
				const examMarkValues = examMarks.map((m: any) => m.exam_mark || 0).filter((v: number) => v > 0);
				
				const avgTestMark = testMarkValues.length > 0 
					? testMarkValues.reduce((a: number, b: number) => a + b, 0) / testMarkValues.length 
					: 0;
				const avgExamMark = examMarkValues.length > 0
					? examMarkValues.reduce((a: number, b: number) => a + b, 0) / examMarkValues.length
					: 0;

				setStats({
					myClasses: uniqueClasses.size,
					myStudents: myStudents.length,
					mySubjects: uniqueSubjects.size,
					totalAttendance: attendance.length,
					testMarksEntered: testMarks.length,
					examMarksEntered: examMarks.length,
					averageTestMark: Math.round(avgTestMark * 10) / 10,
					averageExamMark: Math.round(avgExamMark * 10) / 10,
				});
			} catch (error) {} finally {
				setLoading(false);
			}
		}

		fetchTeacherStats();
	}, [schoolId, selectedAcademicYearId]);

	const cards: StatCardProps[] = [
		{
			title: 'My Classes',
			value: stats.myClasses,
			description: 'Assigned classes',
			icon: <AcademicCapIcon className="w-6 h-6" />,
			color: 'bg-blue-100 text-blue-600',
			onClick: () => navigate('/dashboard/classes'),
		},
		{
			title: 'My Students',
			value: stats.myStudents,
			description: 'Students in classes',
			icon: <UserGroupIcon className="w-6 h-6" />,
			color: 'bg-green-100 text-green-600',
			onClick: () => navigate('/dashboard/students'),
		},
		{
			title: 'My Subjects',
			value: stats.mySubjects,
			description: 'Subjects taught',
			icon: <BookOpenIcon className="w-6 h-6" />,
			color: 'bg-purple-100 text-purple-600',
			onClick: () => navigate('/dashboard/subjects'),
		},
		{
			title: 'Attendance Records',
			value: stats.totalAttendance,
			description: 'Attendance records',
			icon: <ClipboardDocumentCheckIcon className="w-6 h-6" />,
			color: 'bg-orange-100 text-orange-600',
			onClick: () => navigate('/dashboard/attendance'),
		},
		{
			title: 'Test Marks Entered',
			value: stats.testMarksEntered,
			description: 'Test marks recorded',
			icon: <ChartBarIcon className="w-6 h-6" />,
			color: 'bg-indigo-100 text-indigo-600',
			onClick: () => navigate('/dashboard/test-marks'),
		},
		{
			title: 'Exam Marks Entered',
			value: stats.examMarksEntered,
			description: 'Exam marks recorded',
			icon: <ChartBarIcon className="w-6 h-6" />,
			color: 'bg-pink-100 text-pink-600',
			onClick: () => navigate('/dashboard/exam-marks'),
		},
		{
			title: 'Average Test Mark',
			value: stats.averageTestMark > 0 ? stats.averageTestMark.toFixed(1) : 'N/A',
			description: 'Average test score',
			icon: <span className="text-2xl">📊</span>,
			color: 'bg-teal-100 text-teal-600',
		},
		{
			title: 'Average Exam Mark',
			value: stats.averageExamMark > 0 ? stats.averageExamMark.toFixed(1) : 'N/A',
			description: 'Average exam score',
			icon: <span className="text-2xl">📈</span>,
			color: 'bg-yellow-100 text-yellow-600',
		},
	];

	if (loading) {
		return (
			<>
				<div className="mb-6">
					<h2 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h2>
					<p className="text-gray-600 mt-1">Overview of your teaching activities, classes, and student performance.</p>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-gray-300"></div>
							<div className="animate-pulse">
								<div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
								<div className="h-8 bg-gray-200 rounded w-1/2"></div>
							</div>
						</div>
					))}
				</div>
			</>
		);
	}

	return (
		<>
			<div className="mb-6">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h2 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h2>
						<p className="text-gray-600 mt-1">Overview of your teaching activities, classes, and student performance.</p>
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

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
				{cards.map((card, index) => (
					<StatCard key={index} {...card} />
				))}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
				<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100">
					<h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
					<div className="space-y-3">
						<button
							onClick={() => navigate('/dashboard/attendance')}
							className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-[3px] transition-colors"
						>
							<span className="font-medium text-blue-900">Take Attendance</span>
						</button>
						<button
							onClick={() => navigate('/dashboard/test-marks')}
							className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-[3px] transition-colors"
						>
							<span className="font-medium text-green-900">Enter Test Marks</span>
						</button>
						<button
							onClick={() => navigate('/dashboard/exam-marks')}
							className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-[3px] transition-colors"
						>
							<span className="font-medium text-purple-900">Enter Exam Marks</span>
						</button>
					</div>
				</div>

				<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 md:col-span-2">
					<h3 className="text-lg font-semibold text-gray-800 mb-4">Teaching Schedule</h3>
					<button
						onClick={() => navigate('/dashboard/class-teachers')}
						className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-[3px] transition-colors"
					>
						<span className="font-medium text-gray-900">View My Teaching Schedule</span>
						<p className="text-sm text-gray-600 mt-1">See all your class and subject assignments</p>
					</button>
				</div>
			</div>
		</>
	);
}



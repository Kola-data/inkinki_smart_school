import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import {
	MagnifyingGlassIcon,
	PlusIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon,
	CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import AttendanceForm from '../components/AttendanceForm';
import AttendanceViewModal from '../components/AttendanceViewModal';
import AttendanceFilterModal from '../components/AttendanceFilterModal';

interface AttendanceItem {
	att_id: string;
	school_id: string;
	teacher_id: string;
	std_id: string;
	subj_id: string;
	cls_id: string | null;
	date: string;
	status: string;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
	// Joined fields
	school_name?: string | null;
	teacher_name?: string | null;
	student_name?: string | null;
	subject_name?: string | null;
	class_name?: string | null;
}

interface FilterState {
	search: string;
	status: string;
	dateFrom: string;
	dateTo: string;
	academicYear: string;
}

interface AcademicYearOption {
	academic_id: string;
	academic_name: string;
	start_date: string;
	end_date: string;
	is_current?: boolean;
}

const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'];

export default function AttendanceManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		status: '',
		dateFrom: '',
		dateTo: '',
		academicYear: '',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [showFilters, setShowFilters] = useState(false);

	// Autocomplete states for filter selects
	const [statusFilterQuery, setStatusFilterQuery] = useState('');
	const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
	const [statusFilterHighlightedIndex, setStatusFilterHighlightedIndex] = useState(-1);
	const statusFilterDropdownRef = useRef<HTMLDivElement>(null);
	const statusFilterInputRef = useRef<HTMLInputElement>(null);

	const [academicYearFilterQuery, setAcademicYearFilterQuery] = useState('');
	const [showAcademicYearFilterDropdown, setShowAcademicYearFilterDropdown] = useState(false);
	const [academicYearFilterHighlightedIndex, setAcademicYearFilterHighlightedIndex] = useState(-1);
	const academicYearFilterDropdownRef = useRef<HTMLDivElement>(null);
	const academicYearFilterInputRef = useRef<HTMLInputElement>(null);
	const [availableAcademicYears, setAvailableAcademicYears] = useState<AcademicYearOption[]>([]);

	// Modal states
	const [filterModalOpen, setFilterModalOpen] = useState(false);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [selectedAttendance, setSelectedAttendance] = useState<AttendanceItem | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<AttendanceItem> | null>(null);
	const [formLoading, setFormLoading] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);
	
	// Filter modal data
	const [selectedClassId, setSelectedClassId] = useState<string>('');
	const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
	const [filteredStudents, setFilteredStudents] = useState<any[]>([]);

	// Get school ID and staff ID from logged-in user's staff data
	const schoolId = useMemo(() => {
		const staff = localStorage.getItem('staff');
		if (staff) {
			try {
				const staffData = JSON.parse(staff);
				if (staffData.school_id) {
					return staffData.school_id;
				}
			} catch {
				// Ignore parse errors
			}
		}
		return null;
	}, []);

	const staffId = useMemo(() => {
		const staff = localStorage.getItem('staff');
		if (staff) {
			try {
				const staffData = JSON.parse(staff);
				if (staffData.staff_id) {
					return staffData.staff_id;
				}
			} catch {
				// Ignore parse errors
			}
		}
		return null;
	}, []);

	// Get teacher_id from staff_id
	const [teacherId, setTeacherId] = useState<string | null>(null);
	useEffect(() => {
		const fetchTeacherId = async () => {
			if (!schoolId || !staffId) {
				setTeacherId(null);
				return;
			}

			try {
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/teachers/?school_id=${schoolId}&_t=${timestamp}`);
				const teacher = getArrayFromResponse(data).find((t: any) => t.staff_id === staffId);
				if (teacher) {
					setTeacherId(teacher.teacher_id);
				} else {
					setTeacherId(null);
				}
			} catch (error: any) {setTeacherId(null);
			}
		};

		fetchTeacherId();
	}, [schoolId, staffId]);

	// Filter options based on search queries
	const filteredStatusOptions = ATTENDANCE_STATUSES.filter((status) => {
		if (!statusFilterQuery.trim()) return true;
		return status.toLowerCase().includes(statusFilterQuery.toLowerCase());
	});

	// Fetch academic years for filter
	useEffect(() => {
		const fetchAcademicYears = async () => {
			if (!schoolId) return;

			try {
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/academic-years/?school_id=${schoolId}&_t=${timestamp}`);
				const academicYears: AcademicYearOption[] = getArrayFromResponse(data).map((ay: any) => ({
					academic_id: ay.academic_id,
					academic_name: ay.academic_name,
					start_date: ay.start_date,
					end_date: ay.end_date,
					is_current: ay.is_current || false,
				}));
				setAvailableAcademicYears(academicYears);
			} catch (error: any) {setAvailableAcademicYears([]);
			}
		};

		fetchAcademicYears();
	}, [schoolId]);

	// Filter options based on search queries
	const filteredAcademicYearOptions = availableAcademicYears.filter((ay) => {
		if (!academicYearFilterQuery.trim()) return true;
		return ay.academic_name.toLowerCase().includes(academicYearFilterQuery.toLowerCase());
	});

	// Close filter dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;

			if (
				statusFilterDropdownRef.current &&
				!statusFilterDropdownRef.current.contains(target) &&
				statusFilterInputRef.current &&
				!statusFilterInputRef.current.contains(target)
			) {
				setShowStatusFilterDropdown(false);
			}

			if (
				academicYearFilterDropdownRef.current &&
				!academicYearFilterDropdownRef.current.contains(target) &&
				academicYearFilterInputRef.current &&
				!academicYearFilterInputRef.current.contains(target)
			) {
				setShowAcademicYearFilterDropdown(false);
			}
		};

		if (showStatusFilterDropdown || showAcademicYearFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showStatusFilterDropdown, showAcademicYearFilterDropdown]);

	// Fetch attendance data
	useEffect(() => {
		const fetchAttendance = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const { data } = await api.get(`/attendance/?school_id=${schoolId}`);
				setAttendance(getArrayFromResponse(data));
			} catch (error: any) {
				const errorMessage = error.response?.data?.detail || 'Failed to load attendance';
				toast.error(errorMessage);
				setAttendance([]);
			} finally {
				setLoading(false);
			}
		};

		fetchAttendance();
	}, [schoolId]);

	// Filter and paginate attendance
	const filteredAttendance = useMemo(() => {
		let filtered = attendance.filter((record) => !record.is_deleted);

		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			filtered = filtered.filter(
				(record) =>
					record.student_name?.toLowerCase().includes(searchLower) ||
					record.teacher_name?.toLowerCase().includes(searchLower) ||
					record.subject_name?.toLowerCase().includes(searchLower) ||
					record.class_name?.toLowerCase().includes(searchLower)
			);
		}

		if (filters.status) {
			filtered = filtered.filter((record) => record.status === filters.status);
		}

		if (filters.dateFrom) {
			filtered = filtered.filter((record) => {
				const recordDate = new Date(record.date).toISOString().split('T')[0];
				return recordDate >= filters.dateFrom;
			});
		}

		if (filters.dateTo) {
			filtered = filtered.filter((record) => {
				const recordDate = new Date(record.date).toISOString().split('T')[0];
				return recordDate <= filters.dateTo;
			});
		}

		if (filters.academicYear) {
			const selectedAcademicYear = availableAcademicYears.find(
				(ay) => ay.academic_id === filters.academicYear
			);
			if (selectedAcademicYear) {
				const startDate = new Date(selectedAcademicYear.start_date);
				const endDate = new Date(selectedAcademicYear.end_date);
				// Set end date to end of day
				endDate.setHours(23, 59, 59, 999);

				filtered = filtered.filter((record) => {
					const recordDate = new Date(record.date);
					return recordDate >= startDate && recordDate <= endDate;
				});
			}
		}

		return filtered;
	}, [attendance, filters, availableAcademicYears]);

	// Pagination
	const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedAttendance = useMemo(() => {
		return filteredAttendance.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredAttendance, startIndex, itemsPerPage]);

	// Analytics
	const analytics = useMemo(() => {
		const total = filteredAttendance.length;
		const present = filteredAttendance.filter((record) => record.status === 'present').length;
		const absent = filteredAttendance.filter((record) => record.status === 'absent').length;
		const late = filteredAttendance.filter((record) => record.status === 'late').length;
		const excused = filteredAttendance.filter((record) => record.status === 'excused').length;

		return {
			total,
			present,
			absent,
			late,
			excused,
		};
	}, [filteredAttendance]);

	// Filter handlers
	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const handleClearFilters = () => {
		setFilters({
			search: '',
			status: '',
			dateFrom: '',
			dateTo: '',
			academicYear: '',
		});
		setStatusFilterQuery('');
		setAcademicYearFilterQuery('');
		setCurrentPage(1);
	};

	// Modal handlers
	const handleCreate = () => {
		setSelectedAttendance(null);
		setFormDataToSubmit(null);
		setCreateConfirmOpen(false);
		setFilterModalOpen(true);
	};

	const handleFilterProceed = (classId: string, subjectId: string, students: any[]) => {
		setSelectedClassId(classId);
		setSelectedSubjectId(subjectId);
		setFilteredStudents(students);
		setFilterModalOpen(false);
		setCreateModalOpen(true);
	};

	const handleEdit = (record: AttendanceItem) => {
		setSelectedAttendance(record);
		setFormDataToSubmit(null);
		setUpdateConfirmOpen(false);
		setEditModalOpen(true);
	};

	const handleView = (record: AttendanceItem) => {
		setSelectedAttendance(record);
		setViewModalOpen(true);
	};

	const handleDelete = (record: AttendanceItem) => {
		setSelectedAttendance(record);
		setDeleteConfirmOpen(true);
	};

	// Form submission handlers
	const handleCreateSubmit = async (data: Partial<AttendanceItem> | Partial<AttendanceItem>[]) => {
		setFormDataToSubmit(data as any);
		setCreateModalOpen(false);
		setCreateConfirmOpen(true);
	};

	const handleUpdateSubmit = async (data: Partial<AttendanceItem>) => {
		setFormDataToSubmit(data);
		setEditModalOpen(false);
		setUpdateConfirmOpen(true);
	};

	// Handle Create (after confirmation)
	const handleCreateConfirm = async () => {
		if (!formDataToSubmit || !schoolId) {
			toast.error('Missing required data. Please try again.');
			return;
		}

		try {
			setFormLoading(true);
			
			// Check if it's bulk submission (array)
			const isBulk = Array.isArray(formDataToSubmit);
			
			if (isBulk) {
				// Bulk submission - create multiple attendance records
				const promises = (formDataToSubmit as Partial<AttendanceItem>[]).map((item) => {
					const payload: any = {
						school_id: schoolId,
						teacher_id: item.teacher_id || '',
						std_id: item.std_id || '',
						subj_id: item.subj_id || '',
						cls_id: item.cls_id || null,
						date: item.date || new Date().toISOString(),
						status: item.status || 'present',
					};
					return api.post('/attendance/', payload);
				});

				await Promise.all(promises);
				toast.success(`${formDataToSubmit.length} attendance record(s) created successfully!`);
			} else {
				// Single submission
				const payload: any = {
					school_id: schoolId,
					teacher_id: (formDataToSubmit as Partial<AttendanceItem>).teacher_id || '',
					std_id: (formDataToSubmit as Partial<AttendanceItem>).std_id || '',
					subj_id: (formDataToSubmit as Partial<AttendanceItem>).subj_id || '',
					cls_id: (formDataToSubmit as Partial<AttendanceItem>).cls_id || null,
					date: (formDataToSubmit as Partial<AttendanceItem>).date || new Date().toISOString(),
					status: (formDataToSubmit as Partial<AttendanceItem>).status || 'present',
				};

				await api.post('/attendance/', payload);
				toast.success('Attendance record created successfully!');
			}

			setCreateConfirmOpen(false);
			setCreateModalOpen(false);
			setFormDataToSubmit(null);
			setSelectedClassId('');
			setSelectedSubjectId('');
			setFilteredStudents([]);

			// Refresh attendance
			const { data } = await api.get(`/attendance/?school_id=${schoolId}`);
			setAttendance(getArrayFromResponse(data));
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to create attendance';
			toast.error(errorMessage);
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!formDataToSubmit || !selectedAttendance || !schoolId) {
			toast.error('Missing required data. Please try again.');
			return;
		}

		try {
			setFormLoading(true);
			const payload: any = {
				...formDataToSubmit,
			};

			await api.put(`/attendance/${selectedAttendance.att_id}?school_id=${schoolId}`, payload);
			toast.success('Attendance record updated successfully!');
			setUpdateConfirmOpen(false);
			setEditModalOpen(false);
			setFormDataToSubmit(null);
			setSelectedAttendance(null);

			// Refresh attendance
			const { data } = await api.get(`/attendance/?school_id=${schoolId}`);
			setAttendance(getArrayFromResponse(data));
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || 'Failed to update attendance';
			toast.error(errorMessage);
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDeleteConfirm = async () => {
		if (!selectedAttendance || !schoolId) return;

		try {
			setDeleteLoading(true);
			await api.delete(`/attendance/${selectedAttendance.att_id}?school_id=${schoolId}`);
			toast.success('Attendance record deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedAttendance(null);

			// Refresh attendance
			const { data } = await api.get(`/attendance/?school_id=${schoolId}`);
			setAttendance(getArrayFromResponse(data));
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to delete attendance');
		} finally {
			setDeleteLoading(false);
		}
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	const formatDateTime = (dateString: string | null) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const getStatusBadge = (status: string | null) => {
		if (!status) return null;

		const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
			present: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
			absent: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
			late: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
			excused: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircleIcon },
		};

		const config = statusConfig[status.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: ClockIcon };
		const Icon = config.icon;

		return (
			<span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
				<Icon className="w-3 h-3" />
				{status.charAt(0).toUpperCase() + status.slice(1)}
			</span>
		);
	};

	if (loading) {
		return (
			<div className="flex bg-gray-50 min-h-screen">
				<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:ml-64">
					<Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
					<main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
							<p className="mt-4 text-gray-600">Loading attendance...</p>
						</div>
					</main>
				</div>
			</div>
		);
	}

	if (!schoolId) {
		return (
			<div className="flex bg-gray-50 min-h-screen">
				<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:ml-64">
					<Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
					<main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
						<div className="text-center">
							<p className="text-gray-600">School information not found. Please login again.</p>
						</div>
					</main>
				</div>
			</div>
		);
	}

	return (
		<div className="flex bg-gray-50 min-h-screen">
			<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
			<div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:ml-64">
				<Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
				<main className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
							<p className="text-gray-600 mt-1">Track and manage student attendance records</p>
						</div>
						<button
							onClick={handleCreate}
							className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors font-medium"
						>
							<PlusIcon className="w-5 h-5" />
							<span>Add Attendance</span>
						</button>
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Records</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<CalendarDaysIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-green-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Present</p>
									<p className="text-3xl font-bold text-green-600 mt-2">{analytics.present}</p>
								</div>
								<div className="p-3 bg-green-100 rounded-[3px]">
									<CheckCircleIcon className="w-6 h-6 text-green-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Absent</p>
									<p className="text-3xl font-bold text-red-600 mt-2">{analytics.absent}</p>
								</div>
								<div className="p-3 bg-red-100 rounded-[3px]">
									<XCircleIcon className="w-6 h-6 text-red-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-yellow-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Late</p>
									<p className="text-3xl font-bold text-yellow-600 mt-2">{analytics.late}</p>
								</div>
								<div className="p-3 bg-yellow-100 rounded-[3px]">
									<ClockIcon className="w-6 h-6 text-yellow-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Excused</p>
									<p className="text-3xl font-bold text-blue-600 mt-2">{analytics.excused}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<CheckCircleIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>
					</div>

					{/* Filters and Search */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6">
						<div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
							<div className="flex-1 w-full lg:w-auto">
								<input
									type="text"
									placeholder="Search by student, teacher, subject, or class..."
									value={filters.search}
									onChange={(e) => handleFilterChange('search', e.target.value)}
									className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
								/>
							</div>
							<div className="flex items-center gap-3 flex-wrap">
								<div className="flex items-center gap-2">
									<label className="text-sm text-gray-700 whitespace-nowrap">Show:</label>
									<select
										value={itemsPerPage}
										onChange={(e) => {
											setItemsPerPage(Number(e.target.value));
											setCurrentPage(1);
										}}
										className="px-3 py-2 border border-gray-300 rounded-[3px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
									>
										<option value={5}>5</option>
										<option value={10}>10</option>
										<option value={20}>20</option>
										<option value={50}>50</option>
										<option value={100}>100</option>
									</select>
									<span className="text-sm text-gray-700 whitespace-nowrap">records</span>
								</div>
								<button
									onClick={() => setShowFilters(!showFilters)}
									className={`px-4 py-2.5 rounded-[3px] font-medium transition-all duration-200 flex items-center gap-2 ${
										showFilters
											? 'bg-primary-600 text-white'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
									}`}
								>
									<MagnifyingGlassIcon className="w-5 h-5" />
									<span>Filters</span>
								</button>
								{(filters.status || filters.dateFrom || filters.dateTo || filters.academicYear) && (
									<button
										onClick={handleClearFilters}
										className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[3px] font-medium transition-all duration-200"
									>
										Clear
									</button>
								)}
							</div>
						</div>

						{/* Advanced Filters */}
						{showFilters && (
							<div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
								{/* Status Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
									<div className="relative">
										<input
											ref={statusFilterInputRef}
											type="text"
											value={filters.status || statusFilterQuery}
											onChange={(e) => {
												setStatusFilterQuery(e.target.value);
												setShowStatusFilterDropdown(true);
												setStatusFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowStatusFilterDropdown(false);
													handleFilterChange('status', '');
												}
											}}
											onFocus={() => {
												if (filteredStatusOptions.length > 0) {
													setShowStatusFilterDropdown(true);
												}
												setStatusFilterQuery('');
											}}
											placeholder="All Statuses"
											className="w-full px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
										/>
										{showStatusFilterDropdown && filteredStatusOptions.length > 0 && (
											<div
												ref={statusFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('status', '');
														setStatusFilterQuery('');
														setShowStatusFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Statuses</div>
												</button>
												{filteredStatusOptions.map((status, index) => (
													<button
														key={status}
														type="button"
														onClick={() => {
															handleFilterChange('status', status);
															setStatusFilterQuery(status);
															setShowStatusFilterDropdown(false);
														}}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															filters.status === status ? 'bg-primary-100 font-medium' : ''
														}`}
													>
														<div className="text-sm font-medium text-gray-900">{status.charAt(0).toUpperCase() + status.slice(1)}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								{/* Date From Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
									<input
										type="date"
										value={filters.dateFrom}
										onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
										className="w-full px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
									/>
								</div>

								{/* Date To Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
									<input
										type="date"
										value={filters.dateTo}
										onChange={(e) => handleFilterChange('dateTo', e.target.value)}
										className="w-full px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
									/>
								</div>

								{/* Academic Year Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
									<div className="relative">
										<input
											ref={academicYearFilterInputRef}
											type="text"
											value={
												filters.academicYear
													? availableAcademicYears.find((ay) => ay.academic_id === filters.academicYear)?.academic_name || academicYearFilterQuery
													: academicYearFilterQuery
											}
											onChange={(e) => {
												setAcademicYearFilterQuery(e.target.value);
												setShowAcademicYearFilterDropdown(true);
												setAcademicYearFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowAcademicYearFilterDropdown(false);
													handleFilterChange('academicYear', '');
												}
											}}
											onFocus={() => {
												if (filteredAcademicYearOptions.length > 0) {
													setShowAcademicYearFilterDropdown(true);
												}
												setAcademicYearFilterQuery('');
											}}
											placeholder="All Academic Years"
											className="w-full px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
										/>
										{showAcademicYearFilterDropdown && filteredAcademicYearOptions.length > 0 && (
											<div
												ref={academicYearFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('academicYear', '');
														setAcademicYearFilterQuery('');
														setShowAcademicYearFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Academic Years</div>
												</button>
												{filteredAcademicYearOptions.map((academicYear, index) => (
													<button
														key={academicYear.academic_id}
														type="button"
														onClick={() => {
															handleFilterChange('academicYear', academicYear.academic_id);
															setAcademicYearFilterQuery(academicYear.academic_name);
															setShowAcademicYearFilterDropdown(false);
														}}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															filters.academicYear === academicYear.academic_id ? 'bg-primary-100 font-medium' : ''
														}`}
													>
														<div className="text-sm font-medium text-gray-900">{academicYear.academic_name}</div>
														{academicYear.is_current && (
															<div className="text-xs text-primary-600">Current</div>
														)}
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Attendance Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Student
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Teacher
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Subject
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Class
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Date
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Status
										</th>
										<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{loading ? (
										<tr>
											<td colSpan={7} className="px-6 py-8 text-center">
												<div className="flex items-center justify-center">
													<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
												</div>
											</td>
										</tr>
									) : paginatedAttendance.length === 0 ? (
										<tr>
											<td colSpan={7} className="px-6 py-8 text-center">
												<div className="flex flex-col items-center justify-center gap-3">
													<CalendarDaysIcon className="w-12 h-12 text-gray-400" />
													<p className="text-gray-500 font-medium">No attendance records found</p>
												</div>
											</td>
										</tr>
									) : (
										paginatedAttendance.map((record) => (
											<tr key={record.att_id} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">{record.student_name || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">{record.teacher_name || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">{record.subject_name || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">{record.class_name || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">{formatDateTime(record.date)}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record.status)}</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex items-center justify-end gap-2">
														<button
															onClick={() => handleView(record)}
															className="text-primary-600 hover:text-primary-900 p-1"
															title="View"
														>
															<EyeIcon className="w-5 h-5" />
														</button>
														<button
															onClick={() => handleEdit(record)}
															className="text-blue-600 hover:text-blue-900 p-1"
															title="Edit"
														>
															<PencilIcon className="w-5 h-5" />
														</button>
														<button
															onClick={() => handleDelete(record)}
															className="text-red-600 hover:text-red-900 p-1"
															title="Delete"
														>
															<TrashIcon className="w-5 h-5" />
														</button>
													</div>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
								<div className="flex items-center gap-4">
									<span className="text-sm text-gray-700">
										Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAttendance.length)} of{' '}
										{filteredAttendance.length} records
									</span>
									<select
										value={itemsPerPage}
										onChange={(e) => {
											setItemsPerPage(Number(e.target.value));
											setCurrentPage(1);
										}}
										className="border border-gray-300 rounded-[3px] px-3 py-1 text-sm"
									>
										<option value={10}>10 per page</option>
										<option value={25}>25 per page</option>
										<option value={50}>50 per page</option>
										<option value={100}>100 per page</option>
									</select>
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
										disabled={currentPage === 1}
										className="px-3 py-1 border border-gray-300 rounded-[3px] text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
									>
										Previous
									</button>
									<span className="text-sm text-gray-700">
										Page {currentPage} of {totalPages}
									</span>
									<button
										onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
										disabled={currentPage === totalPages}
										className="px-3 py-1 border border-gray-300 rounded-[3px] text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
									>
										Next
									</button>
								</div>
							</div>
						)}
					</div>
				</main>
			</div>

			{/* Modals */}
			<AttendanceFilterModal
				isOpen={filterModalOpen}
				onClose={() => {
					setFilterModalOpen(false);
					setSelectedClassId('');
					setSelectedSubjectId('');
					setFilteredStudents([]);
				}}
				onProceed={handleFilterProceed}
				schoolId={schoolId || ''}
				teacherId={teacherId}
			/>

			<Modal isOpen={createModalOpen} onClose={() => {
				setCreateModalOpen(false);
				setFormDataToSubmit(null);
				setCreateConfirmOpen(false);
				setSelectedClassId('');
				setSelectedSubjectId('');
				setFilteredStudents([]);
			}} title="Mark Attendance" size="xl">
				<AttendanceForm
					attendance={null}
					onSubmit={handleCreateSubmit}
					onCancel={() => {
						setCreateModalOpen(false);
						setFormDataToSubmit(null);
						setCreateConfirmOpen(false);
						setSelectedClassId('');
						setSelectedSubjectId('');
						setFilteredStudents([]);
					}}
					loading={formLoading}
					mode="create"
					schoolId={schoolId || ''}
					preselectedClassId={selectedClassId}
					preselectedSubjectId={selectedSubjectId}
					preselectedTeacherId={teacherId}
					preselectedStudents={filteredStudents}
				/>
			</Modal>

			<Modal isOpen={editModalOpen} onClose={() => {
				setEditModalOpen(false);
				setFormDataToSubmit(null);
				setUpdateConfirmOpen(false);
			}} title="Edit Attendance" size="xl">
				<AttendanceForm
					attendance={selectedAttendance}
					onSubmit={handleUpdateSubmit}
					onCancel={() => {
						setEditModalOpen(false);
						setFormDataToSubmit(null);
						setUpdateConfirmOpen(false);
					}}
					loading={formLoading}
					mode="edit"
					schoolId={schoolId || ''}
				/>
			</Modal>

			<AttendanceViewModal
				attendance={selectedAttendance}
				isOpen={viewModalOpen}
				onClose={() => setViewModalOpen(false)}
				onEdit={() => {
					setViewModalOpen(false);
					handleEdit(selectedAttendance!);
				}}
				onDelete={() => {
					setViewModalOpen(false);
					handleDelete(selectedAttendance!);
				}}
			/>

			<ConfirmModal
				isOpen={createConfirmOpen}
				onClose={() => {
					if (!formLoading) {
						setCreateConfirmOpen(false);
						setFormDataToSubmit(null);
						setCreateModalOpen(true);
					}
				}}
				onConfirm={handleCreateConfirm}
				title="Create Attendance"
				message={
					Array.isArray(formDataToSubmit)
						? `Are you sure you want to create ${formDataToSubmit.length} attendance record(s)?`
						: `Are you sure you want to create this attendance record?`
				}
				confirmText="Create"
				cancelText="Cancel"
				type="info"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={updateConfirmOpen}
				onClose={() => {
					if (!formLoading) {
						setUpdateConfirmOpen(false);
						setFormDataToSubmit(null);
						setEditModalOpen(true);
					}
				}}
				onConfirm={handleUpdateConfirm}
				title="Update Attendance"
				message={`Are you sure you want to update this attendance record?`}
				confirmText="Update"
				cancelText="Cancel"
				type="warning"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={deleteConfirmOpen}
				onClose={() => {
					setDeleteConfirmOpen(false);
					setSelectedAttendance(null);
				}}
				onConfirm={handleDeleteConfirm}
				title="Delete Attendance"
				message={`Are you sure you want to delete this attendance record? This action cannot be undone.`}
				confirmText="Delete"
				cancelText="Cancel"
				type="danger"
				loading={deleteLoading}
			/>
		</div>
	);
}


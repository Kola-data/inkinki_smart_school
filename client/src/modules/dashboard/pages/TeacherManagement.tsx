import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import {
	AcademicCapIcon,
	CheckCircleIcon,
	PauseCircleIcon,
	SparklesIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import TeacherForm from '../components/TeacherForm';
import TeacherViewModal from '../components/TeacherViewModal';

interface TeacherMember {
	teacher_id: string;
	staff_id: string;
	specialized: string | null;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
	staff_name: string | null;
	staff_email: string | null;
	staff_role: string | null;
	staff_profile: string | null;
}

interface StaffMember {
	staff_id: string;
	staff_name: string;
	email: string;
	staff_role: string | null;
}

interface FilterState {
	search: string;
	specialized: string;
	status: string;
}

export default function TeacherManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [teachers, setTeachers] = useState<TeacherMember[]>([]);
	const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		specialized: '',
		status: '',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [showFilters, setShowFilters] = useState(false);
	const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);
	const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);

	// Autocomplete states for filter selects
	const [specializationFilterQuery, setSpecializationFilterQuery] = useState('');
	const [showSpecializationFilterDropdown, setShowSpecializationFilterDropdown] = useState(false);
	const [specializationFilterHighlightedIndex, setSpecializationFilterHighlightedIndex] = useState(-1);
	const specializationFilterDropdownRef = useRef<HTMLDivElement>(null);
	const specializationFilterInputRef = useRef<HTMLInputElement>(null);

	const [statusFilterQuery, setStatusFilterQuery] = useState('');
	const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
	const [statusFilterHighlightedIndex, setStatusFilterHighlightedIndex] = useState(-1);
	const statusFilterDropdownRef = useRef<HTMLDivElement>(null);
	const statusFilterInputRef = useRef<HTMLInputElement>(null);

	const statusOptions = ['active', 'inactive'];

	// Close filter dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				specializationFilterDropdownRef.current &&
				!specializationFilterDropdownRef.current.contains(event.target as Node) &&
				specializationFilterInputRef.current &&
				!specializationFilterInputRef.current.contains(event.target as Node)
			) {
				setShowSpecializationFilterDropdown(false);
			}
			if (
				statusFilterDropdownRef.current &&
				!statusFilterDropdownRef.current.contains(event.target as Node) &&
				statusFilterInputRef.current &&
				!statusFilterInputRef.current.contains(event.target as Node)
			) {
				setShowStatusFilterDropdown(false);
			}
		};

		if (showSpecializationFilterDropdown || showStatusFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showSpecializationFilterDropdown, showStatusFilterDropdown]);

	// Modal states
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [selectedTeacher, setSelectedTeacher] = useState<TeacherMember | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<TeacherMember> | null>(null);
	const [formLoading, setFormLoading] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

	// Get school ID from logged-in user's staff data
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

	// Fetch teachers data using school_id from logged-in user
	useEffect(() => {
		const fetchTeachers = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/teachers/?school_id=${schoolId}&_t=${timestamp}`);
				setTeachers(getArrayFromResponse(data));
			} catch (error: any) {
				const errorMessage = error.response?.data?.detail || 'Failed to fetch teachers';
				if (error.response?.status !== 403) {
					toast.error(errorMessage);
				}} finally {
				setLoading(false);
			}
		};

		fetchTeachers();
	}, [schoolId]);

	// Fetch available staff members (who don't have teacher records)
	useEffect(() => {
		const fetchAvailableStaff = async () => {
			if (!schoolId) return;

			try {
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/staff/?school_id=${schoolId}&_t=${timestamp}`);
				const allStaff = getArrayFromResponse(data);
				// Get staff IDs that are already teachers
				const teacherStaffIds = new Set(teachers.map(t => t.staff_id));
				// Filter out staff who already have teacher records
				const available = allStaff.filter((s: StaffMember) => !teacherStaffIds.has(s.staff_id));
				setAvailableStaff(available);
			} catch (error: any) {setAvailableStaff([]);
			}
		};

		if (schoolId && !loading) {
			fetchAvailableStaff();
		}
	}, [schoolId, teachers, loading]);

	// Also fetch when create modal opens
	useEffect(() => {
		const fetchAvailableStaff = async () => {
			if (!schoolId || !createModalOpen) return;

			try {
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/staff/?school_id=${schoolId}&_t=${timestamp}`);
				const allStaff = getArrayFromResponse(data);
				// Get staff IDs that are already teachers
				const teacherStaffIds = new Set(teachers.map(t => t.staff_id));
				// Filter out staff who already have teacher records
				const available = allStaff.filter((s: StaffMember) => !teacherStaffIds.has(s.staff_id));
				setAvailableStaff(available);
			} catch (error: any) {setAvailableStaff([]);
			}
		};

		if (createModalOpen && schoolId) {
			fetchAvailableStaff();
		}
	}, [createModalOpen, schoolId, teachers]);

	// Filtered teachers
	const filteredTeachers = useMemo(() => {
		return teachers.filter((teacher) => {
			const matchesSearch = !filters.search || 
				(teacher.staff_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				teacher.staff_email?.toLowerCase().includes(filters.search.toLowerCase()) ||
				teacher.specialized?.toLowerCase().includes(filters.search.toLowerCase()));
			
			const matchesSpecialized = !filters.specialized || teacher.specialized === filters.specialized;
			
			const matchesStatus = !filters.status || 
				(filters.status === 'active' && teacher.is_active) ||
				(filters.status === 'inactive' && !teacher.is_active);
			
			return matchesSearch && matchesSpecialized && matchesStatus;
		});
	}, [teachers, filters]);

	// Pagination
	const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedTeachers = useMemo(() => {
		return filteredTeachers.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredTeachers, startIndex, itemsPerPage]);

	// Analytics
	const analytics = useMemo(() => {
		return {
			total: filteredTeachers.length,
			active: filteredTeachers.filter(t => t.is_active).length,
			inactive: filteredTeachers.filter(t => !t.is_active).length,
			specializations: filteredTeachers.reduce((acc: Record<string, number>, teacher) => {
				const spec = teacher.specialized || 'Not specified';
				acc[spec] = (acc[spec] || 0) + 1;
				return acc;
			}, {}),
		};
	}, [filteredTeachers]);

	// Unique specializations for filter
	const uniqueSpecializations = useMemo(() => {
		const specs = teachers
			.map(t => t.specialized)
			.filter((spec): spec is string => spec !== null && spec !== '');
		return Array.from(new Set(specs)).sort();
	}, [teachers]);

	// Filter specializations based on search query
	const filteredSpecializations = useMemo(() => {
		if (!specializationFilterQuery.trim()) return uniqueSpecializations;
		const query = specializationFilterQuery.toLowerCase();
		return uniqueSpecializations.filter((spec) => spec.toLowerCase().includes(query));
	}, [uniqueSpecializations, specializationFilterQuery]);

	const filteredStatusOptions = statusOptions.filter((status) => {
		if (!statusFilterQuery.trim()) return true;
		return status.toLowerCase().includes(statusFilterQuery.toLowerCase());
	});

	// Handle filter changes
	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters(prev => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const resetFilters = () => {
		setFilters({ search: '', specialized: '', status: '' });
		setSpecializationFilterQuery('');
		setStatusFilterQuery('');
		setCurrentPage(1);
	};

	const handleSpecializationFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showSpecializationFilterDropdown || filteredSpecializations.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setSpecializationFilterHighlightedIndex((prev) => (prev < filteredSpecializations.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setSpecializationFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (specializationFilterHighlightedIndex >= 0 && specializationFilterHighlightedIndex < filteredSpecializations.length) {
					const selectedSpec = filteredSpecializations[specializationFilterHighlightedIndex];
					handleFilterChange('specialized', selectedSpec);
					setSpecializationFilterQuery(selectedSpec);
					setShowSpecializationFilterDropdown(false);
				} else if (specializationFilterHighlightedIndex === -1 && filteredSpecializations.length === 1) {
					const selectedSpec = filteredSpecializations[0];
					handleFilterChange('specialized', selectedSpec);
					setSpecializationFilterQuery(selectedSpec);
					setShowSpecializationFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowSpecializationFilterDropdown(false);
				setSpecializationFilterHighlightedIndex(-1);
				break;
		}
	};

	const handleStatusFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showStatusFilterDropdown || filteredStatusOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setStatusFilterHighlightedIndex((prev) => (prev < filteredStatusOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setStatusFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (statusFilterHighlightedIndex >= 0 && statusFilterHighlightedIndex < filteredStatusOptions.length) {
					const selectedStatus = filteredStatusOptions[statusFilterHighlightedIndex];
					handleFilterChange('status', selectedStatus);
					setStatusFilterQuery(selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1));
					setShowStatusFilterDropdown(false);
				} else if (statusFilterHighlightedIndex === -1 && filteredStatusOptions.length === 1) {
					const selectedStatus = filteredStatusOptions[0];
					handleFilterChange('status', selectedStatus);
					setStatusFilterQuery(selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1));
					setShowStatusFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowStatusFilterDropdown(false);
				setStatusFilterHighlightedIndex(-1);
				break;
		}
	};

	// Format date
	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	const toggleSidebar = () => {
		setSidebarOpen(!sidebarOpen);
	};

	// Get profile image URL helper
	const getProfileImageUrl = (profilePath: string | null): string | null => {
		if (!profilePath) return null;
		return `http://localhost:8000/${profilePath}`;
	};

	// Refresh teachers data with cache busting
	const refreshTeachers = async () => {
		if (!schoolId) {
			console.warn('Cannot refresh teachers: schoolId is missing');
			return;
		}

		try {
			const timestamp = new Date().getTime();
			const { data } = await api.get(`/teachers/?school_id=${schoolId}&_t=${timestamp}`);
			
			// Handle paginated response
			let newTeachersData: TeacherMember[] = [];
			if (data && Array.isArray(data.items)) {
				newTeachersData = data.items;
			} else if (Array.isArray(data)) {
				newTeachersData = data;
			} else {
				newTeachersData = getArrayFromResponse(data);
			}
			
			// Force state update by creating a new array reference
			setTeachers([...newTeachersData]);
			setCurrentPage(1);
		} catch (error: any) {
			console.error('Refresh teachers error:', error);
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to refresh teachers data';
			toast.error(errorMessage);
		}
	};

	// Handle Create (form submission - shows confirm)
	const handleCreateSubmit = async (formData: Partial<TeacherMember>) => {
		setFormDataToSubmit(formData);
		setCreateModalOpen(false);
		setCreateConfirmOpen(true);
	};

	// Handle Create (after confirmation)
	const handleCreateConfirm = async () => {
		if (!schoolId || !formDataToSubmit) {
			toast.error('School information not found');
			return;
		}

		setFormLoading(true);
		try {
			await api.post(`/teachers/?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Teacher created successfully!');
			setCreateConfirmOpen(false);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshTeachers();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to create teacher');
			}
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Update (form submission - shows confirm)
	const handleUpdateSubmit = async (formData: Partial<TeacherMember>) => {
		setFormDataToSubmit(formData);
		setEditModalOpen(false);
		setUpdateConfirmOpen(true);
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!selectedTeacher || !schoolId || !formDataToSubmit) return;

		setFormLoading(true);
		try {
			await api.put(`/teachers/${selectedTeacher.teacher_id}?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Teacher updated successfully!');
			setUpdateConfirmOpen(false);
			setSelectedTeacher(null);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshTeachers();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to update teacher');
			}
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDelete = async () => {
		if (!selectedTeacher || !schoolId) return;

		setDeleteLoading(true);
		try {
			await api.delete(`/teachers/${selectedTeacher.teacher_id}?school_id=${schoolId}`);
			toast.success('Teacher deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedTeacher(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshTeachers();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to delete teacher');
			}
		} finally {
			setDeleteLoading(false);
		}
	};

	// Handle Status Update
	const handleStatusUpdate = async (teacherId: string, newStatus: boolean) => {
		if (!schoolId) return;

		setStatusUpdateLoading(teacherId);
		setStatusDropdownOpen(null);
		try {const response = await api.put(`/teachers/${teacherId}?school_id=${schoolId}`, {
				is_active: newStatus,
			});			toast.success(`Teacher ${newStatus ? 'activated' : 'deactivated'} successfully!`);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshTeachers();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to update teacher status');
			}
		} finally {
			setStatusUpdateLoading(null);
		}
	};

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (statusDropdownOpen && !target.closest('[data-status-dropdown]')) {
				setStatusDropdownOpen(null);
			}
		};

		if (statusDropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [statusDropdownOpen]);

	// Open modals
	const openViewModal = (teacher: TeacherMember) => {
		setSelectedTeacher(teacher);
		setViewModalOpen(true);
	};

	const openEditModal = (teacher: TeacherMember) => {
		setSelectedTeacher(teacher);
		setViewModalOpen(false);
		setEditModalOpen(true);
	};

	const openDeleteConfirm = (teacher: TeacherMember) => {
		setSelectedTeacher(teacher);
		setViewModalOpen(false);
		setDeleteConfirmOpen(true);
	};

	const openCreateModal = () => {
		setSelectedTeacher(null);
		setCreateModalOpen(true);
	};

	if (loading) {
		return (
			<div className="flex bg-gray-50 min-h-screen">
				<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:ml-64">
					<Topbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
					<main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
							<p className="mt-4 text-gray-600">Loading teachers...</p>
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
					<Topbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
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
				<Topbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
				<main className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Teacher Management</h1>
							<p className="text-gray-600 mt-1">Manage your school teachers</p>
						</div>
						<button
							onClick={openCreateModal}
							className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-[3px] shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
						>
							<PlusIcon className="w-5 h-5" />
							<span>Add Teacher</span>
						</button>
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Teachers</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<AcademicCapIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-green-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Active</p>
									<p className="text-3xl font-bold text-green-600 mt-2">{analytics.active}</p>
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
									<p className="text-sm font-medium text-gray-600">Inactive</p>
									<p className="text-3xl font-bold text-red-600 mt-2">{analytics.inactive}</p>
								</div>
								<div className="p-3 bg-red-100 rounded-[3px]">
									<PauseCircleIcon className="w-6 h-6 text-red-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-purple-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Specializations</p>
									<p className="text-3xl font-bold text-purple-600 mt-2">{Object.keys(analytics.specializations).length}</p>
								</div>
								<div className="p-3 bg-purple-100 rounded-[3px]">
									<SparklesIcon className="w-6 h-6 text-purple-600" />
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
									placeholder="Search by name, email, or specialization..."
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
								{(filters.specialized || filters.status) && (
									<button
										onClick={resetFilters}
										className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[3px] font-medium transition-all duration-200"
									>
										Clear
									</button>
								)}
							</div>
						</div>

						{/* Advanced Filters */}
						{showFilters && (
							<div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
									<div className="relative">
										<input
											ref={specializationFilterInputRef}
											type="text"
											value={filters.specialized || specializationFilterQuery}
											onChange={(e) => {
												setSpecializationFilterQuery(e.target.value);
												setShowSpecializationFilterDropdown(true);
												setSpecializationFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowSpecializationFilterDropdown(false);
													handleFilterChange('specialized', '');
												}
											}}
											onFocus={() => {
												if (filteredSpecializations.length > 0) {
													setShowSpecializationFilterDropdown(true);
												}
											}}
											onKeyDown={handleSpecializationFilterKeyDown}
											placeholder="All Specializations"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showSpecializationFilterDropdown && filteredSpecializations.length > 0 && (
											<div
												ref={specializationFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('specialized', '');
														setSpecializationFilterQuery('');
														setShowSpecializationFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Specializations</div>
												</button>
												{filteredSpecializations.map((spec, index) => (
													<button
														key={spec}
														type="button"
														onClick={() => {
															handleFilterChange('specialized', spec);
															setSpecializationFilterQuery(spec);
															setShowSpecializationFilterDropdown(false);
														}}
														onMouseEnter={() => setSpecializationFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === specializationFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.specialized === spec ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">{spec}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
									<div className="relative">
										<input
											ref={statusFilterInputRef}
											type="text"
											value={filters.status ? filters.status.charAt(0).toUpperCase() + filters.status.slice(1) : statusFilterQuery}
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
											}}
											onKeyDown={handleStatusFilterKeyDown}
											placeholder="All Status"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
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
													<div className="text-sm font-medium text-gray-900">All Status</div>
												</button>
												{filteredStatusOptions.map((status, index) => (
													<button
														key={status}
														type="button"
														onClick={() => {
															handleFilterChange('status', status);
															setStatusFilterQuery(status.charAt(0).toUpperCase() + status.slice(1));
															setShowStatusFilterDropdown(false);
														}}
														onMouseEnter={() => setStatusFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === statusFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.status === status ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900 capitalize">{status}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Teachers Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Teacher
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Role
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Specialization
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Status
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Joined
										</th>
										<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{paginatedTeachers.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-6 py-12 text-center">
												<div className="flex flex-col items-center gap-3">
													<AcademicCapIcon className="w-12 h-12 text-gray-400" />
													<p className="text-gray-500 font-medium">No teachers found</p>
													<p className="text-sm text-gray-400">Try adjusting your filters</p>
												</div>
											</td>
										</tr>
									) : (
										paginatedTeachers.map((teacher) => {
											const profileUrl = getProfileImageUrl(teacher.staff_profile);
											
											return (
												<tr key={teacher.teacher_id} className="hover:bg-gray-50 transition-colors">
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="flex items-center gap-3">
															<div className="flex-shrink-0 relative">
																{profileUrl ? (
																	<>
																		<img
																			src={profileUrl}
																			alt={teacher.staff_name || 'Teacher'}
																			className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
																			onError={(e) => {
																				const target = e.target as HTMLImageElement;
																				target.style.display = 'none';
																				const fallback = target.nextElementSibling as HTMLElement;
																				if (fallback) {
																					fallback.style.display = 'grid';
																				}
																			}}
																		/>
																		<div 
																			className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center text-white font-semibold text-sm absolute top-0 left-0"
																			style={{ display: 'none' }}
																		>
																			{teacher.staff_name
																				? teacher.staff_name
																						.split(' ')
																						.map((n) => n[0])
																						.join('')
																						.toUpperCase()
																						.slice(0, 2)
																				: 'TE'}
																		</div>
																	</>
																) : (
																	<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center text-white font-semibold text-sm">
																		{teacher.staff_name
																			? teacher.staff_name
																					.split(' ')
																					.map((n) => n[0])
																					.join('')
																					.toUpperCase()
																					.slice(0, 2)
																			: 'TE'}
																	</div>
																)}
															</div>
															<div>
																<div className="text-sm font-semibold text-gray-900">{teacher.staff_name || 'N/A'}</div>
															</div>
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														{teacher.staff_role ? (
															<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium bg-gray-100 text-gray-800 capitalize">
																{teacher.staff_role.toLowerCase()}
															</span>
														) : (
															<span className="text-sm text-gray-500">N/A</span>
														)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														{teacher.specialized ? (
															<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium bg-blue-100 text-blue-800">
																{teacher.specialized}
															</span>
														) : (
															<span className="text-sm text-gray-500">Not specified</span>
														)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="relative inline-block" data-status-dropdown>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	setStatusDropdownOpen(statusDropdownOpen === teacher.teacher_id ? null : teacher.teacher_id);
																}}
																disabled={statusUpdateLoading === teacher.teacher_id}
																className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium cursor-pointer transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${
																	teacher.is_active
																		? 'bg-green-100 text-green-800'
																		: 'bg-red-100 text-red-800'
																}`}
															>
																{statusUpdateLoading === teacher.teacher_id ? (
																	<>
																		<svg className="animate-spin -ml-1 mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
																			<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
																			<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
																		</svg>
																		Updating...
																	</>
																) : (
																	<>
																		<span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
																			teacher.is_active ? 'bg-green-500' : 'bg-red-500'
																		}`}></span>
																		{teacher.is_active ? 'Active' : 'Inactive'}
																		<svg className="ml-1.5 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
																		</svg>
																	</>
																)}
															</button>
															
															{statusDropdownOpen === teacher.teacher_id && (
																<div className="absolute left-0 mt-1 w-32 bg-white rounded-[3px] shadow-lg border border-gray-200 z-50 py-1">
																	<button
																		onClick={(e) => {
																			e.stopPropagation();
																			handleStatusUpdate(teacher.teacher_id, true);
																		}}
																		disabled={teacher.is_active || statusUpdateLoading === teacher.teacher_id}
																		className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
																			teacher.is_active
																				? 'bg-green-50 text-green-700 font-medium cursor-default'
																				: 'text-gray-700 hover:bg-gray-50 cursor-pointer'
																		} disabled:opacity-50 disabled:cursor-not-allowed`}
																	>
																		<span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
																		Active
																	</button>
																	<button
																		onClick={(e) => {
																			e.stopPropagation();
																			handleStatusUpdate(teacher.teacher_id, false);
																		}}
																		disabled={!teacher.is_active || statusUpdateLoading === teacher.teacher_id}
																		className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
																			!teacher.is_active
																				? 'bg-red-50 text-red-700 font-medium cursor-default'
																				: 'text-gray-700 hover:bg-gray-50 cursor-pointer'
																		} disabled:opacity-50 disabled:cursor-not-allowed`}
																	>
																		<span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
																		Inactive
																	</button>
																</div>
															)}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{formatDate(teacher.created_at)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
														<div className="flex items-center justify-end gap-2">
															<button
																onClick={() => openViewModal(teacher)}
																className="p-2 text-blue-600 hover:bg-blue-50 rounded-[3px] transition-colors"
																title="View"
															>
																<EyeIcon className="w-5 h-5" />
															</button>
															<button
																onClick={() => openEditModal(teacher)}
																className="p-2 text-green-600 hover:bg-green-50 rounded-[3px] transition-colors"
																title="Edit"
															>
																<PencilIcon className="w-5 h-5" />
															</button>
															<button
																onClick={() => openDeleteConfirm(teacher)}
																className="p-2 text-red-600 hover:bg-red-50 rounded-[3px] transition-colors"
																title="Delete"
															>
																<TrashIcon className="w-5 h-5" />
															</button>
														</div>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
								<div className="flex items-center gap-2">
									<button
										onClick={() => setCurrentPage(1)}
										disabled={currentPage === 1}
										className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										««
									</button>
									<button
										onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
										disabled={currentPage === 1}
										className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										‹
									</button>
									<span className="px-4 py-1.5 text-sm font-medium text-gray-700">
										Page {currentPage} of {totalPages}
									</span>
									<button
										onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
										disabled={currentPage === totalPages}
										className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										›
									</button>
									<button
										onClick={() => setCurrentPage(totalPages)}
										disabled={currentPage === totalPages}
										className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										»»
									</button>
								</div>
							</div>
						)}

						{/* Results count */}
						<div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
							<p className="text-sm text-gray-600">
								Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTeachers.length)} of{' '}
								{filteredTeachers.length} results
							</p>
						</div>
					</div>
				</main>
			</div>

			{/* Create Modal */}
			{createModalOpen && (
				<Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add New Teacher" size="xl">
					<TeacherForm
						teacher={null}
						onSubmit={handleCreateSubmit}
						onCancel={() => setCreateModalOpen(false)}
						loading={formLoading}
						mode="create"
						availableStaff={availableStaff}
					/>
				</Modal>
			)}

			{/* Edit Modal */}
			{editModalOpen && selectedTeacher && (
				<Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Teacher" size="xl">
					<TeacherForm
						teacher={selectedTeacher}
						onSubmit={handleUpdateSubmit}
						onCancel={() => setEditModalOpen(false)}
						loading={formLoading}
						mode="edit"
						availableStaff={availableStaff}
					/>
				</Modal>
			)}

			{/* View Modal */}
			{viewModalOpen && selectedTeacher && (
				<TeacherViewModal
					teacher={selectedTeacher}
					isOpen={viewModalOpen}
					onClose={() => setViewModalOpen(false)}
					onEdit={() => {
						setViewModalOpen(false);
						setEditModalOpen(true);
					}}
					onDelete={() => {
						setViewModalOpen(false);
						setDeleteConfirmOpen(true);
					}}
				/>
			)}

			{/* Delete Confirmation Modal */}
			<ConfirmModal
				isOpen={deleteConfirmOpen}
				onClose={() => {
					setDeleteConfirmOpen(false);
					setSelectedTeacher(null);
				}}
				onConfirm={handleDelete}
				title="Delete Teacher"
				message={`Are you sure you want to delete ${selectedTeacher?.staff_name || 'this teacher'}? This action cannot be undone.`}
				confirmText="Delete"
				cancelText="Cancel"
				type="danger"
				loading={deleteLoading}
			/>

			{/* Create Confirmation Modal */}
			<ConfirmModal
				isOpen={createConfirmOpen}
				onClose={() => {
					setCreateConfirmOpen(false);
					setFormDataToSubmit(null);
				}}
				onConfirm={handleCreateConfirm}
				title="Confirm Create Teacher"
				message="Are you sure you want to create this teacher?"
				confirmText="Create"
				cancelText="Cancel"
				type="info"
				loading={formLoading}
			/>

			{/* Update Confirmation Modal */}
			<ConfirmModal
				isOpen={updateConfirmOpen}
				onClose={() => {
					setUpdateConfirmOpen(false);
					setFormDataToSubmit(null);
				}}
				onConfirm={handleUpdateConfirm}
				title="Confirm Update Teacher"
				message="Are you sure you want to update this teacher?"
				confirmText="Update"
				cancelText="Cancel"
				type="info"
				loading={formLoading}
			/>
		</div>
	);
}


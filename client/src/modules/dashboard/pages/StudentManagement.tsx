import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
	UserIcon,
	MagnifyingGlassIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
	AcademicCapIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import StudentForm from '../components/StudentForm';
import StudentViewModal from '../components/StudentViewModal';
import { isTeacher, isAccountant } from '../../../utils/rolePermissions';
import { getArrayFromResponse } from '../../../utils/apiHelpers';

interface StudentMember {
	std_id: string;
	par_id: string;
	std_name: string;
	std_code: string | null;
	std_dob: string | null;
	std_gender: string | null;
	previous_school: string | null;
	started_class: string | null;
	current_class: string | null;
	status: string | null;
	parent?: {
		par_id: string;
		mother_name: string | null;
		father_name: string | null;
		mother_phone: string | null;
		father_phone: string | null;
		mother_email: string | null;
		father_email: string | null;
	};
	started_class_name?: string | null;
	current_class_name?: string | null;
	created_at: string | null;
	updated_at: string | null;
}

interface FilterState {
	search: string;
	status: string;
	gender: string;
}

export default function StudentManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [students, setStudents] = useState<StudentMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		status: '',
		gender: '',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [showFilters, setShowFilters] = useState(false);

	// Autocomplete state for status filter
	const [statusFilterQuery, setStatusFilterQuery] = useState('');
	const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
	const [statusFilterHighlightedIndex, setStatusFilterHighlightedIndex] = useState(-1);
	const statusFilterDropdownRef = useRef<HTMLDivElement>(null);
	const statusFilterInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete state for gender filter
	const [genderFilterQuery, setGenderFilterQuery] = useState('');
	const [showGenderFilterDropdown, setShowGenderFilterDropdown] = useState(false);
	const [genderFilterHighlightedIndex, setGenderFilterHighlightedIndex] = useState(-1);
	const genderFilterDropdownRef = useRef<HTMLDivElement>(null);
	const genderFilterInputRef = useRef<HTMLInputElement>(null);

	const statusOptions = ['Starting Here', 'Transferred', 'Resuming'];
	const genderOptions = ['Male', 'Female', 'Other'];

	const filteredStatusOptions = statusOptions.filter((status) => {
		if (!statusFilterQuery.trim()) return true;
		return status.toLowerCase().includes(statusFilterQuery.toLowerCase());
	});

	const filteredGenderOptions = genderOptions.filter((gender) => {
		if (!genderFilterQuery.trim()) return true;
		return gender.toLowerCase().includes(genderFilterQuery.toLowerCase());
	});

	// Close filter dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				statusFilterDropdownRef.current &&
				!statusFilterDropdownRef.current.contains(event.target as Node) &&
				statusFilterInputRef.current &&
				!statusFilterInputRef.current.contains(event.target as Node)
			) {
				setShowStatusFilterDropdown(false);
			}
			if (
				genderFilterDropdownRef.current &&
				!genderFilterDropdownRef.current.contains(event.target as Node) &&
				genderFilterInputRef.current &&
				!genderFilterInputRef.current.contains(event.target as Node)
			) {
				setShowGenderFilterDropdown(false);
			}
		};

		if (showStatusFilterDropdown || showGenderFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showStatusFilterDropdown, showGenderFilterDropdown]);

	// Modal states
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [selectedStudent, setSelectedStudent] = useState<StudentMember | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<StudentMember> | null>(null);
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

	// Fetch students data using school_id from logged-in user
	useEffect(() => {
		const fetchStudents = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const timestamp = new Date().getTime();
				// Backend requires pagination parameters, fetch with page=1 and page_size=100 to get all students
				const { data } = await api.get(`/students/?school_id=${schoolId}&page=1&page_size=100&_t=${timestamp}`);
				
				// Backend returns PaginatedResponse with items array
				if (data && data.items) {
					setStudents(data.items);
				} else if (Array.isArray(data)) {
					// Fallback for non-paginated response
					setStudents(data);
				} else {
					setStudents([]);
				}
			} catch (error: any) {
				console.error('Error fetching students:', error);
				const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch students';
				if (error.response?.status !== 403) {
					toast.error(errorMessage);
				}
				setStudents([]);
			} finally {
				setLoading(false);
			}
		};

		fetchStudents();
	}, [schoolId]);

	// Filtered students
	const filteredStudents = useMemo(() => {
		return students.filter((student) => {
			const matchesSearch = !filters.search || 
				student.std_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				student.std_code?.toLowerCase().includes(filters.search.toLowerCase()) ||
				student.parent?.mother_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				student.parent?.father_name?.toLowerCase().includes(filters.search.toLowerCase());
			
			const matchesStatus = !filters.status || student.status === filters.status;
			const matchesGender = !filters.gender || student.std_gender === filters.gender;
			
			return matchesSearch && matchesStatus && matchesGender;
		});
	}, [students, filters]);

	// Pagination
	const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedStudents = useMemo(() => {
		return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredStudents, startIndex, itemsPerPage]);

	// Analytics
	const analytics = useMemo(() => {
		return {
			total: filteredStudents.length,
			male: filteredStudents.filter(s => s.std_gender === 'Male').length,
			female: filteredStudents.filter(s => s.std_gender === 'Female').length,
		};
	}, [filteredStudents]);

	// Handle filter changes
	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters(prev => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const resetFilters = () => {
		setFilters({ search: '', status: '', gender: '' });
		setStatusFilterQuery('');
		setGenderFilterQuery('');
		setCurrentPage(1);
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
					setStatusFilterQuery(selectedStatus);
					setShowStatusFilterDropdown(false);
				} else if (statusFilterHighlightedIndex === -1 && filteredStatusOptions.length === 1) {
					const selectedStatus = filteredStatusOptions[0];
					handleFilterChange('status', selectedStatus);
					setStatusFilterQuery(selectedStatus);
					setShowStatusFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowStatusFilterDropdown(false);
				setStatusFilterHighlightedIndex(-1);
				break;
		}
	};

	const handleGenderFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showGenderFilterDropdown || filteredGenderOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setGenderFilterHighlightedIndex((prev) => (prev < filteredGenderOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setGenderFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (genderFilterHighlightedIndex >= 0 && genderFilterHighlightedIndex < filteredGenderOptions.length) {
					const selectedGender = filteredGenderOptions[genderFilterHighlightedIndex];
					handleFilterChange('gender', selectedGender);
					setGenderFilterQuery(selectedGender);
					setShowGenderFilterDropdown(false);
				} else if (genderFilterHighlightedIndex === -1 && filteredGenderOptions.length === 1) {
					const selectedGender = filteredGenderOptions[0];
					handleFilterChange('gender', selectedGender);
					setGenderFilterQuery(selectedGender);
					setShowGenderFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowGenderFilterDropdown(false);
				setGenderFilterHighlightedIndex(-1);
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

	// Refresh students data with cache busting
	const refreshStudents = async () => {
		if (!schoolId) {
			console.warn('Cannot refresh students: schoolId is missing');
			return;
		}

		try {
			const timestamp = new Date().getTime();
			const { data } = await api.get(`/students/?school_id=${schoolId}&page=1&page_size=100&_t=${timestamp}`);
			
			// Handle paginated response
			let newStudentsData: StudentMember[] = [];
			if (data && Array.isArray(data.items)) {
				newStudentsData = data.items;
			} else if (Array.isArray(data)) {
				newStudentsData = data;
			} else {
				newStudentsData = getArrayFromResponse(data);
			}
			
			// Force state update by creating a new array reference
			setStudents([...newStudentsData]);
			setCurrentPage(1);
		} catch (error: any) {
			console.error('Refresh students error:', error);
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to refresh students data';
			toast.error(errorMessage);
		}
	};

	// Handle Update (form submission - shows confirm)
	const handleUpdateSubmit = async (formData: Partial<StudentMember>) => {
		setFormDataToSubmit(formData);
		setEditModalOpen(false);
		setUpdateConfirmOpen(true);
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!selectedStudent || !schoolId || !formDataToSubmit) return;

		setFormLoading(true);
		try {
			await api.put(`/students/${selectedStudent.std_id}?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Student updated successfully!');
			setUpdateConfirmOpen(false);
			setSelectedStudent(null);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshStudents();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to update student');
			}
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDelete = async () => {
		if (!selectedStudent || !schoolId) return;

		setDeleteLoading(true);
		try {
			await api.delete(`/students/${selectedStudent.std_id}?school_id=${schoolId}`);
			toast.success('Student deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedStudent(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshStudents();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to delete student');
			}
		} finally {
			setDeleteLoading(false);
		}
	};

	// Open modals
	const openViewModal = (student: StudentMember) => {
		setSelectedStudent(student);
		setViewModalOpen(true);
	};

	const openEditModal = (student: StudentMember) => {
		setSelectedStudent(student);
		setViewModalOpen(false);
		setEditModalOpen(true);
	};

	const openDeleteConfirm = (student: StudentMember) => {
		setSelectedStudent(student);
		setViewModalOpen(false);
		setDeleteConfirmOpen(true);
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
							<p className="mt-4 text-gray-600">Loading students...</p>
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
							<h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
							<p className="text-gray-600 mt-1">View, edit, and manage student records</p>
						</div>
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Students</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<UserIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-green-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Male Students</p>
									<p className="text-3xl font-bold text-green-600 mt-2">{analytics.male}</p>
								</div>
								<div className="p-3 bg-green-100 rounded-[3px]">
									<UserIcon className="w-6 h-6 text-green-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-pink-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Female Students</p>
									<p className="text-3xl font-bold text-pink-600 mt-2">{analytics.female}</p>
								</div>
								<div className="p-3 bg-pink-100 rounded-[3px]">
									<UserIcon className="w-6 h-6 text-pink-600" />
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
									placeholder="Search by name, code, or parent name..."
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
								{(filters.status || filters.gender) && (
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
															setStatusFilterQuery(status);
															setShowStatusFilterDropdown(false);
														}}
														onMouseEnter={() => setStatusFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === statusFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.status === status ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">{status}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
									<div className="relative">
										<input
											ref={genderFilterInputRef}
											type="text"
											value={filters.gender || genderFilterQuery}
											onChange={(e) => {
												setGenderFilterQuery(e.target.value);
												setShowGenderFilterDropdown(true);
												setGenderFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowGenderFilterDropdown(false);
													handleFilterChange('gender', '');
												}
											}}
											onFocus={() => {
												if (filteredGenderOptions.length > 0) {
													setShowGenderFilterDropdown(true);
												}
											}}
											onKeyDown={handleGenderFilterKeyDown}
											placeholder="All Genders"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showGenderFilterDropdown && filteredGenderOptions.length > 0 && (
											<div
												ref={genderFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('gender', '');
														setGenderFilterQuery('');
														setShowGenderFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Genders</div>
												</button>
												{filteredGenderOptions.map((gender, index) => (
													<button
														key={gender}
														type="button"
														onClick={() => {
															handleFilterChange('gender', gender);
															setGenderFilterQuery(gender);
															setShowGenderFilterDropdown(false);
														}}
														onMouseEnter={() => setGenderFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === genderFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.gender === gender ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">{gender}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Students Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Student
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Code
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Class
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Parent
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Status
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Created
										</th>
										<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{paginatedStudents.length === 0 ? (
										<tr>
											<td colSpan={7} className="px-6 py-12 text-center">
												<div className="flex flex-col items-center gap-3">
													<UserIcon className="w-12 h-12 text-gray-400" />
													<p className="text-gray-500 font-medium">No students found</p>
													<p className="text-sm text-gray-400">Try adjusting your filters</p>
												</div>
											</td>
										</tr>
									) : (
										paginatedStudents.map((student) => (
											<tr key={student.std_id} className="hover:bg-gray-50 transition-colors">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
															<UserIcon className="w-5 h-5 text-white" />
														</div>
														<div>
															<div className="text-sm font-semibold text-gray-900">{student.std_name}</div>
															{student.std_gender && (
																<div className="text-xs text-gray-500">{student.std_gender}</div>
															)}
														</div>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">{student.std_code || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">
														{student.current_class_name || 'N/A'}
													</div>
												</td>
												<td className="px-6 py-4">
													<div className="text-sm text-gray-900">
														{student.parent ? (
															<>
																{student.parent.mother_name && (
																	<div className="font-medium">{student.parent.mother_name}</div>
																)}
																{student.parent.father_name && (
																	<div className={`font-medium ${student.parent.mother_name ? 'mt-1' : ''}`}>
																		{student.parent.father_name}
																	</div>
																)}
															</>
														) : (
															<span className="text-gray-500">—</span>
														)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													{student.status && (
														<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium bg-blue-100 text-blue-800">
															{student.status}
														</span>
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{formatDate(student.created_at)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex items-center justify-end gap-2">
														<button
															onClick={() => openViewModal(student)}
															className="p-2 text-blue-600 hover:bg-blue-50 rounded-[3px] transition-colors"
															title="View"
														>
															<EyeIcon className="w-5 h-5" />
														</button>
														{!isTeacher() && !isAccountant() && (
															<>
																<button
																	onClick={() => openEditModal(student)}
																	className="p-2 text-green-600 hover:bg-green-50 rounded-[3px] transition-colors"
																	title="Edit"
																>
																	<PencilIcon className="w-5 h-5" />
																</button>
																<button
																	onClick={() => openDeleteConfirm(student)}
																	className="p-2 text-red-600 hover:bg-red-50 rounded-[3px] transition-colors"
																	title="Delete"
																>
																	<TrashIcon className="w-5 h-5" />
																</button>
															</>
														)}
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
								<div className="text-sm text-gray-600">
									Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
								</div>
							</div>
						)}
					</div>
				</main>
			</div>

			{/* Modals */}
			<Modal
				isOpen={editModalOpen}
				onClose={() => {
					setEditModalOpen(false);
					setSelectedStudent(null);
				}}
				title="Edit Student"
				size="xl"
			>
				{selectedStudent && (
					<StudentForm
						student={selectedStudent}
						onSubmit={handleUpdateSubmit}
						onCancel={() => {
							setEditModalOpen(false);
							setSelectedStudent(null);
						}}
						loading={formLoading}
						mode="edit"
						schoolId={schoolId}
					/>
				)}
			</Modal>

			{selectedStudent && (
				<StudentViewModal
					student={selectedStudent}
					isOpen={viewModalOpen}
					onClose={() => {
						setViewModalOpen(false);
						setSelectedStudent(null);
					}}
					onEdit={() => openEditModal(selectedStudent)}
					onDelete={() => openDeleteConfirm(selectedStudent)}
				/>
			)}

			<ConfirmModal
				isOpen={updateConfirmOpen}
				onClose={() => {
					setUpdateConfirmOpen(false);
					setFormDataToSubmit(null);
				}}
				onConfirm={handleUpdateConfirm}
				title="Update Student"
				message={`Are you sure you want to update "${selectedStudent?.std_name || 'this student'}"?`}
				confirmText="Update"
				type="info"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={deleteConfirmOpen}
				onClose={() => {
					setDeleteConfirmOpen(false);
					setSelectedStudent(null);
				}}
				onConfirm={handleDelete}
				title="Delete Student"
				message={`Are you sure you want to delete "${selectedStudent?.std_name || 'this student'}"? This action cannot be undone.`}
				confirmText="Delete"
				type="danger"
				loading={deleteLoading}
			/>
		</div>
	);
}


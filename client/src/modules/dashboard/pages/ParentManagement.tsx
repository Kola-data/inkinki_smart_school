import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import {
	UserGroupIcon,
	SparklesIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
	UserPlusIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import ParentForm from '../components/ParentForm';
import ParentViewModal from '../components/ParentViewModal';
import StudentForm from '../components/StudentForm';
import { isTeacher, isAccountant } from '../../../utils/rolePermissions';

interface ParentMember {
	par_id: string;
	mother_name: string | null;
	father_name: string | null;
	mother_phone: string | null;
	father_phone: string | null;
	mother_email: string | null;
	father_email: string | null;
	par_address: string | null;
	par_type: string | null;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
}

interface FilterState {
	search: string;
	type: string;
}

export default function ParentManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [parents, setParents] = useState<ParentMember[]>([]);
	const [students, setStudents] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		type: '',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [showFilters, setShowFilters] = useState(false);

	// Autocomplete state for type filter
	const [typeFilterQuery, setTypeFilterQuery] = useState('');
	const [showTypeFilterDropdown, setShowTypeFilterDropdown] = useState(false);
	const [typeFilterHighlightedIndex, setTypeFilterHighlightedIndex] = useState(-1);
	const typeFilterDropdownRef = useRef<HTMLDivElement>(null);
	const typeFilterInputRef = useRef<HTMLInputElement>(null);

	const parentTypes = ['Guardian', 'Parent', 'Relative', 'Other'];
	const filteredTypeOptions = parentTypes.filter((type) => {
		if (!typeFilterQuery.trim()) return true;
		return type.toLowerCase().includes(typeFilterQuery.toLowerCase());
	});

	// Close filter dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				typeFilterDropdownRef.current &&
				!typeFilterDropdownRef.current.contains(event.target as Node) &&
				typeFilterInputRef.current &&
				!typeFilterInputRef.current.contains(event.target as Node)
			) {
				setShowTypeFilterDropdown(false);
			}
		};

		if (showTypeFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showTypeFilterDropdown]);

	// Modal states
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [selectedParent, setSelectedParent] = useState<ParentMember | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<ParentMember> | null>(null);
	const [formLoading, setFormLoading] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

	// Student creation modal states
	const [createStudentModalOpen, setCreateStudentModalOpen] = useState(false);
	const [studentFormDataToSubmit, setStudentFormDataToSubmit] = useState<Partial<any> | null>(null);
	const [studentCreateConfirmOpen, setStudentCreateConfirmOpen] = useState(false);
	const [studentFormLoading, setStudentFormLoading] = useState(false);

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

	// Fetch parents and students data using school_id from logged-in user
	useEffect(() => {
		const fetchData = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const timestamp = new Date().getTime();
				const [parentsResponse, studentsResponse] = await Promise.all([
					api.get(`/parents/?school_id=${schoolId}&_t=${timestamp}`),
					api.get(`/students/?school_id=${schoolId}&_t=${timestamp}`).catch(() => ({ data: [] })) // Ignore if students endpoint doesn't exist yet
				]);
				setParents(getArrayFromResponse(parentsResponse.data));
				setStudents(getArrayFromResponse(studentsResponse.data));
			} catch (error: any) {
				const errorMessage = error.response?.data?.detail || 'Failed to fetch parents';
				if (error.response?.status !== 403) {
					toast.error(errorMessage);
				}} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [schoolId]);

	// Calculate student counts per parent
	const parentStudentCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		students.forEach((student) => {
			if (student.par_id) {
				counts[student.par_id] = (counts[student.par_id] || 0) + 1;
			}
		});
		return counts;
	}, [students]);

	// Filtered parents
	const filteredParents = useMemo(() => {
		return parents.filter((parent) => {
			const matchesSearch = !filters.search || 
				(parent.mother_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				parent.father_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				parent.mother_phone?.toLowerCase().includes(filters.search.toLowerCase()) ||
				parent.father_phone?.toLowerCase().includes(filters.search.toLowerCase()) ||
				parent.mother_email?.toLowerCase().includes(filters.search.toLowerCase()) ||
				parent.father_email?.toLowerCase().includes(filters.search.toLowerCase()) ||
				parent.par_address?.toLowerCase().includes(filters.search.toLowerCase()));
			
			const matchesType = !filters.type || parent.par_type === filters.type;
			
			return matchesSearch && matchesType;
		});
	}, [parents, filters]);

	// Pagination
	const totalPages = Math.ceil(filteredParents.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedParents = useMemo(() => {
		return filteredParents.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredParents, startIndex, itemsPerPage]);

	// Analytics
	const analytics = useMemo(() => {
		return {
			total: filteredParents.length,
			guardians: filteredParents.filter(p => p.par_type === 'Guardian').length,
			parents: filteredParents.filter(p => p.par_type === 'Parent' || !p.par_type).length,
		};
	}, [filteredParents]);

	// Handle filter changes
	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters(prev => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const resetFilters = () => {
		setFilters({ search: '', type: '' });
		setTypeFilterQuery('');
		setCurrentPage(1);
	};

	const handleTypeFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showTypeFilterDropdown || filteredTypeOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setTypeFilterHighlightedIndex((prev) => (prev < filteredTypeOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setTypeFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (typeFilterHighlightedIndex >= 0 && typeFilterHighlightedIndex < filteredTypeOptions.length) {
					const selectedType = filteredTypeOptions[typeFilterHighlightedIndex];
					handleFilterChange('type', selectedType);
					setTypeFilterQuery(selectedType);
					setShowTypeFilterDropdown(false);
				} else if (typeFilterHighlightedIndex === -1 && filteredTypeOptions.length === 1) {
					const selectedType = filteredTypeOptions[0];
					handleFilterChange('type', selectedType);
					setTypeFilterQuery(selectedType);
					setShowTypeFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowTypeFilterDropdown(false);
				setTypeFilterHighlightedIndex(-1);
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

	// Refresh parents and students data with cache busting
	const refreshParents = async () => {
		if (!schoolId) {
			console.warn('Cannot refresh parents: schoolId is missing');
			return;
		}

		try {
			const timestamp = new Date().getTime();
			const [parentsResponse, studentsResponse] = await Promise.all([
				api.get(`/parents/?school_id=${schoolId}&page=1&page_size=100&_t=${timestamp}`),
				api.get(`/students/?school_id=${schoolId}&page=1&page_size=100&_t=${timestamp}`).catch(() => ({ data: { items: [] } }))
			]);
			
			// Handle paginated responses
			let newParentsData: ParentMember[] = [];
			if (parentsResponse.data && Array.isArray(parentsResponse.data.items)) {
				newParentsData = parentsResponse.data.items;
			} else if (Array.isArray(parentsResponse.data)) {
				newParentsData = parentsResponse.data;
			} else {
				newParentsData = getArrayFromResponse(parentsResponse.data);
			}
			
			let newStudentsData: any[] = [];
			if (studentsResponse.data && Array.isArray(studentsResponse.data.items)) {
				newStudentsData = studentsResponse.data.items;
			} else if (Array.isArray(studentsResponse.data)) {
				newStudentsData = studentsResponse.data;
			} else {
				newStudentsData = getArrayFromResponse(studentsResponse.data);
			}
			
			// Force state update by creating new array references
			setParents([...newParentsData]);
			setStudents([...newStudentsData]);
			setCurrentPage(1);
		} catch (error: any) {
			console.error('Refresh parents error:', error);
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to refresh parents data';
			toast.error(errorMessage);
		}
	};

	// Handle Add Student action
	// IMPORTANT: Students can ONLY be created from the Parents page
	// The Students management page should NOT have a "Create" or "Add" button
	// Students page should only have View, Edit, and Delete actions
	const handleAddStudent = (parent: ParentMember) => {
		setSelectedParent(parent);
		setCreateStudentModalOpen(true);
	};

	// Handle Student Create (form submission - shows confirm)
	const handleStudentCreateSubmit = async (formData: Partial<any>) => {
		setStudentFormDataToSubmit(formData);
		setCreateStudentModalOpen(false);
		setStudentCreateConfirmOpen(true);
	};

	// Handle Student Create (after confirmation)
	const handleStudentCreateConfirm = async () => {
		if (!schoolId || !studentFormDataToSubmit) {
			toast.error('School information not found');
			return;
		}

		setStudentFormLoading(true);
		try {
			await api.post(`/students/`, {
				...studentFormDataToSubmit,
				school_id: schoolId,
			});
			toast.success('Student created successfully!');
			setStudentCreateConfirmOpen(false);
			setStudentFormDataToSubmit(null);
			setSelectedParent(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshParents();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to create student');
		} finally {
			setStudentFormLoading(false);
		}
	};

	// Handle Create (form submission - shows confirm)
	const handleCreateSubmit = async (formData: Partial<ParentMember>) => {
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
			await api.post(`/parents/`, {
				...formDataToSubmit,
				school_id: schoolId,
			});
			toast.success('Parent created successfully!');
			setCreateConfirmOpen(false);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshParents();
		} catch (error: any) {
			console.error('Create parent error:', error);
			const errorDetail = error.response?.data?.detail;
			if (Array.isArray(errorDetail)) {
				// Validation errors
				const errorMessages = errorDetail.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorDetail || error.message || 'Failed to create parent');
			}
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Update (form submission - shows confirm)
	const handleUpdateSubmit = async (formData: Partial<ParentMember>) => {
		setFormDataToSubmit(formData);
		setEditModalOpen(false);
		setUpdateConfirmOpen(true);
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!selectedParent || !schoolId || !formDataToSubmit) return;

		setFormLoading(true);
		try {
			await api.put(`/parents/${selectedParent.par_id}?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Parent updated successfully!');
			setUpdateConfirmOpen(false);
			setSelectedParent(null);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshParents();
		} catch (error: any) {
			console.error('Update parent error:', error);
			const errorDetail = error.response?.data?.detail;
			if (Array.isArray(errorDetail)) {
				// Validation errors
				const errorMessages = errorDetail.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorDetail || error.message || 'Failed to update parent');
			}
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDelete = async () => {
		if (!selectedParent || !schoolId) return;

		setDeleteLoading(true);
		try {
			await api.delete(`/parents/${selectedParent.par_id}?school_id=${schoolId}`);
			toast.success('Parent deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedParent(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshParents();
		} catch (error: any) {
			console.error('Delete parent error:', error);
			const errorDetail = error.response?.data?.detail;
			if (Array.isArray(errorDetail)) {
				// Validation errors
				const errorMessages = errorDetail.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorDetail || error.message || 'Failed to delete parent');
			}
		} finally {
			setDeleteLoading(false);
		}
	};

	// Open modals
	const openViewModal = (parent: ParentMember) => {
		setSelectedParent(parent);
		setViewModalOpen(true);
	};

	const openEditModal = (parent: ParentMember) => {
		setSelectedParent(parent);
		setViewModalOpen(false);
		setEditModalOpen(true);
	};

	const openDeleteConfirm = (parent: ParentMember) => {
		setSelectedParent(parent);
		setViewModalOpen(false);
		setDeleteConfirmOpen(true);
	};

	const openCreateModal = () => {
		setSelectedParent(null);
		setCreateModalOpen(true);
	};

	const getParentDisplayName = (parent: ParentMember) => {
		if (parent.mother_name && parent.father_name) {
			return `${parent.mother_name} & ${parent.father_name}`;
		}
		return parent.mother_name || parent.father_name || 'N/A';
	};

	if (loading) {
		return (
			<div className="flex bg-gray-50 min-h-screen">
				<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<div className="flex-1 flex flex-col min-h-screen overflow-hidden">
					<Topbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
					<main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
							<p className="mt-4 text-gray-600">Loading parents...</p>
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
				<div className="flex-1 flex flex-col min-h-screen overflow-hidden">
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
							<h1 className="text-3xl font-bold text-gray-900">Parent Management</h1>
							<p className="text-gray-600 mt-1">Manage parents and guardians</p>
						</div>
						{!isAccountant() && (
							<button
								onClick={openCreateModal}
								className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-[3px] shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
							>
								<PlusIcon className="w-5 h-5" />
								<span>Add Parent</span>
							</button>
						)}
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Parents</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<UserGroupIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-green-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Guardians</p>
									<p className="text-3xl font-bold text-green-600 mt-2">{analytics.guardians}</p>
								</div>
								<div className="p-3 bg-green-100 rounded-[3px]">
									<SparklesIcon className="w-6 h-6 text-green-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-purple-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Parents</p>
									<p className="text-3xl font-bold text-purple-600 mt-2">{analytics.parents}</p>
								</div>
								<div className="p-3 bg-purple-100 rounded-[3px]">
									<UserGroupIcon className="w-6 h-6 text-purple-600" />
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
									placeholder="Search by name, phone, email, or address..."
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
								{(filters.type) && (
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
									<label className="block text-sm font-medium text-gray-700 mb-2">Parent Type</label>
									<div className="relative">
										<input
											ref={typeFilterInputRef}
											type="text"
											value={filters.type || typeFilterQuery}
											onChange={(e) => {
												setTypeFilterQuery(e.target.value);
												setShowTypeFilterDropdown(true);
												setTypeFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowTypeFilterDropdown(false);
													handleFilterChange('type', '');
												}
											}}
											onFocus={() => {
												if (filteredTypeOptions.length > 0) {
													setShowTypeFilterDropdown(true);
												}
											}}
											onKeyDown={handleTypeFilterKeyDown}
											placeholder="All Types"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showTypeFilterDropdown && filteredTypeOptions.length > 0 && (
											<div
												ref={typeFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('type', '');
														setTypeFilterQuery('');
														setShowTypeFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Types</div>
												</button>
												{filteredTypeOptions.map((type, index) => (
													<button
														key={type}
														type="button"
														onClick={() => {
															handleFilterChange('type', type);
															setTypeFilterQuery(type);
															setShowTypeFilterDropdown(false);
														}}
														onMouseEnter={() => setTypeFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === typeFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.type === type ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">{type}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Parents Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Name</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
										<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{paginatedParents.length === 0 ? (
										<tr>
											<td colSpan={7} className="px-6 py-12 text-center text-gray-500">
												<UserGroupIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
												<p className="text-lg font-medium">No parents found</p>
												<p className="text-sm mt-1">
													{filteredParents.length === 0
														? 'Get started by adding your first parent.'
														: 'Try adjusting your filters.'}
												</p>
											</td>
										</tr>
									) : (
										paginatedParents.map((parent) => (
											<tr key={parent.par_id} className="hover:bg-gray-50 transition-colors">
												<td className="px-6 py-4">
													<div className="flex items-center">
														<div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
															<UserGroupIcon className="w-5 h-5 text-white" />
														</div>
														<div className="ml-4">
															<div className="text-sm font-medium text-gray-900">
																{parent.mother_name || parent.father_name ? (
																	<>
																		{parent.mother_name && (
																			<div className="font-medium text-gray-900">{parent.mother_name}</div>
																		)}
																		{parent.father_name && (
																			<div className={`font-medium text-gray-900 ${parent.mother_name ? 'mt-1' : ''}`}>
																				{parent.father_name}
																			</div>
																		)}
																	</>
																) : (
																	<span className="text-gray-500">—</span>
																)}
															</div>
														</div>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													{parent.par_type ? (
														<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium bg-blue-100 text-blue-800">
															{parent.par_type}
														</span>
													) : (
														<span className="text-sm text-gray-500">—</span>
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">
														{parent.mother_phone || parent.father_phone || (
															<span className="text-gray-500">—</span>
														)}
														{(parent.mother_phone && parent.father_phone) && (
															<>
																<br />
																<span className="text-gray-500">{parent.father_phone}</span>
															</>
														)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">
														{parent.mother_email || parent.father_email || (
															<span className="text-gray-500">—</span>
														)}
														{(parent.mother_email && parent.father_email) && (
															<>
																<br />
																<span className="text-gray-500">{parent.father_email}</span>
															</>
														)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">
														{parentStudentCounts[parent.par_id] || 0}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{formatDate(parent.created_at)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex items-center justify-end gap-2">
														{!isTeacher() && !isAccountant() && (
															<button
																onClick={() => handleAddStudent(parent)}
																className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-[3px] transition-colors"
																title="Add Student"
															>
																<UserPlusIcon className="w-5 h-5" />
															</button>
														)}
														<button
															onClick={() => openViewModal(parent)}
															className="p-2 text-blue-600 hover:bg-blue-50 rounded-[3px] transition-colors"
															title="View"
														>
															<EyeIcon className="w-5 h-5" />
														</button>
														{!isAccountant() && (
															<>
																<button
																	onClick={() => openEditModal(parent)}
																	className="p-2 text-green-600 hover:bg-green-50 rounded-[3px] transition-colors"
																	title="Edit"
																>
																	<PencilIcon className="w-5 h-5" />
																</button>
																<button
																	onClick={() => openDeleteConfirm(parent)}
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
							<div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
								<div className="text-sm text-gray-700">
									Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
									<span className="font-medium">
										{Math.min(startIndex + itemsPerPage, filteredParents.length)}
									</span>{' '}
									of <span className="font-medium">{filteredParents.length}</span> results
								</div>
								<div className="flex gap-2">
									<button
										onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
										disabled={currentPage === 1}
										className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Previous
									</button>
									<button
										onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
										disabled={currentPage === totalPages}
										className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Next
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Modals */}
					<Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add Parent" size="xl">
						<ParentForm
							parent={null}
							onSubmit={handleCreateSubmit}
							onCancel={() => setCreateModalOpen(false)}
							loading={formLoading}
							mode="create"
							schoolId={schoolId || ''}
						/>
					</Modal>

					<Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Parent" size="xl">
						<ParentForm
							parent={selectedParent}
							onSubmit={handleUpdateSubmit}
							onCancel={() => setEditModalOpen(false)}
							loading={formLoading}
							mode="edit"
							schoolId={schoolId || ''}
						/>
					</Modal>

					{selectedParent && (
						<ParentViewModal
							parent={selectedParent}
							isOpen={viewModalOpen}
							onClose={() => {
								setViewModalOpen(false);
								setSelectedParent(null);
							}}
							onEdit={() => openEditModal(selectedParent)}
							onDelete={() => openDeleteConfirm(selectedParent)}
						/>
					)}

					<ConfirmModal
						isOpen={createConfirmOpen}
						onClose={() => {
							setCreateConfirmOpen(false);
							setFormDataToSubmit(null);
						}}
						onConfirm={handleCreateConfirm}
						title="Create Parent"
						message="Are you sure you want to create this parent?"
						confirmText="Create"
						cancelText="Cancel"
						loading={formLoading}
						type="info"
					/>

					<ConfirmModal
						isOpen={updateConfirmOpen}
						onClose={() => {
							setUpdateConfirmOpen(false);
							setFormDataToSubmit(null);
						}}
						onConfirm={handleUpdateConfirm}
						title="Update Parent"
						message="Are you sure you want to update this parent?"
						confirmText="Update"
						cancelText="Cancel"
						loading={formLoading}
						type="info"
					/>

					<ConfirmModal
						isOpen={deleteConfirmOpen}
						onClose={() => {
							setDeleteConfirmOpen(false);
							setSelectedParent(null);
						}}
						onConfirm={handleDelete}
						title="Delete Parent"
						message={`Are you sure you want to delete ${selectedParent ? getParentDisplayName(selectedParent) : 'this parent'}? This action cannot be undone.`}
						confirmText="Delete"
						cancelText="Cancel"
						loading={deleteLoading}
						type="danger"
					/>

					{/* Student Creation Modal */}
					<Modal
						isOpen={createStudentModalOpen}
						onClose={() => {
							setCreateStudentModalOpen(false);
							setSelectedParent(null);
						}}
						title="Add Student"
						size="xl"
					>
						<StudentForm
							onSubmit={handleStudentCreateSubmit}
							onCancel={() => {
								setCreateStudentModalOpen(false);
								setSelectedParent(null);
							}}
							loading={studentFormLoading}
							mode="create"
							schoolId={schoolId || ''}
							preSelectedParentId={selectedParent?.par_id || null}
						/>
					</Modal>

					{/* Student Create Confirmation Modal */}
					<ConfirmModal
						isOpen={studentCreateConfirmOpen}
						onClose={() => {
							setStudentCreateConfirmOpen(false);
							setStudentFormDataToSubmit(null);
						}}
						onConfirm={handleStudentCreateConfirm}
						title="Create Student"
						message={`Are you sure you want to create "${studentFormDataToSubmit?.std_name || 'this student'}"?`}
						confirmText="Create"
						cancelText="Cancel"
						loading={studentFormLoading}
						type="info"
					/>
				</main>
			</div>
		</div>
	);
}

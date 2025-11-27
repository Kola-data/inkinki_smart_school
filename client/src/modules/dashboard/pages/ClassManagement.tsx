import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import {
	BuildingOfficeIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
	SparklesIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import ClassForm from '../components/ClassForm';
import ClassViewModal from '../components/ClassViewModal';
import { isTeacher } from '../../../utils/rolePermissions';

interface ClassMember {
	cls_id: string;
	cls_name: string;
	cls_type: string;
	cls_manager: string;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
	manager_name: string | null;
	manager_email: string | null;
	manager_specialized: string | null;
}

interface TeacherMember {
	teacher_id: string;
	staff_name: string | null;
	email: string | null;
	specialized: string | null;
}

interface FilterState {
	search: string;
	type: string;
}

export default function ClassManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [classes, setClasses] = useState<ClassMember[]>([]);
	const [availableTeachers, setAvailableTeachers] = useState<TeacherMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		type: '',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [showFilters, setShowFilters] = useState(false);

	// Autocomplete state for class type filter
	const [classTypeFilterQuery, setClassTypeFilterQuery] = useState('');
	const [showClassTypeFilterDropdown, setShowClassTypeFilterDropdown] = useState(false);
	const [classTypeFilterHighlightedIndex, setClassTypeFilterHighlightedIndex] = useState(-1);
	const classTypeFilterDropdownRef = useRef<HTMLDivElement>(null);
	const classTypeFilterInputRef = useRef<HTMLInputElement>(null);

	// Close filter dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				classTypeFilterDropdownRef.current &&
				!classTypeFilterDropdownRef.current.contains(event.target as Node) &&
				classTypeFilterInputRef.current &&
				!classTypeFilterInputRef.current.contains(event.target as Node)
			) {
				setShowClassTypeFilterDropdown(false);
			}
		};

		if (showClassTypeFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showClassTypeFilterDropdown]);

	// Modal states
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [selectedClass, setSelectedClass] = useState<ClassMember | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<ClassMember> | null>(null);
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

	// Fetch classes data using school_id from logged-in user
	useEffect(() => {
		const fetchClasses = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/classes/?school_id=${schoolId}&_t=${timestamp}`);
				setClasses(getArrayFromResponse(data));
			} catch (error: any) {
				const errorMessage = error.response?.data?.detail || 'Failed to fetch classes';
				if (error.response?.status !== 403) {
					toast.error(errorMessage);
				}} finally {
				setLoading(false);
			}
		};

		fetchClasses();
	}, [schoolId]);

	// Fetch available teachers for form dropdown
	useEffect(() => {
		const fetchTeachers = async () => {
			if (!schoolId) return;

			try {
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/teachers/?school_id=${schoolId}&_t=${timestamp}`);
				const teachersData = data?.items || data || [];
				const teachers = Array.isArray(teachersData) ? teachersData.filter((t: any) => t.is_active) : [];
				// Map to TeacherMember format
				const mappedTeachers: TeacherMember[] = teachers.map((t: any) => ({
					teacher_id: t.teacher_id,
					staff_name: t.staff_name,
					email: t.staff_email,
					specialized: t.specialized,
				}));
				setAvailableTeachers(mappedTeachers);
			} catch (error: any) {
				console.error('Error fetching teachers:', error);
				setAvailableTeachers([]);
			}
		};

		if (schoolId && !loading) {
			fetchTeachers();
		}
	}, [schoolId, loading]);

	// Also fetch when create modal opens
	useEffect(() => {
		const fetchTeachers = async () => {
			if (!schoolId || !createModalOpen) return;

			try {
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/teachers/?school_id=${schoolId}&_t=${timestamp}`);
				const teachersData = data?.items || data || [];
				const teachers = Array.isArray(teachersData) ? teachersData.filter((t: any) => t.is_active) : [];
				const mappedTeachers: TeacherMember[] = teachers.map((t: any) => ({
					teacher_id: t.teacher_id,
					staff_name: t.staff_name,
					email: t.staff_email,
					specialized: t.specialized,
				}));
				setAvailableTeachers(mappedTeachers);
			} catch (error: any) {
				console.error('Error fetching teachers:', error);
				setAvailableTeachers([]);
			}
		};

		if (createModalOpen && schoolId) {
			fetchTeachers();
		}
	}, [createModalOpen, schoolId]);

	// Filtered classes
	const filteredClasses = useMemo(() => {
		return classes.filter((classItem) => {
			const matchesSearch = !filters.search || 
				classItem.cls_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				classItem.manager_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				classItem.manager_email?.toLowerCase().includes(filters.search.toLowerCase());
			
			const matchesType = !filters.type || classItem.cls_type === filters.type;
			
			return matchesSearch && matchesType;
		});
	}, [classes, filters]);

	// Pagination
	const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedClasses = useMemo(() => {
		return filteredClasses.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredClasses, startIndex, itemsPerPage]);

	// Analytics
	const analytics = useMemo(() => {
		const uniqueTypes = new Set(classes.map(c => c.cls_type));
		return {
			total: filteredClasses.length,
			types: uniqueTypes.size,
		};
	}, [filteredClasses, classes]);

	// Unique class types for filter
	const uniqueTypes = useMemo(() => {
		const types = classes.map(c => c.cls_type).filter((type): type is string => type !== null && type !== '');
		return Array.from(new Set(types)).sort();
	}, [classes]);

	// Filter class types based on search query
	const filteredClassTypes = useMemo(() => {
		if (!classTypeFilterQuery.trim()) return uniqueTypes;
		const query = classTypeFilterQuery.toLowerCase();
		return uniqueTypes.filter((type) => type.toLowerCase().includes(query));
	}, [uniqueTypes, classTypeFilterQuery]);

	// Handle filter changes
	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters(prev => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const resetFilters = () => {
		setFilters({ search: '', type: '' });
		setClassTypeFilterQuery('');
		setCurrentPage(1);
	};

	const handleClassTypeFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showClassTypeFilterDropdown || filteredClassTypes.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setClassTypeFilterHighlightedIndex((prev) => (prev < filteredClassTypes.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setClassTypeFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (classTypeFilterHighlightedIndex >= 0 && classTypeFilterHighlightedIndex < filteredClassTypes.length) {
					const selectedType = filteredClassTypes[classTypeFilterHighlightedIndex];
					handleFilterChange('type', selectedType);
					setClassTypeFilterQuery(selectedType);
					setShowClassTypeFilterDropdown(false);
				} else if (classTypeFilterHighlightedIndex === -1 && filteredClassTypes.length === 1) {
					const selectedType = filteredClassTypes[0];
					handleFilterChange('type', selectedType);
					setClassTypeFilterQuery(selectedType);
					setShowClassTypeFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowClassTypeFilterDropdown(false);
				setClassTypeFilterHighlightedIndex(-1);
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

	// Refresh classes data with cache busting
	const refreshClasses = async () => {
		if (!schoolId) {
			console.warn('Cannot refresh classes: schoolId is missing');
			return;
		}

		try {
			const timestamp = new Date().getTime();
			const { data } = await api.get(`/classes/?school_id=${schoolId}&_t=${timestamp}`);
			
			// Handle paginated response
			let newClassesData: ClassMember[] = [];
			if (data && Array.isArray(data.items)) {
				newClassesData = data.items;
			} else if (Array.isArray(data)) {
				newClassesData = data;
			} else {
				newClassesData = getArrayFromResponse(data);
			}
			
			// Force state update by creating a new array reference
			setClasses([...newClassesData]);
			setCurrentPage(1);
		} catch (error: any) {
			console.error('Refresh classes error:', error);
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to refresh classes data';
			toast.error(errorMessage);
		}
	};

	// Handle Create (form submission - shows confirm)
	const handleCreateSubmit = async (formData: Partial<ClassMember>) => {
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
			await api.post(`/classes/?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Class created successfully!');
			setCreateConfirmOpen(false);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshClasses();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to create class');
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Update (form submission - shows confirm)
	const handleUpdateSubmit = async (formData: Partial<ClassMember>) => {
		setFormDataToSubmit(formData);
		setEditModalOpen(false);
		setUpdateConfirmOpen(true);
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!selectedClass || !schoolId || !formDataToSubmit) return;

		setFormLoading(true);
		try {
			await api.put(`/classes/${selectedClass.cls_id}?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Class updated successfully!');
			setUpdateConfirmOpen(false);
			setSelectedClass(null);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshClasses();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to update class');
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDelete = async () => {
		if (!selectedClass || !schoolId) return;

		setDeleteLoading(true);
		try {
			await api.delete(`/classes/${selectedClass.cls_id}?school_id=${schoolId}`);
			toast.success('Class deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedClass(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshClasses();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to delete class');
		} finally {
			setDeleteLoading(false);
		}
	};

	// Open modals
	const openViewModal = (classItem: ClassMember) => {
		setSelectedClass(classItem);
		setViewModalOpen(true);
	};

	const openEditModal = (classItem: ClassMember) => {
		setSelectedClass(classItem);
		setViewModalOpen(false);
		setEditModalOpen(true);
	};

	const openDeleteConfirm = (classItem: ClassMember) => {
		setSelectedClass(classItem);
		setViewModalOpen(false);
		setDeleteConfirmOpen(true);
	};

	const openCreateModal = () => {
		setSelectedClass(null);
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
							<p className="mt-4 text-gray-600">Loading classes...</p>
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
							<h1 className="text-3xl font-bold text-gray-900">Class Management</h1>
							<p className="text-gray-600 mt-1">Manage your school classes</p>
						</div>
						{!isTeacher() && (
							<button
								onClick={openCreateModal}
								className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-[3px] shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
							>
								<PlusIcon className="w-5 h-5" />
								<span>Add Class</span>
							</button>
						)}
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Classes</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-purple-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Class Types</p>
									<p className="text-3xl font-bold text-purple-600 mt-2">{analytics.types}</p>
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
									placeholder="Search by class name or manager..."
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
									<label className="block text-sm font-medium text-gray-700 mb-2">Class Type</label>
									<div className="relative">
										<input
											ref={classTypeFilterInputRef}
											type="text"
											value={filters.type || classTypeFilterQuery}
											onChange={(e) => {
												setClassTypeFilterQuery(e.target.value);
												setShowClassTypeFilterDropdown(true);
												setClassTypeFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowClassTypeFilterDropdown(false);
													handleFilterChange('type', '');
												}
											}}
											onFocus={() => {
												if (filteredClassTypes.length > 0) {
													setShowClassTypeFilterDropdown(true);
												}
											}}
											onKeyDown={handleClassTypeFilterKeyDown}
											placeholder="All Types"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showClassTypeFilterDropdown && filteredClassTypes.length > 0 && (
											<div
												ref={classTypeFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('type', '');
														setClassTypeFilterQuery('');
														setShowClassTypeFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Types</div>
												</button>
												{filteredClassTypes.map((type, index) => (
													<button
														key={type}
														type="button"
														onClick={() => {
															handleFilterChange('type', type);
															setClassTypeFilterQuery(type);
															setShowClassTypeFilterDropdown(false);
														}}
														onMouseEnter={() => setClassTypeFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === classTypeFilterHighlightedIndex ? 'bg-primary-50' : ''
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

					{/* Classes Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Class
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Type
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Manager
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
									{paginatedClasses.length === 0 ? (
										<tr>
											<td colSpan={5} className="px-6 py-12 text-center">
												<div className="flex flex-col items-center gap-3">
													<BuildingOfficeIcon className="w-12 h-12 text-gray-400" />
													<p className="text-gray-500 font-medium">No classes found</p>
													<p className="text-sm text-gray-400">Try adjusting your filters or create a new class</p>
												</div>
											</td>
										</tr>
									) : (
										paginatedClasses.map((classItem) => (
											<tr key={classItem.cls_id} className="hover:bg-gray-50 transition-colors">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
															<BuildingOfficeIcon className="w-5 h-5 text-white" />
														</div>
														<div>
															<div className="text-sm font-semibold text-gray-900">{classItem.cls_name}</div>
														</div>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													{classItem.cls_type ? (
														<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium bg-blue-100 text-blue-800">
															{classItem.cls_type}
														</span>
													) : (
														<span className="text-sm text-gray-500">N/A</span>
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div>
														<div className="text-sm font-medium text-gray-900">{classItem.manager_name || 'N/A'}</div>
														{classItem.manager_email && (
															<div className="text-xs text-gray-500">{classItem.manager_email}</div>
														)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{formatDate(classItem.created_at)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex items-center justify-end gap-2">
														<button
															onClick={() => openViewModal(classItem)}
															className="p-2 text-blue-600 hover:bg-blue-50 rounded-[3px] transition-colors"
															title="View"
														>
															<EyeIcon className="w-5 h-5" />
														</button>
														{!isTeacher() && (
															<>
																<button
																	onClick={() => openEditModal(classItem)}
																	className="p-2 text-green-600 hover:bg-green-50 rounded-[3px] transition-colors"
																	title="Edit"
																>
																	<PencilIcon className="w-5 h-5" />
																</button>
																<button
																	onClick={() => openDeleteConfirm(classItem)}
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
									Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClasses.length)} of {filteredClasses.length} classes
								</div>
							</div>
						)}
					</div>
				</main>
			</div>

			{/* Modals */}
			<Modal
				isOpen={createModalOpen}
				onClose={() => setCreateModalOpen(false)}
				title="Create Class"
				size="xl"
			>
				<ClassForm
					availableTeachers={availableTeachers}
					onSubmit={handleCreateSubmit}
					onCancel={() => setCreateModalOpen(false)}
					loading={formLoading}
					mode="create"
				/>
			</Modal>

			<Modal
				isOpen={editModalOpen}
				onClose={() => {
					setEditModalOpen(false);
					setSelectedClass(null);
				}}
				title="Edit Class"
				size="xl"
			>
				{selectedClass && (
					<ClassForm
						classItem={selectedClass}
						availableTeachers={availableTeachers}
						onSubmit={handleUpdateSubmit}
						onCancel={() => {
							setEditModalOpen(false);
							setSelectedClass(null);
						}}
						loading={formLoading}
						mode="edit"
					/>
				)}
			</Modal>

			{selectedClass && (
				<ClassViewModal
					classItem={selectedClass}
					isOpen={viewModalOpen}
					onClose={() => {
						setViewModalOpen(false);
						setSelectedClass(null);
					}}
					onEdit={() => openEditModal(selectedClass)}
					onDelete={() => openDeleteConfirm(selectedClass)}
				/>
			)}

			<ConfirmModal
				isOpen={createConfirmOpen}
				onClose={() => {
					setCreateConfirmOpen(false);
					setFormDataToSubmit(null);
				}}
				onConfirm={handleCreateConfirm}
				title="Create Class"
				message={`Are you sure you want to create "${formDataToSubmit?.cls_name || 'this class'}"?`}
				confirmText="Create"
				type="info"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={updateConfirmOpen}
				onClose={() => {
					setUpdateConfirmOpen(false);
					setFormDataToSubmit(null);
				}}
				onConfirm={handleUpdateConfirm}
				title="Update Class"
				message={`Are you sure you want to update "${selectedClass?.cls_name || 'this class'}"?`}
				confirmText="Update"
				type="info"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={deleteConfirmOpen}
				onClose={() => {
					setDeleteConfirmOpen(false);
					setSelectedClass(null);
				}}
				onConfirm={handleDelete}
				title="Delete Class"
				message={`Are you sure you want to delete "${selectedClass?.cls_name || 'this class'}"? This action cannot be undone.`}
				confirmText="Delete"
				type="danger"
				loading={deleteLoading}
			/>
		</div>
	);
}


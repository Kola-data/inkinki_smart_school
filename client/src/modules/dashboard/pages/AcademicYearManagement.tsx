import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import {
	CalendarIcon,
	CheckCircleIcon,
	XCircleIcon,
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
import AcademicYearForm from '../components/AcademicYearForm';
import AcademicYearViewModal from '../components/AcademicYearViewModal';
import { isTeacher, isAccountant } from '../../../utils/rolePermissions';

interface AcademicYearMember {
	academic_id: string;
	academic_name: string;
	start_date: string;
	end_date: string;
	is_current: boolean;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
}

interface FilterState {
	search: string;
	status: string;
}

export default function AcademicYearManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [academicYears, setAcademicYears] = useState<AcademicYearMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		status: '',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [showFilters, setShowFilters] = useState(false);
	const [currentDropdownOpen, setCurrentDropdownOpen] = useState<string | null>(null);
	const [currentUpdateLoading, setCurrentUpdateLoading] = useState<string | null>(null);

	// Autocomplete state for status filter
	const [statusFilterQuery, setStatusFilterQuery] = useState('');
	const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
	const [statusFilterHighlightedIndex, setStatusFilterHighlightedIndex] = useState(-1);
	const statusFilterDropdownRef = useRef<HTMLDivElement>(null);
	const statusFilterInputRef = useRef<HTMLInputElement>(null);

	const statusOptions = ['current', 'previous'];
	const filteredStatusOptions = statusOptions.filter((status) => {
		if (!statusFilterQuery.trim()) return true;
		return status.toLowerCase().includes(statusFilterQuery.toLowerCase());
	});

	// Close filter dropdown when clicking outside
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
		};

		if (showStatusFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showStatusFilterDropdown]);

	// Modal states
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [selectedAcademicYear, setSelectedAcademicYear] = useState<AcademicYearMember | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<AcademicYearMember> | null>(null);
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

	// Fetch academic years data using school_id from logged-in user
	useEffect(() => {
		const fetchAcademicYears = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/academic-years/?school_id=${schoolId}&_t=${timestamp}`);
				setAcademicYears(getArrayFromResponse(data));
			} catch (error: any) {
				const errorMessage = error.response?.data?.detail || 'Failed to fetch academic years';
				if (error.response?.status !== 403) {
					toast.error(errorMessage);
				}} finally {
				setLoading(false);
			}
		};

		fetchAcademicYears();
	}, [schoolId]);

	// Filtered academic years
	const filteredAcademicYears = useMemo(() => {
		return academicYears.filter((year) => {
			const matchesSearch = !filters.search || 
				year.academic_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				year.start_date?.toLowerCase().includes(filters.search.toLowerCase()) ||
				year.end_date?.toLowerCase().includes(filters.search.toLowerCase());
			
			const matchesStatus = !filters.status || 
				(filters.status === 'current' && year.is_current) ||
				(filters.status === 'previous' && !year.is_current);
			
			return matchesSearch && matchesStatus;
		});
	}, [academicYears, filters]);

	// Pagination
	const totalPages = Math.ceil(filteredAcademicYears.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedAcademicYears = useMemo(() => {
		return filteredAcademicYears.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredAcademicYears, startIndex, itemsPerPage]);

	// Analytics
	const analytics = useMemo(() => {
		return {
			total: filteredAcademicYears.length,
			current: filteredAcademicYears.filter(y => y.is_current).length,
			previous: filteredAcademicYears.filter(y => !y.is_current).length,
		};
	}, [filteredAcademicYears]);

	// Handle filter changes
	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters(prev => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const resetFilters = () => {
		setFilters({ search: '', status: '' });
		setStatusFilterQuery('');
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

	// Refresh academic years data with cache busting
	const refreshAcademicYears = async () => {
		if (!schoolId) {
			console.warn('Cannot refresh academic years: schoolId is missing');
			return;
		}

		try {
			const timestamp = new Date().getTime();
			const { data } = await api.get(`/academic-years/?school_id=${schoolId}&_t=${timestamp}`);
			
			// Handle paginated response
			let newAcademicYearsData: AcademicYearMember[] = [];
			if (data && Array.isArray(data.items)) {
				newAcademicYearsData = data.items;
			} else if (Array.isArray(data)) {
				newAcademicYearsData = data;
			} else {
				newAcademicYearsData = getArrayFromResponse(data);
			}
			
			// Force state update by creating a new array reference
			setAcademicYears([...newAcademicYearsData]);
			setCurrentPage(1);
		} catch (error: any) {
			console.error('Refresh academic years error:', error);
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to refresh academic years data';
			toast.error(errorMessage);
		}
	};

	// Handle Create (form submission - shows confirm)
	const handleCreateSubmit = async (formData: Partial<AcademicYearMember>) => {
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
			await api.post(`/academic-years/?school_id=${schoolId}`, {
				...formDataToSubmit,
				school_id: schoolId,
			});
			toast.success('Academic year created successfully!');
			setCreateConfirmOpen(false);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshAcademicYears();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to create academic year');
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Update (form submission - shows confirm)
	const handleUpdateSubmit = async (formData: Partial<AcademicYearMember>) => {
		setFormDataToSubmit(formData);
		setEditModalOpen(false);
		setUpdateConfirmOpen(true);
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!selectedAcademicYear || !schoolId || !formDataToSubmit) return;

		setFormLoading(true);
		try {
			await api.put(`/academic-years/${selectedAcademicYear.academic_id}?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Academic year updated successfully!');
			setUpdateConfirmOpen(false);
			setSelectedAcademicYear(null);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshAcademicYears();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to update academic year');
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDelete = async () => {
		if (!selectedAcademicYear || !schoolId) return;

		setDeleteLoading(true);
		try {
			await api.delete(`/academic-years/${selectedAcademicYear.academic_id}?school_id=${schoolId}`);
			toast.success('Academic year deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedAcademicYear(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshAcademicYears();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to delete academic year');
		} finally {
			setDeleteLoading(false);
		}
	};

	// Handle Set Current
	const handleSetCurrent = async (academicId: string) => {
		if (!schoolId) return;

		setCurrentUpdateLoading(academicId);
		setCurrentDropdownOpen(null);
		try {
			await api.patch(`/academic-years/${academicId}/set-current?school_id=${schoolId}`);
			toast.success('Academic year set as current successfully!');
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshAcademicYears();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to set academic year as current');
		} finally {
			setCurrentUpdateLoading(null);
		}
	};

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (currentDropdownOpen && !target.closest('[data-current-dropdown]')) {
				setCurrentDropdownOpen(null);
			}
		};

		if (currentDropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [currentDropdownOpen]);

	// Open modals
	const openViewModal = (year: AcademicYearMember) => {
		setSelectedAcademicYear(year);
		setViewModalOpen(true);
	};

	const openEditModal = (year: AcademicYearMember) => {
		setSelectedAcademicYear(year);
		setViewModalOpen(false);
		setEditModalOpen(true);
	};

	const openDeleteConfirm = (year: AcademicYearMember) => {
		setSelectedAcademicYear(year);
		setViewModalOpen(false);
		setDeleteConfirmOpen(true);
	};

	const openCreateModal = () => {
		setSelectedAcademicYear(null);
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
							<p className="mt-4 text-gray-600">Loading academic years...</p>
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
							<h1 className="text-3xl font-bold text-gray-900">Academic Year Management</h1>
							<p className="text-gray-600 mt-1">Manage your school academic years</p>
						</div>
						{!isTeacher() && !isAccountant() && (
							<button
								onClick={openCreateModal}
								className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-[3px] shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
							>
								<PlusIcon className="w-5 h-5" />
								<span>Add Academic Year</span>
							</button>
						)}
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Years</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<CalendarIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-green-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Current</p>
									<p className="text-3xl font-bold text-green-600 mt-2">{analytics.current}</p>
								</div>
								<div className="p-3 bg-green-100 rounded-[3px]">
									<CheckCircleIcon className="w-6 h-6 text-green-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-gray-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Previous</p>
									<p className="text-3xl font-bold text-gray-600 mt-2">{analytics.previous}</p>
								</div>
								<div className="p-3 bg-gray-100 rounded-[3px]">
									<XCircleIcon className="w-6 h-6 text-gray-600" />
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
									placeholder="Search by name or date..."
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
								{filters.status && (
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

					{/* Academic Years Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Academic Year
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Start Date
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											End Date
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
									{paginatedAcademicYears.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-6 py-12 text-center">
												<div className="flex flex-col items-center gap-3">
													<CalendarIcon className="w-12 h-12 text-gray-400" />
													<p className="text-gray-500 font-medium">No academic years found</p>
													<p className="text-sm text-gray-400">Try adjusting your filters</p>
												</div>
											</td>
										</tr>
									) : (
										paginatedAcademicYears.map((year) => (
											<tr key={year.academic_id} className="hover:bg-gray-50 transition-colors">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
															<CalendarIcon className="w-5 h-5 text-white" />
														</div>
														<div>
															<div className="text-sm font-semibold text-gray-900">{year.academic_name}</div>
														</div>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{formatDate(year.start_date)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{formatDate(year.end_date)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="relative inline-block" data-current-dropdown>
														<button
															onClick={(e) => {
																e.stopPropagation();
																setCurrentDropdownOpen(currentDropdownOpen === year.academic_id ? null : year.academic_id);
															}}
															disabled={currentUpdateLoading === year.academic_id}
															className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium cursor-pointer transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${
																year.is_current
																	? 'bg-green-100 text-green-800'
																	: 'bg-gray-100 text-gray-800'
															}`}
														>
															{currentUpdateLoading === year.academic_id ? (
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
																		year.is_current ? 'bg-green-500' : 'bg-gray-400'
																	}`}></span>
																	{year.is_current ? 'Current' : 'Previous'}
																	<svg className="ml-1.5 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
																	</svg>
																</>
															)}
														</button>
														
														{currentDropdownOpen === year.academic_id && (
															<div className="absolute left-0 mt-1 w-32 bg-white rounded-[3px] shadow-lg border border-gray-200 z-50 py-1">
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		handleSetCurrent(year.academic_id);
																	}}
																	disabled={year.is_current || currentUpdateLoading === year.academic_id}
																	className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
																		year.is_current
																			? 'bg-green-50 text-green-700 font-medium cursor-default'
																			: 'text-gray-700 hover:bg-gray-50 cursor-pointer'
																	} disabled:opacity-50 disabled:cursor-not-allowed`}
																>
																	<span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
																	Set Current
																</button>
															</div>
														)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{formatDate(year.created_at)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex items-center justify-end gap-2">
														<button
															onClick={() => openViewModal(year)}
															className="p-2 text-blue-600 hover:bg-blue-50 rounded-[3px] transition-colors"
															title="View"
														>
															<EyeIcon className="w-5 h-5" />
														</button>
														{!isTeacher() && !isAccountant() && (
															<>
																<button
																	onClick={() => openEditModal(year)}
																	className="p-2 text-green-600 hover:bg-green-50 rounded-[3px] transition-colors"
																	title="Edit"
																>
																	<PencilIcon className="w-5 h-5" />
																</button>
																<button
																	onClick={() => openDeleteConfirm(year)}
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
									Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAcademicYears.length)} of {filteredAcademicYears.length} academic years
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
				title="Create Academic Year"
				size="xl"
			>
				<AcademicYearForm
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
					setSelectedAcademicYear(null);
				}}
				title="Edit Academic Year"
				size="xl"
			>
				{selectedAcademicYear && (
					<AcademicYearForm
						academicYear={selectedAcademicYear}
						onSubmit={handleUpdateSubmit}
						onCancel={() => {
							setEditModalOpen(false);
							setSelectedAcademicYear(null);
						}}
						loading={formLoading}
						mode="edit"
					/>
				)}
			</Modal>

			{selectedAcademicYear && (
				<AcademicYearViewModal
					academicYear={selectedAcademicYear}
					isOpen={viewModalOpen}
					onClose={() => {
						setViewModalOpen(false);
						setSelectedAcademicYear(null);
					}}
					onEdit={() => openEditModal(selectedAcademicYear)}
					onDelete={() => openDeleteConfirm(selectedAcademicYear)}
				/>
			)}

			<ConfirmModal
				isOpen={createConfirmOpen}
				onClose={() => {
					setCreateConfirmOpen(false);
					setFormDataToSubmit(null);
				}}
				onConfirm={handleCreateConfirm}
				title="Create Academic Year"
				message={`Are you sure you want to create "${formDataToSubmit?.academic_name || 'this academic year'}"?`}
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
				title="Update Academic Year"
				message={`Are you sure you want to update "${selectedAcademicYear?.academic_name || 'this academic year'}"?`}
				confirmText="Update"
				type="info"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={deleteConfirmOpen}
				onClose={() => {
					setDeleteConfirmOpen(false);
					setSelectedAcademicYear(null);
				}}
				onConfirm={handleDelete}
				title="Delete Academic Year"
				message={`Are you sure you want to delete "${selectedAcademicYear?.academic_name || 'this academic year'}"? This action cannot be undone.`}
				confirmText="Delete"
				type="danger"
				loading={deleteLoading}
			/>
		</div>
	);
}



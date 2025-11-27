import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import {
	BanknotesIcon,
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
import FeeTypeForm from '../components/FeeTypeForm';
import FeeTypeViewModal from '../components/FeeTypeViewModal';

interface FeeTypeMember {
	fee_type_id: string;
	school_id: string;
	fee_type_name: string;
	description: string | null;
	amount_to_pay: number;
	is_active: string;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
}

interface FilterState {
	search: string;
	status: string;
}

export default function FeeTypeManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [feeTypes, setFeeTypes] = useState<FeeTypeMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		status: '',
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

	const statusOptions = ['true', 'false'];
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
	const [selectedFeeType, setSelectedFeeType] = useState<FeeTypeMember | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<FeeTypeMember> | null>(null);
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

	// Fetch fee types data using school_id from logged-in user
	useEffect(() => {
		const fetchFeeTypes = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/fee-types/?school_id=${schoolId}&_t=${timestamp}`);
				setFeeTypes(getArrayFromResponse(data));
			} catch (error: any) {
				const errorMessage = error.response?.data?.detail || 'Failed to fetch fee types';
				if (error.response?.status !== 403) {
					toast.error(errorMessage);
				}} finally {
				setLoading(false);
			}
		};

		fetchFeeTypes();
	}, [schoolId]);

	// Filtered fee types
	const filteredFeeTypes = useMemo(() => {
		return feeTypes.filter((feeType) => {
			const matchesSearch = !filters.search || 
				feeType.fee_type_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				feeType.description?.toLowerCase().includes(filters.search.toLowerCase());
			
			const matchesStatus = !filters.status || feeType.is_active === filters.status;
			
			return matchesSearch && matchesStatus;
		});
	}, [feeTypes, filters]);

	// Pagination
	const totalPages = Math.ceil(filteredFeeTypes.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedFeeTypes = useMemo(() => {
		return filteredFeeTypes.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredFeeTypes, startIndex, itemsPerPage]);

	// Analytics
	const analytics = useMemo(() => {
		const active = filteredFeeTypes.filter(ft => ft.is_active === 'true').length;
		const inactive = filteredFeeTypes.filter(ft => ft.is_active === 'false').length;
		const totalAmount = filteredFeeTypes.reduce((sum, ft) => sum + (ft.amount_to_pay || 0), 0);
		return {
			total: filteredFeeTypes.length,
			active,
			inactive,
			totalAmount,
		};
	}, [filteredFeeTypes]);

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
					setStatusFilterQuery(selectedStatus === 'true' ? 'Active' : 'Inactive');
					setShowStatusFilterDropdown(false);
				} else if (statusFilterHighlightedIndex === -1 && filteredStatusOptions.length === 1) {
					const selectedStatus = filteredStatusOptions[0];
					handleFilterChange('status', selectedStatus);
					setStatusFilterQuery(selectedStatus === 'true' ? 'Active' : 'Inactive');
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

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
		}).format(amount);
	};

	const toggleSidebar = () => {
		setSidebarOpen(!sidebarOpen);
	};

	// Refresh fee types data with cache busting
	const refreshFeeTypes = async () => {
		if (!schoolId) {
			console.warn('Cannot refresh fee types: schoolId is missing');
			return;
		}

		try {
			const timestamp = new Date().getTime();
			const { data } = await api.get(`/fee-types/?school_id=${schoolId}&_t=${timestamp}`);
			
			// Handle paginated response
			let newFeeTypesData: FeeTypeMember[] = [];
			if (data && Array.isArray(data.items)) {
				newFeeTypesData = data.items;
			} else if (Array.isArray(data)) {
				newFeeTypesData = data;
			} else {
				newFeeTypesData = getArrayFromResponse(data);
			}
			
			// Force state update by creating a new array reference
			setFeeTypes([...newFeeTypesData]);
			setCurrentPage(1);
		} catch (error: any) {
			console.error('Refresh fee types error:', error);
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to refresh fee types data';
			toast.error(errorMessage);
		}
	};

	// Handle Create (form submission - shows confirm)
	const handleCreateSubmit = async (formData: Partial<FeeTypeMember>) => {
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
			await api.post(`/fee-types/`, {
				...formDataToSubmit,
				school_id: schoolId,
			});
			toast.success('Fee type created successfully!');
			setCreateConfirmOpen(false);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshFeeTypes();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to create fee type');
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Update (form submission - shows confirm)
	const handleUpdateSubmit = async (formData: Partial<FeeTypeMember>) => {
		setFormDataToSubmit(formData);
		setEditModalOpen(false);
		setUpdateConfirmOpen(true);
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!selectedFeeType || !schoolId || !formDataToSubmit) return;

		setFormLoading(true);
		try {
			await api.put(`/fee-types/${selectedFeeType.fee_type_id}?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Fee type updated successfully!');
			setUpdateConfirmOpen(false);
			setSelectedFeeType(null);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshFeeTypes();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to update fee type');
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDelete = async () => {
		if (!selectedFeeType || !schoolId) return;

		setDeleteLoading(true);
		try {
			await api.delete(`/fee-types/${selectedFeeType.fee_type_id}?school_id=${schoolId}`);
			toast.success('Fee type deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedFeeType(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshFeeTypes();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to delete fee type');
		} finally {
			setDeleteLoading(false);
		}
	};

	// Open modals
	const openViewModal = (feeType: FeeTypeMember) => {
		setSelectedFeeType(feeType);
		setViewModalOpen(true);
	};

	const openEditModal = (feeType: FeeTypeMember) => {
		setSelectedFeeType(feeType);
		setViewModalOpen(false);
		setEditModalOpen(true);
	};

	const openDeleteConfirm = (feeType: FeeTypeMember) => {
		setSelectedFeeType(feeType);
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
							<p className="mt-4 text-gray-600">Loading fee types...</p>
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
							<h1 className="text-3xl font-bold text-gray-900">Fee Type Management</h1>
							<p className="text-gray-600 mt-1">Manage fee types and their amounts</p>
						</div>
						<button
							onClick={() => setCreateModalOpen(true)}
							className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors font-medium"
						>
							<PlusIcon className="w-5 h-5" />
							<span>Add Fee Type</span>
						</button>
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Fee Types</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<BanknotesIcon className="w-6 h-6 text-blue-600" />
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
									<SparklesIcon className="w-6 h-6 text-green-600" />
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
									<BanknotesIcon className="w-6 h-6 text-red-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-purple-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Amount</p>
									<p className="text-3xl font-bold text-purple-600 mt-2">{formatCurrency(analytics.totalAmount)}</p>
								</div>
								<div className="p-3 bg-purple-100 rounded-[3px]">
									<BanknotesIcon className="w-6 h-6 text-purple-600" />
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
									placeholder="Search by name or description..."
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
								{(filters.status) && (
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
											value={filters.status ? (filters.status === 'true' ? 'Active' : 'Inactive') : statusFilterQuery}
											onChange={(e) => {
												const value = e.target.value.toLowerCase();
												if (value === 'active' || value === 'true') {
													setStatusFilterQuery('Active');
													handleFilterChange('status', 'true');
												} else if (value === 'inactive' || value === 'false') {
													setStatusFilterQuery('Inactive');
													handleFilterChange('status', 'false');
												} else {
													setStatusFilterQuery(e.target.value);
												}
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
															setStatusFilterQuery(status === 'true' ? 'Active' : 'Inactive');
															setShowStatusFilterDropdown(false);
														}}
														onMouseEnter={() => setStatusFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === statusFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.status === status ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">
															{status === 'true' ? 'Active' : 'Inactive'}
														</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Fee Types Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Fee Type
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Amount
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Status
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Description
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
									{paginatedFeeTypes.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-6 py-12 text-center">
												<div className="flex flex-col items-center gap-3">
													<BanknotesIcon className="w-12 h-12 text-gray-400" />
													<p className="text-gray-500 font-medium">No fee types found</p>
													<p className="text-sm text-gray-400">Try adjusting your filters or add a new fee type</p>
												</div>
											</td>
										</tr>
									) : (
										paginatedFeeTypes.map((feeType) => (
											<tr key={feeType.fee_type_id} className="hover:bg-gray-50 transition-colors">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
															<BanknotesIcon className="w-5 h-5 text-white" />
														</div>
														<div className="text-sm font-semibold text-gray-900">{feeType.fee_type_name}</div>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">{formatCurrency(feeType.amount_to_pay || 0)}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													{feeType.is_active && (
														<span className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium ${
															feeType.is_active === 'true' 
																? 'bg-green-100 text-green-800' 
																: 'bg-red-100 text-red-800'
														}`}>
															{feeType.is_active === 'true' ? 'Active' : 'Inactive'}
														</span>
													)}
												</td>
												<td className="px-6 py-4">
													<div className="text-sm text-gray-900 max-w-md truncate">
														{feeType.description || '—'}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{formatDate(feeType.created_at)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex items-center justify-end gap-2">
														<button
															onClick={() => openViewModal(feeType)}
															className="p-2 text-blue-600 hover:bg-blue-50 rounded-[3px] transition-colors"
															title="View"
														>
															<EyeIcon className="w-5 h-5" />
														</button>
														<button
															onClick={() => openEditModal(feeType)}
															className="p-2 text-green-600 hover:bg-green-50 rounded-[3px] transition-colors"
															title="Edit"
														>
															<PencilIcon className="w-5 h-5" />
														</button>
														<button
															onClick={() => openDeleteConfirm(feeType)}
															className="p-2 text-red-600 hover:bg-red-50 rounded-[3px] transition-colors"
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
									Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredFeeTypes.length)} of {filteredFeeTypes.length} fee types
								</div>
							</div>
						)}
					</div>
				</main>
			</div>

			{/* Modals */}
			<Modal
				isOpen={createModalOpen}
				onClose={() => {
					setCreateModalOpen(false);
				}}
				title="Create Fee Type"
				size="xl"
			>
				<FeeTypeForm
					onSubmit={handleCreateSubmit}
					onCancel={() => {
						setCreateModalOpen(false);
					}}
					loading={formLoading}
					mode="create"
					schoolId={schoolId || ''}
				/>
			</Modal>

			<Modal
				isOpen={editModalOpen}
				onClose={() => {
					setEditModalOpen(false);
					setSelectedFeeType(null);
				}}
				title="Edit Fee Type"
				size="xl"
			>
				{selectedFeeType && (
					<FeeTypeForm
						feeType={selectedFeeType}
						onSubmit={handleUpdateSubmit}
						onCancel={() => {
							setEditModalOpen(false);
							setSelectedFeeType(null);
						}}
						loading={formLoading}
						mode="edit"
						schoolId={schoolId || ''}
					/>
				)}
			</Modal>

			{selectedFeeType && (
				<FeeTypeViewModal
					feeType={selectedFeeType}
					isOpen={viewModalOpen}
					onClose={() => {
						setViewModalOpen(false);
						setSelectedFeeType(null);
					}}
					onEdit={() => openEditModal(selectedFeeType)}
					onDelete={() => openDeleteConfirm(selectedFeeType)}
				/>
			)}

			<ConfirmModal
				isOpen={createConfirmOpen}
				onClose={() => {
					setCreateConfirmOpen(false);
					setFormDataToSubmit(null);
				}}
				onConfirm={handleCreateConfirm}
				title="Create Fee Type"
				message="Are you sure you want to create this fee type?"
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
				title="Update Fee Type"
				message={`Are you sure you want to update "${selectedFeeType?.fee_type_name || 'this fee type'}"?`}
				confirmText="Update"
				type="info"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={deleteConfirmOpen}
				onClose={() => {
					setDeleteConfirmOpen(false);
					setSelectedFeeType(null);
				}}
				onConfirm={handleDelete}
				title="Delete Fee Type"
				message={`Are you sure you want to delete "${selectedFeeType?.fee_type_name || 'this fee type'}"? This action cannot be undone.`}
				confirmText="Delete"
				type="danger"
				loading={deleteLoading}
			/>
		</div>
	);
}


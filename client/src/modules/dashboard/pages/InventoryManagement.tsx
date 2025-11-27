import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
	MagnifyingGlassIcon,
	PlusIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon,
	CubeIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import InventoryForm from '../components/InventoryForm';
import InventoryViewModal from '../components/InventoryViewModal';

interface InventoryItem {
	inv_id: string;
	school_id: string;
	inv_name: string;
	inv_service: string | null;
	inv_desc: string | null;
	inv_date: string | null;
	inv_price: number | null;
	inv_status: string | null;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
}

interface FilterState {
	search: string;
	status: string;
	service: string;
}

export default function InventoryManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [inventory, setInventory] = useState<InventoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		status: '',
		service: '',
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

	const [serviceFilterQuery, setServiceFilterQuery] = useState('');
	const [showServiceFilterDropdown, setShowServiceFilterDropdown] = useState(false);
	const [serviceFilterHighlightedIndex, setServiceFilterHighlightedIndex] = useState(-1);
	const serviceFilterDropdownRef = useRef<HTMLDivElement>(null);
	const serviceFilterInputRef = useRef<HTMLInputElement>(null);

	const statusOptions = ['Available', 'In Use', 'Maintenance', 'Disposed', 'Reserved'];
	const serviceOptions = useMemo(() => {
		const services = new Set<string>();
		inventory.forEach((item) => {
			if (item.inv_service) {
				services.add(item.inv_service);
			}
		});
		return Array.from(services).sort();
	}, [inventory]);

	// Modal states
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<InventoryItem> | null>(null);
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

	// Filter options based on search queries
	const filteredStatusOptions = statusOptions.filter((status) => {
		if (!statusFilterQuery.trim()) return true;
		return status.toLowerCase().includes(statusFilterQuery.toLowerCase());
	});

	const filteredServiceOptions = serviceOptions.filter((service) => {
		if (!serviceFilterQuery.trim()) return true;
		return service.toLowerCase().includes(serviceFilterQuery.toLowerCase());
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
				serviceFilterDropdownRef.current &&
				!serviceFilterDropdownRef.current.contains(target) &&
				serviceFilterInputRef.current &&
				!serviceFilterInputRef.current.contains(target)
			) {
				setShowServiceFilterDropdown(false);
			}
		};

		if (showStatusFilterDropdown || showServiceFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showStatusFilterDropdown, showServiceFilterDropdown]);

	// Fetch inventory data
	useEffect(() => {
		const fetchInventory = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const { data } = await api.get(`/inventory/?school_id=${schoolId}`);
				setInventory(data || []);
			} catch (error: any) {
				const errorMessage = error.response?.data?.detail || 'Failed to load inventory';
				toast.error(errorMessage);
				setInventory([]);
			} finally {
				setLoading(false);
			}
		};

		fetchInventory();
	}, [schoolId]);

	// Filter and paginate inventory
	const filteredInventory = useMemo(() => {
		let filtered = inventory.filter((item) => !item.is_deleted);

		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			filtered = filtered.filter(
				(item) =>
					item.inv_name?.toLowerCase().includes(searchLower) ||
					item.inv_service?.toLowerCase().includes(searchLower) ||
					item.inv_desc?.toLowerCase().includes(searchLower)
			);
		}

		if (filters.status) {
			filtered = filtered.filter((item) => item.inv_status === filters.status);
		}

		if (filters.service) {
			filtered = filtered.filter((item) => item.inv_service === filters.service);
		}

		return filtered;
	}, [inventory, filters]);

	// Pagination
	const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedInventory = useMemo(() => {
		return filteredInventory.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredInventory, startIndex, itemsPerPage]);

	// Analytics
	const analytics = useMemo(() => {
		const total = filteredInventory.length;
		const available = filteredInventory.filter((item) => item.inv_status === 'Available').length;
		const inUse = filteredInventory.filter((item) => item.inv_status === 'In Use').length;
		const maintenance = filteredInventory.filter((item) => item.inv_status === 'Maintenance').length;
		const totalValue = filteredInventory.reduce((sum, item) => sum + (item.inv_price || 0), 0);

		return {
			total,
			available,
			inUse,
			maintenance,
			totalValue,
		};
	}, [filteredInventory]);

	// Filter handlers
	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const handleClearFilters = () => {
		setFilters({
			search: '',
			status: '',
			service: '',
		});
		setStatusFilterQuery('');
		setServiceFilterQuery('');
		setCurrentPage(1);
	};

	// Modal handlers
	const handleCreate = () => {
		setSelectedInventory(null);
		setFormDataToSubmit(null);
		setCreateModalOpen(true);
	};

	const handleEdit = (item: InventoryItem) => {
		setSelectedInventory(item);
		setFormDataToSubmit(null);
		setEditModalOpen(true);
	};

	const handleView = (item: InventoryItem) => {
		setSelectedInventory(item);
		setViewModalOpen(true);
	};

	const handleDelete = (item: InventoryItem) => {
		setSelectedInventory(item);
		setDeleteConfirmOpen(true);
	};

	// Form submission handlers
	const handleCreateSubmit = async (data: Partial<InventoryItem>) => {
		setFormDataToSubmit(data);
		setCreateConfirmOpen(true);
	};

	const handleUpdateSubmit = async (data: Partial<InventoryItem>) => {
		setFormDataToSubmit(data);
		setUpdateConfirmOpen(true);
	};

	const confirmCreate = async () => {
		if (!formDataToSubmit || !schoolId) return;

		try {
			setFormLoading(true);
			const payload = {
				...formDataToSubmit,
				school_id: schoolId,
			};
			await api.post('/inventory/', payload);
			toast.success('Inventory item created successfully!');
			setCreateConfirmOpen(false);
			setCreateModalOpen(false);
			
			// Refresh inventory
			const { data } = await api.get(`/inventory/?school_id=${schoolId}`);
			setInventory(data || []);
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to create inventory item');
		} finally {
			setFormLoading(false);
			setFormDataToSubmit(null);
		}
	};

	const confirmUpdate = async () => {
		if (!formDataToSubmit || !selectedInventory || !schoolId) return;

		try {
			setFormLoading(true);
			await api.put(`/inventory/${selectedInventory.inv_id}?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Inventory item updated successfully!');
			setUpdateConfirmOpen(false);
			setEditModalOpen(false);
			
			// Refresh inventory
			const { data } = await api.get(`/inventory/?school_id=${schoolId}`);
			setInventory(data || []);
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to update inventory item');
		} finally {
			setFormLoading(false);
			setFormDataToSubmit(null);
			setSelectedInventory(null);
		}
	};

	const confirmDelete = async () => {
		if (!selectedInventory || !schoolId) return;

		try {
			setDeleteLoading(true);
			await api.delete(`/inventory/${selectedInventory.inv_id}?school_id=${schoolId}`);
			toast.success('Inventory item deleted successfully!');
			setDeleteConfirmOpen(false);
			
			// Refresh inventory
			const { data } = await api.get(`/inventory/?school_id=${schoolId}`);
			setInventory(data || []);
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to delete inventory item');
		} finally {
			setDeleteLoading(false);
			setSelectedInventory(null);
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
		}).format(amount);
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	const getStatusBadge = (status: string | null) => {
		if (!status) return null;

		const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
			Available: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
			'In Use': { bg: 'bg-blue-100', text: 'text-blue-800', icon: ClockIcon },
			Maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
			Disposed: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
			Reserved: { bg: 'bg-purple-100', text: 'text-purple-800', icon: ClockIcon },
		};

		const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: ClockIcon };
		const Icon = config.icon;

		return (
			<span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
				<Icon className="w-3 h-3" />
				{status}
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
							<p className="mt-4 text-gray-600">Loading inventory...</p>
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
							<h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
							<p className="text-gray-600 mt-1">Manage school inventory items and assets</p>
						</div>
						<button
							onClick={handleCreate}
							className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors font-medium"
						>
							<PlusIcon className="w-5 h-5" />
							<span>Add Item</span>
						</button>
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Items</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<CubeIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-green-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Available</p>
									<p className="text-3xl font-bold text-green-600 mt-2">{analytics.available}</p>
								</div>
								<div className="p-3 bg-green-100 rounded-[3px]">
									<CheckCircleIcon className="w-6 h-6 text-green-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">In Use</p>
									<p className="text-3xl font-bold text-blue-600 mt-2">{analytics.inUse}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<ClockIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-yellow-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Maintenance</p>
									<p className="text-3xl font-bold text-yellow-600 mt-2">{analytics.maintenance}</p>
								</div>
								<div className="p-3 bg-yellow-100 rounded-[3px]">
									<ClockIcon className="w-6 h-6 text-yellow-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-purple-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Value</p>
									<p className="text-3xl font-bold text-purple-600 mt-2">{formatCurrency(analytics.totalValue)}</p>
								</div>
								<div className="p-3 bg-purple-100 rounded-[3px]">
									<CubeIcon className="w-6 h-6 text-purple-600" />
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
									placeholder="Search by name, service, or description..."
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
								{(filters.status || filters.service) && (
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
							<div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

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
															<div className="text-sm font-medium text-gray-900">{status}</div>
														</button>
													))}
												</div>
											)}
										</div>
									</div>

								{/* Service Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
										<div className="relative">
											<input
												ref={serviceFilterInputRef}
												type="text"
												value={filters.service || serviceFilterQuery}
												onChange={(e) => {
													setServiceFilterQuery(e.target.value);
													setShowServiceFilterDropdown(true);
													setServiceFilterHighlightedIndex(-1);
													if (!e.target.value.trim()) {
														setShowServiceFilterDropdown(false);
														handleFilterChange('service', '');
													}
												}}
												onFocus={() => {
													if (filteredServiceOptions.length > 0) {
														setShowServiceFilterDropdown(true);
													}
												}}
												placeholder="All Services"
												className="w-full px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
											/>
											{showServiceFilterDropdown && filteredServiceOptions.length > 0 && (
												<div
													ref={serviceFilterDropdownRef}
													className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
												>
													<button
														type="button"
														onClick={() => {
															handleFilterChange('service', '');
															setServiceFilterQuery('');
															setShowServiceFilterDropdown(false);
														}}
														className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
													>
														<div className="text-sm font-medium text-gray-900">All Services</div>
													</button>
													{filteredServiceOptions.map((service, index) => (
														<button
															key={service}
															type="button"
															onClick={() => {
																handleFilterChange('service', service);
																setServiceFilterQuery(service);
																setShowServiceFilterDropdown(false);
															}}
															className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
																filters.service === service ? 'bg-primary-100 font-medium' : ''
															}`}
														>
															<div className="text-sm font-medium text-gray-900">{service}</div>
														</button>
													))}
												</div>
											)}
										</div>
									</div>
								</div>
							)}
					</div>

					{/* Inventory Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Item Name
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Service
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Date
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Price
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
												<td colSpan={6} className="px-6 py-8 text-center">
													<div className="flex items-center justify-center">
														<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
													</div>
												</td>
											</tr>
										) : paginatedInventory.length === 0 ? (
											<tr>
												<td colSpan={6} className="px-6 py-8 text-center text-gray-500">
													No inventory items found
												</td>
											</tr>
										) : (
											paginatedInventory.map((item) => (
												<tr key={item.inv_id} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm font-medium text-gray-900">{item.inv_name}</div>
														{item.inv_desc && (
															<div className="text-sm text-gray-500 truncate max-w-xs">{item.inv_desc}</div>
														)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm text-gray-900">{item.inv_service || 'N/A'}</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm text-gray-900">{formatDate(item.inv_date)}</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm font-medium text-gray-900">
															{item.inv_price ? formatCurrency(item.inv_price) : 'N/A'}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.inv_status)}</td>
													<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
														<div className="flex items-center justify-end gap-2">
															<button
																onClick={() => handleView(item)}
																className="text-primary-600 hover:text-primary-900 p-1"
																title="View"
															>
																<EyeIcon className="w-5 h-5" />
															</button>
															<button
																onClick={() => handleEdit(item)}
																className="text-blue-600 hover:text-blue-900 p-1"
																title="Edit"
															>
																<PencilIcon className="w-5 h-5" />
															</button>
															<button
																onClick={() => handleDelete(item)}
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
											Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredInventory.length)} of{' '}
											{filteredInventory.length} items
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
			<Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Inventory Item" size="lg">
				<InventoryForm
					inventory={null}
					onSubmit={handleCreateSubmit}
					onCancel={() => setCreateModalOpen(false)}
					loading={formLoading}
					mode="create"
					schoolId={schoolId || ''}
				/>
			</Modal>

			<Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Inventory Item" size="lg">
				<InventoryForm
					inventory={selectedInventory}
					onSubmit={handleUpdateSubmit}
					onCancel={() => setEditModalOpen(false)}
					loading={formLoading}
					mode="edit"
					schoolId={schoolId || ''}
				/>
			</Modal>

			<InventoryViewModal
				inventory={selectedInventory}
				isOpen={viewModalOpen}
				onClose={() => setViewModalOpen(false)}
				onEdit={() => {
					setViewModalOpen(false);
					handleEdit(selectedInventory!);
				}}
				onDelete={() => {
					setViewModalOpen(false);
					handleDelete(selectedInventory!);
				}}
			/>

			<ConfirmModal
				isOpen={createConfirmOpen}
				onClose={() => setCreateConfirmOpen(false)}
				onConfirm={confirmCreate}
				title="Create Inventory Item"
				message="Are you sure you want to create this inventory item?"
				confirmText="Create"
				cancelText="Cancel"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={updateConfirmOpen}
				onClose={() => setUpdateConfirmOpen(false)}
				onConfirm={confirmUpdate}
				title="Update Inventory Item"
				message="Are you sure you want to update this inventory item?"
				confirmText="Update"
				cancelText="Cancel"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={confirmDelete}
				title="Delete Inventory Item"
				message={`Are you sure you want to delete "${selectedInventory?.inv_name}"? This action cannot be undone.`}
				confirmText="Delete"
				cancelText="Cancel"
				loading={deleteLoading}
				danger
			/>
		</div>
	);
}


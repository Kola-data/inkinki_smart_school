import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../../components/ConfirmModal';
import Modal from '../../../../components/Modal';
import { convertFileToBase64, validateFileSize, validateImageFile } from '../../../../utils/fileUtils';
import {
	BuildingOfficeIcon,
	PlusIcon,
	ExclamationTriangleIcon,
	BellIcon,
	CurrencyDollarIcon,
	MagnifyingGlassIcon,
	FunnelIcon,
	XMarkIcon,
	EyeIcon,
	UserPlusIcon,
	CheckCircleIcon,
	XCircleIcon,
	CheckIcon,
	TrashIcon,
} from '@heroicons/react/24/outline';

interface Analytics {
	schools: {
		total: number;
		active: number;
		inactive: number;
		new_last_30_days: number;
	};
	logs: {
		total: number;
		errors: number;
		unread: number;
	};
	payments: {
		total_payments: number;
		pending_payments: number;
		completed_payments: number;
		total_amount: number;
	};
}

interface School {
	school_id: string;
	school_name: string;
	school_address?: string;
	school_phone?: string;
	school_email?: string;
	school_logo?: string;
	school_ownership?: string;
	is_active: boolean;
	created_at: string;
	updated_at?: string;
}

interface Log {
	log_id: string;
	action: string;
	message?: string;
	status: string;
	error_message?: string;
	is_fixed?: boolean;
	created_at: string;
}

export default function SystemAnalytics() {
	const [analytics, setAnalytics] = useState<Analytics | null>(null);
	const [schools, setSchools] = useState<School[]>([]);
	const [logs, setLogs] = useState<Log[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<'overview' | 'schools' | 'logs'>('overview');
	const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
	const [showSchoolDetailsModal, setShowSchoolDetailsModal] = useState(false);
	const [showAddStaffModal, setShowAddStaffModal] = useState(false);
	const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
	const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);
	const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
	const [pendingStatusChange, setPendingStatusChange] = useState<{ schoolId: string; newStatus: boolean } | null>(null);
	
	// Confirm modals for logs operations
	const [showDeleteLogsModal, setShowDeleteLogsModal] = useState(false);
	const [showMarkFixedModal, setShowMarkFixedModal] = useState(false);
	
	// Filters
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('');
	const [isFixedFilter, setIsFixedFilter] = useState<boolean | null>(null);
	const [showFilters, setShowFilters] = useState(false);
	
	// Pagination for logs
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(50);
	const [totalLogs, setTotalLogs] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	
	// Selected logs for bulk operations
	const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
	const [markFixedLoading, setMarkFixedLoading] = useState(false);
	const [deleteLogsLoading, setDeleteLogsLoading] = useState(false);

	// Autocomplete states for status filters
	const [statusFilterQuery, setStatusFilterQuery] = useState('');
	const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
	const [statusFilterHighlightedIndex, setStatusFilterHighlightedIndex] = useState(-1);
	const statusFilterDropdownRef = useRef<HTMLDivElement>(null);
	const statusFilterInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for fixed filter
	const [isFixedFilterQuery, setIsFixedFilterQuery] = useState('All');
	const [showIsFixedFilterDropdown, setShowIsFixedFilterDropdown] = useState(false);
	const [isFixedFilterHighlightedIndex, setIsFixedFilterHighlightedIndex] = useState(-1);
	const isFixedFilterDropdownRef = useRef<HTMLDivElement>(null);
	const isFixedFilterInputRef = useRef<HTMLInputElement>(null);

	const schoolStatusOptions = ['active', 'inactive'];
	const isFixedOptions = ['All', 'Not Fixed', 'Fixed'];

	// Filter options based on search queries
	const filteredSchoolStatusOptions = schoolStatusOptions.filter((status) => {
		if (!statusFilterQuery.trim()) return true;
		return status.toLowerCase().includes(statusFilterQuery.toLowerCase());
	});

	const filteredIsFixedOptions = isFixedOptions.filter((option) => {
		if (!isFixedFilterQuery.trim()) return true;
		return option.toLowerCase().includes(isFixedFilterQuery.toLowerCase());
	});

	// Keyboard navigation handlers
	const handleSchoolStatusFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showStatusFilterDropdown || filteredSchoolStatusOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setStatusFilterHighlightedIndex((prev) => (prev < filteredSchoolStatusOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setStatusFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (statusFilterHighlightedIndex >= 0 && statusFilterHighlightedIndex < filteredSchoolStatusOptions.length) {
					setStatusFilter(filteredSchoolStatusOptions[statusFilterHighlightedIndex]);
					setStatusFilterQuery(filteredSchoolStatusOptions[statusFilterHighlightedIndex].charAt(0).toUpperCase() + filteredSchoolStatusOptions[statusFilterHighlightedIndex].slice(1));
					setShowStatusFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowStatusFilterDropdown(false);
				setStatusFilterHighlightedIndex(-1);
				break;
		}
	};

	const handleIsFixedFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showIsFixedFilterDropdown || filteredIsFixedOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setIsFixedFilterHighlightedIndex((prev) => (prev < filteredIsFixedOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setIsFixedFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (isFixedFilterHighlightedIndex >= 0 && isFixedFilterHighlightedIndex < filteredIsFixedOptions.length) {
					const selectedOption = filteredIsFixedOptions[isFixedFilterHighlightedIndex];
					if (selectedOption === 'All') {
						setIsFixedFilter(null);
						setIsFixedFilterQuery('All');
					} else if (selectedOption === 'Fixed') {
						setIsFixedFilter(true);
						setIsFixedFilterQuery('Fixed');
					} else if (selectedOption === 'Not Fixed') {
						setIsFixedFilter(false);
						setIsFixedFilterQuery('Not Fixed');
					}
					setShowIsFixedFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowIsFixedFilterDropdown(false);
				setIsFixedFilterHighlightedIndex(-1);
				break;
		}
	};

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				(statusFilterDropdownRef.current && !statusFilterDropdownRef.current.contains(target) && statusFilterInputRef.current && !statusFilterInputRef.current.contains(target)) ||
				(isFixedFilterDropdownRef.current && !isFixedFilterDropdownRef.current.contains(target) && isFixedFilterInputRef.current && !isFixedFilterInputRef.current.contains(target))
			) {
				if (showStatusFilterDropdown) setShowStatusFilterDropdown(false);
				if (showIsFixedFilterDropdown) setShowIsFixedFilterDropdown(false);
			}
		};

		if (showStatusFilterDropdown || showIsFixedFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showStatusFilterDropdown, showIsFixedFilterDropdown]);

	useEffect(() => {
		fetchAnalytics();
		fetchSchools();
		// Fetch logs on first load
		fetchLogs();
	}, []);

	const fetchAnalytics = async () => {
		try {
			const { data } = await api.get('/system-analytics/');
			setAnalytics(data);
		} catch (err: any) {
			toast.error('Failed to fetch analytics');
		}
	};

	const fetchSchools = async () => {
		try {
			const { data } = await api.get('/system-analytics/schools');
			setSchools(data.schools || []);
		} catch (err: any) {
			toast.error('Failed to fetch schools');
		}
	};

	const fetchLogs = useCallback(async () => {
		try {
			setLoading(true);
			
			// Build query parameters
			const params = new URLSearchParams();
			params.append('page', String(currentPage));
			params.append('page_size', String(itemsPerPage));
			if (isFixedFilter !== null) params.append('is_fixed', String(isFixedFilter));
			if (searchQuery) params.append('search', searchQuery);
			
			const url = `/system-analytics/logs?${params.toString()}`;
			const { data } = await api.get(url);
			setLogs(data.logs || []);
			setTotalLogs(data.total || 0);
			setTotalPages(data.total_pages || 0);
		} catch (err: any) {
			toast.error('Failed to fetch logs');
		} finally {
			setLoading(false);
		}
	}, [currentPage, itemsPerPage, isFixedFilter, searchQuery]);

	// Filter schools
	const filteredSchools = useMemo(() => {
		let filtered = schools;
		
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(s => 
				s.school_name.toLowerCase().includes(query)
			);
		}
		
		if (statusFilter) {
			if (statusFilter === 'active') {
				filtered = filtered.filter(s => s.is_active);
			} else if (statusFilter === 'inactive') {
				filtered = filtered.filter(s => !s.is_active);
			}
		}
		
		return filtered;
	}, [schools, searchQuery, statusFilter]);

	// Filter logs is now handled by backend with pagination
	
	// Handle log selection
	const handleLogSelect = (logId: string) => {
		setSelectedLogs(prev => {
			const newSet = new Set(prev);
			if (newSet.has(logId)) {
				newSet.delete(logId);
			} else {
				newSet.add(logId);
			}
			return newSet;
		});
	};
	
	const handleSelectAll = () => {
		if (selectedLogs.size === logs.length) {
			setSelectedLogs(new Set());
		} else {
			setSelectedLogs(new Set(logs.map(log => log.log_id)));
		}
	};
	
	// Mark selected logs as fixed - show confirm modal
	const handleMarkAsFixedRequest = () => {
		if (selectedLogs.size === 0) {
			toast.error('Please select at least one log');
			return;
		}
		setShowMarkFixedModal(true);
	};
		
	// Mark selected logs as fixed - confirmed
	const handleMarkAsFixed = async () => {
		setShowMarkFixedModal(false);
		setMarkFixedLoading(true);
		try {
			await api.patch('/system-analytics/logs/mark-fixed', { log_ids: Array.from(selectedLogs) });
			toast.success(`Marked ${selectedLogs.size} log(s) as fixed`);
			setSelectedLogs(new Set());
			await fetchLogs();
		} catch (err: any) {
			toast.error(getErrorMessage(err, 'Failed to mark logs as fixed'));
		} finally {
			setMarkFixedLoading(false);
		}
	};
	
	// Delete selected logs - show confirm modal
	const handleDeleteLogsRequest = () => {
		if (selectedLogs.size === 0) {
			toast.error('Please select at least one log');
			return;
		}
		setShowDeleteLogsModal(true);
	};
	
	// Delete selected logs - confirmed
	const handleDeleteLogs = async () => {
		setShowDeleteLogsModal(false);
		setDeleteLogsLoading(true);
		try {
			await api.post('/system-analytics/logs/delete', { log_ids: Array.from(selectedLogs) });
			toast.success(`Deleted ${selectedLogs.size} log(s)`);
			setSelectedLogs(new Set());
			await fetchLogs();
		} catch (err: any) {
			toast.error(getErrorMessage(err, 'Failed to delete logs'));
		} finally {
			setDeleteLogsLoading(false);
		}
	};

	const resetFilters = () => {
		setSearchQuery('');
		setStatusFilter('');
		setIsFixedFilter(null);
		setStatusFilterQuery('');
		setIsFixedFilterQuery('All');
		setCurrentPage(1);
		fetchLogs();
	};
	
	// Apply filters when they change - reset to page 1 and fetch
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setCurrentPage(1); // Reset to first page when filters change
		}, 500); // Debounce search
		
		return () => clearTimeout(timeoutId);
	}, [isFixedFilter, searchQuery]);
	
	// Fetch logs when pagination or filters change
	useEffect(() => {
		fetchLogs();
	}, [fetchLogs]);

	// Get school logo URL
	const getSchoolLogoUrl = (logoPath: string | null | undefined) => {
		if (!logoPath) return null;
		if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
			return logoPath;
		}
		return `http://localhost:8000/${logoPath}`;
	};

	// Format date and time
	const formatDateTime = (dateString: string) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	// Format date only
	const formatDate = (dateString: string | null | undefined) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	// Handle status update request (shows confirm modal)
	const handleStatusUpdateRequest = (schoolId: string, newStatus: boolean) => {
		setPendingStatusChange({ schoolId, newStatus });
		setShowStatusConfirmModal(true);
		setStatusDropdownOpen(null);
	};

	// Handle status update confirmation
	const handleStatusUpdateConfirm = async () => {
		if (!pendingStatusChange) return;
		
		setStatusUpdateLoading(pendingStatusChange.schoolId);
		setShowStatusConfirmModal(false);
		
		try {
			// Use the correct activate/deactivate endpoints
			if (pendingStatusChange.newStatus) {
				await api.patch(`/school/${pendingStatusChange.schoolId}/activate`);
			} else {
				await api.patch(`/school/${pendingStatusChange.schoolId}/deactivate`);
			}
			toast.success(`School status updated to ${pendingStatusChange.newStatus ? 'active' : 'inactive'} successfully!`);
			await fetchSchools();
		} catch (err: any) {
			toast.error(getErrorMessage(err, 'Failed to update school status'));
		} finally {
			setStatusUpdateLoading(null);
			setPendingStatusChange(null);
		}
	};

	// Close status dropdown when clicking outside
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

	// Handle view school details
	const handleViewSchool = (school: School) => {
		setSelectedSchool(school);
		setShowSchoolDetailsModal(true);
	};

	// Handle add staff
	const handleAddStaff = (school: School) => {
		setSelectedSchool(school);
		setShowAddStaffModal(true);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">System Analytics</h1>
					<p className="text-gray-600 mt-1">Overview of all schools, logs, and payments</p>
				</div>
			</div>

			{/* Tabs */}
			<div className="bg-white rounded-[3px] shadow-card border border-gray-100">
				<div className="border-b border-gray-200">
					<nav className="-mb-px flex space-x-8 px-6">
						<button
							onClick={() => setActiveTab('overview')}
							className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
								activeTab === 'overview'
									? 'border-indigo-500 text-indigo-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
							}`}
						>
							Overview
						</button>
						<button
							onClick={() => setActiveTab('schools')}
							className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
								activeTab === 'schools'
									? 'border-indigo-500 text-indigo-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
							}`}
						>
							Schools
						</button>
						<button
							onClick={() => setActiveTab('logs')}
							className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
								activeTab === 'logs'
									? 'border-indigo-500 text-indigo-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
							}`}
						>
							Logs
						</button>
					</nav>
				</div>
			</div>

			{/* Overview Tab */}
			{activeTab === 'overview' && analytics && (
				<div className="space-y-6">
					{/* Stats Cards */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{/* Total Schools */}
						<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden hover:shadow-lg transition-all duration-200">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Total Schools</p>
									<p className="text-3xl font-bold text-gray-900">{analytics.schools.total}</p>
									<div className="mt-4 flex space-x-4 text-sm">
										<span className="text-green-600">Active: {analytics.schools.active}</span>
										<span className="text-gray-600">Inactive: {analytics.schools.inactive}</span>
									</div>
								</div>
								<div className="w-12 h-12 rounded-[3px] bg-blue-100 flex items-center justify-center shadow-sm">
									<BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						{/* New Schools */}
						<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden hover:shadow-lg transition-all duration-200">
							<div className="absolute top-0 left-0 right-0 h-1 bg-green-600"></div>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">New Schools (30d)</p>
									<p className="text-3xl font-bold text-gray-900">{analytics.schools.new_last_30_days}</p>
									<p className="text-xs text-gray-500 mt-2">Last 30 days</p>
								</div>
								<div className="w-12 h-12 rounded-[3px] bg-green-100 flex items-center justify-center shadow-sm">
									<PlusIcon className="w-6 h-6 text-green-600" />
								</div>
							</div>
						</div>

						{/* Error Logs */}
						<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden hover:shadow-lg transition-all duration-200">
							<div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Error Logs</p>
									<p className="text-3xl font-bold text-red-600">{analytics.logs.errors}</p>
									<p className="text-xs text-gray-500 mt-2">Total: {analytics.logs.total}</p>
								</div>
								<div className="w-12 h-12 rounded-[3px] bg-red-100 flex items-center justify-center shadow-sm">
									<ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
								</div>
							</div>
						</div>

						{/* Unread Logs */}
						<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden hover:shadow-lg transition-all duration-200">
							<div className="absolute top-0 left-0 right-0 h-1 bg-yellow-600"></div>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Unread Logs</p>
									<p className="text-3xl font-bold text-yellow-600">{analytics.logs.unread}</p>
									<p className="text-xs text-gray-500 mt-2">Last 24 hours</p>
								</div>
								<div className="w-12 h-12 rounded-[3px] bg-yellow-100 flex items-center justify-center shadow-sm">
									<BellIcon className="w-6 h-6 text-yellow-600" />
								</div>
							</div>
						</div>
					</div>

					{/* Payments Summary */}
					<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden">
						<div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600"></div>
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-gray-900">Payments Summary</h3>
							<div className="w-10 h-10 rounded-[3px] bg-indigo-100 flex items-center justify-center">
								<CurrencyDollarIcon className="w-5 h-5 text-indigo-600" />
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
							<div>
								<p className="text-sm font-medium text-gray-600">Total Payments</p>
								<p className="text-2xl font-bold text-gray-900 mt-1">{analytics.payments.total_payments}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-gray-600">Pending</p>
								<p className="text-2xl font-bold text-yellow-600 mt-1">{analytics.payments.pending_payments}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-gray-600">Completed</p>
								<p className="text-2xl font-bold text-green-600 mt-1">{analytics.payments.completed_payments}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-gray-600">Total Amount</p>
								<p className="text-2xl font-bold text-indigo-600 mt-1">
									{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(analytics.payments.total_amount)}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Schools Tab */}
			{activeTab === 'schools' && (
				<div className="space-y-6">
					{/* Filters */}
					<div className="bg-white rounded-[3px] shadow-card border border-gray-100 p-4">
						<div className="flex flex-col sm:flex-row gap-4">
							{/* Search */}
							<div className="flex-1 relative">
								<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									type="text"
									placeholder="Search schools..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
								/>
							</div>
							
							{/* Status Filter */}
							<div className="relative">
								<input
									ref={statusFilterInputRef}
									type="text"
									value={statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : statusFilterQuery}
									onChange={(e) => {
										setStatusFilterQuery(e.target.value);
										setShowStatusFilterDropdown(true);
										setStatusFilterHighlightedIndex(-1);
										if (!e.target.value.trim()) {
											setShowStatusFilterDropdown(false);
											setStatusFilter('');
										}
									}}
									onFocus={() => {
										if (filteredSchoolStatusOptions.length > 0) {
											setShowStatusFilterDropdown(true);
										}
									}}
									onKeyDown={handleSchoolStatusFilterKeyDown}
									placeholder="All Status"
									className="px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-full"
								/>
								{showStatusFilterDropdown && filteredSchoolStatusOptions.length > 0 && (
									<div
										ref={statusFilterDropdownRef}
										className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
									>
										<button
											type="button"
											onClick={() => {
												setStatusFilter('');
												setStatusFilterQuery('');
												setShowStatusFilterDropdown(false);
											}}
											className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
										>
											<div className="text-sm font-medium text-gray-900">All Status</div>
										</button>
										{filteredSchoolStatusOptions.map((status, index) => (
											<button
												key={status}
												type="button"
												onClick={() => {
													setStatusFilter(status);
													setStatusFilterQuery(status.charAt(0).toUpperCase() + status.slice(1));
													setShowStatusFilterDropdown(false);
												}}
												onMouseEnter={() => setStatusFilterHighlightedIndex(index)}
												className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
													index === statusFilterHighlightedIndex ? 'bg-indigo-50' : ''
												} ${statusFilter === status ? 'bg-indigo-100 font-medium' : ''}`}
											>
												<div className="text-sm font-medium text-gray-900">{status.charAt(0).toUpperCase() + status.slice(1)}</div>
											</button>
										))}
									</div>
								)}
							</div>

							{(searchQuery || statusFilter) && (
								<button
									onClick={resetFilters}
									className="px-4 py-2 border border-gray-300 rounded-[3px] hover:bg-gray-50 flex items-center gap-2"
								>
									<XMarkIcon className="w-4 h-4" />
									Clear
								</button>
							)}
						</div>
					</div>

					{/* Schools Table */}
					<div className="bg-white rounded-[3px] shadow-card border border-gray-100 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{filteredSchools.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-6 py-8 text-center text-gray-500">
												No schools found
											</td>
										</tr>
									) : (
										filteredSchools.map((school) => {
											const logoUrl = getSchoolLogoUrl(school.school_logo);
											return (
												<tr key={school.school_id} className="hover:bg-gray-50 transition-colors">
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="flex items-center gap-3">
															{logoUrl ? (
																<img
																	src={logoUrl}
																	alt={school.school_name}
																	className="w-10 h-10 rounded-[3px] object-cover"
																/>
															) : (
																<div className="w-10 h-10 rounded-[3px] bg-indigo-100 flex items-center justify-center">
																	<BuildingOfficeIcon className="w-6 h-6 text-indigo-600" />
																</div>
															)}
															<div>
																<div className="text-sm font-medium text-gray-900">{school.school_name}</div>
																{school.school_ownership && (
																	<div className="text-xs text-gray-500">{school.school_ownership}</div>
																)}
															</div>
														</div>
													</td>
													<td className="px-6 py-4">
														<div className="text-sm text-gray-900 max-w-xs truncate">
															{school.school_address || 'N/A'}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm text-gray-900">
															{school.school_phone && (
																<div className="flex items-center gap-1">
																	<span>📞</span>
																	<span>{school.school_phone}</span>
																</div>
															)}
															{school.school_email && (
																<div className="flex items-center gap-1 mt-1">
																	<span>✉️</span>
																	<span className="text-xs">{school.school_email}</span>
																</div>
															)}
															{!school.school_phone && !school.school_email && 'N/A'}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="relative" data-status-dropdown>
															{statusUpdateLoading === school.school_id ? (
																<div className="flex items-center gap-2">
																	<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
																	<span className="text-xs text-gray-500">Updating...</span>
																</div>
															) : (
																<>
																	<button
																		type="button"
																		onClick={() => setStatusDropdownOpen(
																			statusDropdownOpen === school.school_id ? null : school.school_id
																		)}
																		className={`px-3 py-1.5 text-xs font-medium rounded-[3px] flex items-center gap-2 transition-colors ${
																			school.is_active
																				? 'bg-green-100 text-green-800 hover:bg-green-200'
																				: 'bg-red-100 text-red-800 hover:bg-red-200'
																		}`}
																	>
																		{school.is_active ? 'Active' : 'Inactive'}
																		<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
																		</svg>
																	</button>
																	{statusDropdownOpen === school.school_id && (
																		<div className="absolute z-10 mt-1 w-32 bg-white rounded-[3px] shadow-lg border border-gray-200 py-1">
																			<button
																				onClick={() => handleStatusUpdateRequest(school.school_id, true)}
																				disabled={school.is_active}
																				className={`w-full text-left px-3 py-2 text-xs transition-colors ${
																					school.is_active
																						? 'text-gray-400 cursor-not-allowed bg-gray-50'
																						: 'text-gray-700 hover:bg-gray-100'
																				}`}
																			>
																				Active
																			</button>
																			<button
																				onClick={() => handleStatusUpdateRequest(school.school_id, false)}
																				disabled={!school.is_active}
																				className={`w-full text-left px-3 py-2 text-xs transition-colors ${
																					!school.is_active
																						? 'text-gray-400 cursor-not-allowed bg-gray-50'
																						: 'text-gray-700 hover:bg-gray-100'
																				}`}
																			>
																				Inactive
																			</button>
																		</div>
																	)}
																</>
															)}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{formatDateTime(school.created_at)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
														<div className="flex items-center gap-2">
															<button
																onClick={() => handleViewSchool(school)}
																className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-[3px] transition-colors"
																title="View details"
															>
																<EyeIcon className="w-5 h-5" />
															</button>
															<button
																onClick={() => handleAddStaff(school)}
																className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-[3px] transition-colors"
																title="Add staff member"
															>
																<UserPlusIcon className="w-5 h-5" />
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
					</div>
				</div>
			)}

			{/* Logs Tab */}
			{activeTab === 'logs' && (
				<div className="space-y-6">
					{/* Filters and Import Button */}
					<div className="bg-white rounded-[3px] shadow-card border border-gray-100 p-4">
						<div className="flex flex-col sm:flex-row gap-4 items-end">
							{/* Search */}
							<div className="flex-1 relative">
								<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									type="text"
									placeholder="Search logs..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
								/>
							</div>
							
							{/* Records per page selector */}
							<div className="flex items-center gap-2">
								<label className="text-sm text-gray-700 whitespace-nowrap">Show:</label>
								<select
									value={itemsPerPage}
									onChange={(e) => {
										setItemsPerPage(Number(e.target.value));
										setCurrentPage(1);
									}}
									className="px-3 py-2 border border-gray-300 rounded-[3px] text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
								>
									<option value={10}>10</option>
									<option value={25}>25</option>
									<option value={50}>50</option>
									<option value={100}>100</option>
								</select>
								<span className="text-sm text-gray-700 whitespace-nowrap">records</span>
							</div>

							{/* Is Fixed Filter - Autocomplete */}
							<div className="relative">
								<input
									ref={isFixedFilterInputRef}
									type="text"
									value={isFixedFilter === null ? 'All' : isFixedFilter ? 'Fixed' : 'Not Fixed'}
									onChange={(e) => {
										setIsFixedFilterQuery(e.target.value);
										setShowIsFixedFilterDropdown(true);
										setIsFixedFilterHighlightedIndex(-1);
										if (!e.target.value.trim()) {
											setShowIsFixedFilterDropdown(false);
											setIsFixedFilter(null);
											setIsFixedFilterQuery('All');
										}
									}}
									onFocus={() => {
										if (filteredIsFixedOptions.length > 0) {
											setShowIsFixedFilterDropdown(true);
										}
									}}
									onKeyDown={handleIsFixedFilterKeyDown}
									placeholder="All"
									className="px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-full"
								/>
								{showIsFixedFilterDropdown && filteredIsFixedOptions.length > 0 && (
									<div
										ref={isFixedFilterDropdownRef}
										className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
									>
										{filteredIsFixedOptions.map((option, index) => (
										<button
												key={option}
											type="button"
											onClick={() => {
													if (option === 'All') {
														setIsFixedFilter(null);
														setIsFixedFilterQuery('All');
													} else if (option === 'Fixed') {
														setIsFixedFilter(true);
														setIsFixedFilterQuery('Fixed');
													} else if (option === 'Not Fixed') {
														setIsFixedFilter(false);
														setIsFixedFilterQuery('Not Fixed');
													}
													setShowIsFixedFilterDropdown(false);
												}}
												onMouseEnter={() => setIsFixedFilterHighlightedIndex(index)}
												className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
													index === isFixedFilterHighlightedIndex ? 'bg-indigo-50' : ''
												} ${
													(option === 'All' && isFixedFilter === null) ||
													(option === 'Fixed' && isFixedFilter === true) ||
													(option === 'Not Fixed' && isFixedFilter === false)
														? 'bg-indigo-100 font-medium' : ''
												}`}
											>
												<div className="text-sm font-medium text-gray-900">{option}</div>
											</button>
										))}
									</div>
								)}
							</div>

							{(searchQuery || isFixedFilter !== null) && (
								<button
									onClick={() => {
										resetFilters();
									}}
									className="px-4 py-2 border border-gray-300 rounded-[3px] hover:bg-gray-50 flex items-center gap-2"
								>
									<XMarkIcon className="w-4 h-4" />
									Clear
								</button>
							)}
						</div>
					</div>

					{/* Action Buttons */}
					{selectedLogs.size > 0 && (
						<div className="bg-white rounded-[3px] shadow-card border border-gray-100 p-4 flex items-center justify-between">
							<div className="text-sm text-gray-700">
								{selectedLogs.size} log(s) selected
							</div>
							<div className="flex items-center gap-3">
								<button
									onClick={handleMarkAsFixedRequest}
									disabled={markFixedLoading}
									className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-[3px] hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
								>
										<CheckIcon className="w-4 h-4" />
									Mark as Fixed
								</button>
								<button
									onClick={handleDeleteLogsRequest}
									disabled={deleteLogsLoading}
									className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-[3px] hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
								>
										<TrashIcon className="w-4 h-4" />
									Delete
								</button>
							</div>
						</div>
					)}

					{/* Logs Table */}
					<div className="bg-white rounded-[3px] shadow-card border border-gray-100 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left">
											<input
												type="checkbox"
												checked={selectedLogs.size === logs.length && logs.length > 0}
												onChange={handleSelectAll}
												className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
											/>
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fixed</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{logs.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-6 py-8 text-center text-gray-500">
												{loading ? 'Loading logs...' : 'No logs found'}
											</td>
										</tr>
									) : (
										logs.map((log) => (
											<tr 
												key={log.log_id} 
												className={`hover:bg-gray-50 transition-colors ${
													log.status === 'ERROR' ? 'bg-red-50' : ''
												} ${log.is_fixed ? 'opacity-60' : ''}`}
											>
												<td className="px-6 py-4 whitespace-nowrap">
													<input
														type="checkbox"
														checked={selectedLogs.has(log.log_id)}
														onChange={() => handleLogSelect(log.log_id)}
														className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
													/>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
													{log.action || '-'}
												</td>
												<td className="px-6 py-4 text-sm text-gray-700 max-w-md">
													<div className="truncate" title={log.message || log.error_message || ''}>
														{log.message || log.error_message || '-'}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span className={`px-2 py-1 text-xs font-medium rounded-[3px] ${
														log.status === 'ERROR'
															? 'bg-red-100 text-red-800'
															: log.status === 'SUCCESS'
															? 'bg-green-100 text-green-800'
															: 'bg-yellow-100 text-yellow-800'
													}`}>
														{log.status}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													{log.is_fixed ? (
														<span className="px-2 py-1 text-xs font-medium rounded-[3px] bg-green-100 text-green-800">
															Fixed
														</span>
													) : (
														<span className="px-2 py-1 text-xs font-medium rounded-[3px] bg-gray-100 text-gray-600">
															Not Fixed
														</span>
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{new Date(log.created_at).toLocaleString()}
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
									Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalLogs)} of {totalLogs} logs
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* School Details Modal */}
			<Modal
				isOpen={showSchoolDetailsModal}
				onClose={() => {
					setShowSchoolDetailsModal(false);
					setSelectedSchool(null);
				}}
				title={selectedSchool?.school_name || 'School Details'}
				size="xl"
			>
				{selectedSchool && (
					<div className="flex flex-col">
						{/* School Profile Section */}
						<div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
							<div className="relative">
								{getSchoolLogoUrl(selectedSchool.school_logo) ? (
									<>
										<img
											src={getSchoolLogoUrl(selectedSchool.school_logo)!}
											alt={selectedSchool.school_name}
											className="w-20 h-20 rounded-[3px] object-cover border-2 border-gray-200"
											onError={(e) => {
												const target = e.target as HTMLImageElement;
												target.style.display = 'none';
												const fallback = target.nextElementSibling as HTMLElement;
												if (fallback) {
													fallback.style.display = 'flex';
												}
											}}
										/>
										<div
											className="w-20 h-20 rounded-[3px] bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white absolute top-0 left-0"
											style={{ display: 'none' }}
										>
											<BuildingOfficeIcon className="w-10 h-10" />
										</div>
									</>
								) : (
									<div className="w-20 h-20 rounded-[3px] bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white">
										<BuildingOfficeIcon className="w-10 h-10" />
									</div>
								)}
							</div>
							<div>
								<h2 className="text-2xl font-bold text-gray-900">{selectedSchool.school_name}</h2>
								{selectedSchool.school_ownership && (
									<p className="text-gray-600 mt-1">{selectedSchool.school_ownership}</p>
								)}
								<span
									className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium mt-2 ${
										selectedSchool.is_active
											? 'bg-green-100 text-green-800'
											: 'bg-red-100 text-red-800'
									}`}
								>
									<span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
										selectedSchool.is_active ? 'bg-green-500' : 'bg-red-500'
									}`}></span>
									{selectedSchool.is_active ? 'Active' : 'Inactive'}
								</span>
							</div>
						</div>

						{/* Details Grid */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							{/* Address */}
							<div>
								<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
									Address
								</label>
								<p className="text-gray-900 font-medium">{selectedSchool.school_address || 'N/A'}</p>
							</div>

							{/* Phone */}
							<div>
								<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
									Phone
								</label>
								<p className="text-gray-900 font-medium">{selectedSchool.school_phone || 'N/A'}</p>
							</div>

							{/* Email */}
							<div>
								<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
									Email
								</label>
								<p className="text-gray-900 font-medium">{selectedSchool.school_email || 'N/A'}</p>
							</div>

							{/* Ownership */}
							{selectedSchool.school_ownership && (
								<div>
									<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
										Ownership Type
									</label>
									<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium bg-blue-100 text-blue-800">
										{selectedSchool.school_ownership}
									</span>
								</div>
							)}

							{/* Status */}
							<div>
								<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
									Status
								</label>
								<span
									className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium ${
										selectedSchool.is_active
											? 'bg-green-100 text-green-800'
											: 'bg-red-100 text-red-800'
									}`}
								>
									<span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
										selectedSchool.is_active ? 'bg-green-500' : 'bg-red-500'
									}`}></span>
									{selectedSchool.is_active ? 'Active' : 'Inactive'}
								</span>
							</div>

							{/* Created At */}
							<div>
								<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
									Created On
								</label>
								<p className="text-gray-900 font-medium">{formatDate(selectedSchool.created_at)}</p>
							</div>

							{/* Updated At */}
							{selectedSchool.updated_at && (
								<div>
									<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
										Last Updated
									</label>
									<p className="text-gray-900 font-medium">{formatDate(selectedSchool.updated_at)}</p>
								</div>
							)}
						</div>

						{/* Footer */}
						<div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
							<button
								onClick={() => {
									setShowSchoolDetailsModal(false);
									setSelectedSchool(null);
								}}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 transition-colors"
							>
								Close
							</button>
						</div>
					</div>
				)}
			</Modal>

			{/* Status Change Confirm Modal */}
			<ConfirmModal
				isOpen={showStatusConfirmModal}
				onClose={() => {
					setShowStatusConfirmModal(false);
					setPendingStatusChange(null);
				}}
				onConfirm={handleStatusUpdateConfirm}
				title="Change School Status"
				message={
					pendingStatusChange
						? `Are you sure you want to change this school's status to ${pendingStatusChange.newStatus ? 'Active' : 'Inactive'}?`
						: ''
				}
				confirmText={pendingStatusChange?.newStatus ? 'Activate' : 'Deactivate'}
				cancelText="Cancel"
				type="warning"
				loading={statusUpdateLoading !== null}
			/>

			{/* Delete Logs Confirm Modal */}
			<ConfirmModal
				isOpen={showDeleteLogsModal}
				onClose={() => setShowDeleteLogsModal(false)}
				onConfirm={handleDeleteLogs}
				title="Delete Logs"
				message={`Are you sure you want to delete ${selectedLogs.size} log(s)? This action cannot be undone.`}
				confirmText="Delete"
				cancelText="Cancel"
				type="danger"
				loading={deleteLogsLoading}
			/>

			{/* Mark as Fixed Confirm Modal */}
			<ConfirmModal
				isOpen={showMarkFixedModal}
				onClose={() => setShowMarkFixedModal(false)}
				onConfirm={handleMarkAsFixed}
				title="Mark Logs as Fixed"
				message={`Are you sure you want to mark ${selectedLogs.size} log(s) as fixed?`}
				confirmText="Mark as Fixed"
				cancelText="Cancel"
				type="warning"
				loading={markFixedLoading}
			/>

			{/* Add Staff Modal */}
			{showAddStaffModal && selectedSchool && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-[3px] shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-xl font-bold text-gray-900">Add Staff Member to {selectedSchool.school_name}</h3>
							<button
								onClick={() => {
									setShowAddStaffModal(false);
									setSelectedSchool(null);
								}}
								className="p-2 hover:bg-gray-100 rounded-[3px] transition-colors"
							>
								<XMarkIcon className="w-5 h-5 text-gray-500" />
							</button>
						</div>
						<AddStaffForm
							schoolId={selectedSchool.school_id}
							onSuccess={() => {
								setShowAddStaffModal(false);
								setSelectedSchool(null);
								toast.success('Staff member added successfully!');
							}}
							onCancel={() => {
								setShowAddStaffModal(false);
								setSelectedSchool(null);
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

// Helper function to extract error message from API response
const getErrorMessage = (err: any, defaultMessage: string): string => {
	// Check for network errors
	if (!err?.response) {
		if (err?.message) {
			return err.message;
		}
		return defaultMessage;
	}

	// Check for specific error details
	if (err.response?.data?.detail) {
		const detail = err.response.data.detail;

		// If detail is a string, return it
		if (typeof detail === 'string') {
			return detail;
		}

		// If detail is an array (validation errors), format them
		if (Array.isArray(detail)) {
			const messages = detail.map((error: any) => {
				const field = error.loc?.join('.') || 'field';
				const msg = error.msg || 'Invalid value';
				return `${field}: ${msg}`;
			});
			return messages.join(', ');
		}

		// If detail is an object, try to extract message
		if (typeof detail === 'object' && detail.msg) {
			return detail.msg;
		}
	}

	// Check error message for duplicate email patterns
	const errorMessage = err.response?.data?.message || err.message || '';
	if (errorMessage.includes('duplicate') && errorMessage.includes('email')) {
		return 'This email address is already registered. Please use a different email.';
	}

	// Return status-based messages
	if (err.response?.status === 400) {
		return 'Invalid request. Please check your input data.';
	}
	if (err.response?.status === 409) {
		return 'A record with this information already exists.';
	}

	return defaultMessage;
};

// Add Staff Form Component
interface AddStaffFormProps {
	schoolId: string;
	onSuccess: () => void;
	onCancel: () => void;
}

function AddStaffForm({ schoolId, onSuccess, onCancel }: AddStaffFormProps) {
	const [formData, setFormData] = useState({
		staff_name: '',
		email: '',
		phone: '',
		staff_title: '',
		staff_role: 'admin',
		employment_type: '',
		staff_gender: '',
		staff_dob: '',
		qualifications: '',
		experience: '',
		password: '',
		is_active: true,
	});

	const [profileFile, setProfileFile] = useState<File | null>(null);
	const [nidFile, setNidFile] = useState<File | null>(null);
	const [profilePreview, setProfilePreview] = useState<string | null>(null);
	const [nidPreview, setNidPreview] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);

	// Autocomplete states
	const [roleSearchQuery, setRoleSearchQuery] = useState('Admin');
	const [showRoleDropdown, setShowRoleDropdown] = useState(false);
	const [roleHighlightedIndex, setRoleHighlightedIndex] = useState(-1);
	const roleDropdownRef = useRef<HTMLDivElement>(null);
	const roleInputRef = useRef<HTMLInputElement>(null);

	const [employmentTypeSearchQuery, setEmploymentTypeSearchQuery] = useState('');
	const [showEmploymentTypeDropdown, setShowEmploymentTypeDropdown] = useState(false);
	const [employmentTypeHighlightedIndex, setEmploymentTypeHighlightedIndex] = useState(-1);
	const employmentTypeDropdownRef = useRef<HTMLDivElement>(null);
	const employmentTypeInputRef = useRef<HTMLInputElement>(null);

	const [genderSearchQuery, setGenderSearchQuery] = useState('');
	const [showGenderDropdown, setShowGenderDropdown] = useState(false);
	const [genderHighlightedIndex, setGenderHighlightedIndex] = useState(-1);
	const genderDropdownRef = useRef<HTMLDivElement>(null);
	const genderInputRef = useRef<HTMLInputElement>(null);

	const roles = ['admin', 'teacher', 'accountant'];
	const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Temporary'];
	const genders = ['Male', 'Female'];

	// Filter options
	const filteredRoles = roles.filter((role) => {
		if (!roleSearchQuery.trim()) return true;
		return role.toLowerCase().includes(roleSearchQuery.toLowerCase());
	});

	const filteredEmploymentTypes = employmentTypes.filter((type) => {
		if (!employmentTypeSearchQuery.trim()) return true;
		return type.toLowerCase().includes(employmentTypeSearchQuery.toLowerCase());
	});

	const filteredGenders = genders.filter((gender) => {
		if (!genderSearchQuery.trim()) return true;
		return gender.toLowerCase().includes(genderSearchQuery.toLowerCase());
	});

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				roleDropdownRef.current &&
				!roleDropdownRef.current.contains(event.target as Node) &&
				roleInputRef.current &&
				!roleInputRef.current.contains(event.target as Node)
			) {
				setShowRoleDropdown(false);
			}
			if (
				employmentTypeDropdownRef.current &&
				!employmentTypeDropdownRef.current.contains(event.target as Node) &&
				employmentTypeInputRef.current &&
				!employmentTypeInputRef.current.contains(event.target as Node)
			) {
				setShowEmploymentTypeDropdown(false);
			}
			if (
				genderDropdownRef.current &&
				!genderDropdownRef.current.contains(event.target as Node) &&
				genderInputRef.current &&
				!genderInputRef.current.contains(event.target as Node)
			) {
				setShowGenderDropdown(false);
			}
		};

		if (showRoleDropdown || showEmploymentTypeDropdown || showGenderDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showRoleDropdown, showEmploymentTypeDropdown, showGenderDropdown]);

	// Keyboard navigation handlers
	const handleRoleKeyDown = (e: React.KeyboardEvent) => {
		if (!showRoleDropdown || filteredRoles.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setRoleHighlightedIndex((prev) => (prev < filteredRoles.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setRoleHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (roleHighlightedIndex >= 0 && roleHighlightedIndex < filteredRoles.length) {
					handleSelectRole(filteredRoles[roleHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowRoleDropdown(false);
				setRoleHighlightedIndex(-1);
				break;
		}
	};

	const handleEmploymentTypeKeyDown = (e: React.KeyboardEvent) => {
		if (!showEmploymentTypeDropdown || filteredEmploymentTypes.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setEmploymentTypeHighlightedIndex((prev) => (prev < filteredEmploymentTypes.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setEmploymentTypeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (employmentTypeHighlightedIndex >= 0 && employmentTypeHighlightedIndex < filteredEmploymentTypes.length) {
					handleSelectEmploymentType(filteredEmploymentTypes[employmentTypeHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowEmploymentTypeDropdown(false);
				setEmploymentTypeHighlightedIndex(-1);
				break;
		}
	};

	const handleGenderKeyDown = (e: React.KeyboardEvent) => {
		if (!showGenderDropdown || filteredGenders.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setGenderHighlightedIndex((prev) => (prev < filteredGenders.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setGenderHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (genderHighlightedIndex >= 0 && genderHighlightedIndex < filteredGenders.length) {
					handleSelectGender(filteredGenders[genderHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowGenderDropdown(false);
				setGenderHighlightedIndex(-1);
				break;
		}
	};

	// Selection handlers
	const handleSelectRole = (role: string) => {
		setFormData((prev) => ({ ...prev, staff_role: role }));
		setRoleSearchQuery(role.charAt(0).toUpperCase() + role.slice(1));
		setShowRoleDropdown(false);
		setRoleHighlightedIndex(-1);
	};

	const handleSelectEmploymentType = (type: string) => {
		setFormData((prev) => ({ ...prev, employment_type: type }));
		setEmploymentTypeSearchQuery(type);
		setShowEmploymentTypeDropdown(false);
		setEmploymentTypeHighlightedIndex(-1);
	};

	const handleSelectGender = (gender: string) => {
		setFormData((prev) => ({ ...prev, staff_gender: gender }));
		setGenderSearchQuery(gender);
		setShowGenderDropdown(false);
		setGenderHighlightedIndex(-1);
	};

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.staff_name?.trim()) {
			newErrors.staff_name = 'Staff name is required';
		}

		if (!formData.email?.trim()) {
			newErrors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = 'Invalid email format';
		}

		if (!formData.password?.trim()) {
			newErrors.password = 'Password is required';
		} else if (formData.password.length < 6) {
			newErrors.password = 'Password must be at least 6 characters';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleProfileFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!validateImageFile(file)) {
			setErrors((prev) => ({ ...prev, staff_profile: 'Please select a valid image file (PNG, JPG, JPEG)' }));
			return;
		}

		if (!validateFileSize(file, 5)) {
			setErrors((prev) => ({ ...prev, staff_profile: 'File size must be less than 5MB' }));
			return;
		}

		setProfileFile(file);
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.staff_profile;
			return newErrors;
		});

		const reader = new FileReader();
		reader.onloadend = () => {
			setProfilePreview(reader.result as string);
		};
		reader.readAsDataURL(file);
	};

	const handleNidFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!validateImageFile(file)) {
			setErrors((prev) => ({ ...prev, staff_nid_photo: 'Please select a valid image file (PNG, JPG, JPEG)' }));
			return;
		}

		if (!validateFileSize(file, 5)) {
			setErrors((prev) => ({ ...prev, staff_nid_photo: 'File size must be less than 5MB' }));
			return;
		}

		setNidFile(file);
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.staff_nid_photo;
			return newErrors;
		});

		const reader = new FileReader();
		reader.onloadend = () => {
			setNidPreview(reader.result as string);
		};
		reader.readAsDataURL(file);
	};

	const handleChange = (field: string, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		setLoading(true);
		try {
			const submitData: any = { ...formData };

			// Handle profile photo upload
			if (profileFile) {
				try {
					const profileBase64 = await convertFileToBase64(profileFile);
					submitData.staff_profile = profileBase64;
				} catch (error) {
					setErrors((prev) => ({ ...prev, staff_profile: 'Failed to process profile image' }));
					setLoading(false);
					return;
				}
			}

			// Handle NID photo upload
			if (nidFile) {
				try {
					const nidBase64 = await convertFileToBase64(nidFile);
					submitData.staff_nid_photo = nidBase64;
				} catch (error) {
					setErrors((prev) => ({ ...prev, staff_nid_photo: 'Failed to process NID image' }));
					setLoading(false);
					return;
				}
			}

			await api.post('/staff/', {
				...submitData,
				school_id: schoolId,
			});
			onSuccess();
		} catch (err: any) {
			const errorMsg = getErrorMessage(err, 'Failed to add staff member');
			
			// Check if it's an email duplicate error and show it in the email field
			if (errorMsg.toLowerCase().includes('email') && (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('registered') || errorMsg.toLowerCase().includes('duplicate'))) {
				setErrors((prev) => ({ ...prev, email: errorMsg }));
			} else {
				toast.error(errorMsg);
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Profile Photo Upload */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
				<div className="flex items-center gap-4">
					{profilePreview && (
						<div className="relative">
							<img
								src={profilePreview}
								alt="Profile preview"
								className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
							/>
							<button
								type="button"
								onClick={() => {
									setProfilePreview(null);
									setProfileFile(null);
									handleChange('staff_profile', null);
								}}
								className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
							>
								×
							</button>
						</div>
					)}
					<div className="flex-1">
						<input
							type="file"
							accept="image/*"
							onChange={handleProfileFileChange}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
						/>
						{errors.staff_profile && <p className="mt-1 text-sm text-red-600">{errors.staff_profile}</p>}
						<p className="mt-1 text-xs text-gray-500">PNG, JPG up to 5MB</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Staff Name */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Staff Name <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						value={formData.staff_name}
						onChange={(e) => handleChange('staff_name', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
							errors.staff_name ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter staff name"
					/>
					{errors.staff_name && <p className="mt-1 text-sm text-red-600">{errors.staff_name}</p>}
				</div>

				{/* Email */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Email <span className="text-red-500">*</span>
					</label>
					<input
						type="email"
						value={formData.email}
						onChange={(e) => handleChange('email', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
							errors.email ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter email"
					/>
					{errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
				</div>

				{/* Phone */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
					<input
						type="tel"
						value={formData.phone}
						onChange={(e) => handleChange('phone', e.target.value || null)}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
						placeholder="Enter phone number"
					/>
				</div>

				{/* Password */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Password <span className="text-red-500">*</span>
					</label>
					<input
						type="password"
						value={formData.password}
						onChange={(e) => handleChange('password', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
							errors.password ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter password"
					/>
					{errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
				</div>

				{/* Title */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
					<input
						type="text"
						value={formData.staff_title}
						onChange={(e) => handleChange('staff_title', e.target.value)}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
						placeholder="e.g., DOS, Principal"
					/>
				</div>

				{/* Role */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
					<div className="relative">
						<input
							ref={roleInputRef}
							type="text"
							value={formData.staff_role ? formData.staff_role.charAt(0).toUpperCase() + formData.staff_role.slice(1) : roleSearchQuery}
							onChange={(e) => {
								setRoleSearchQuery(e.target.value);
								setShowRoleDropdown(true);
								setRoleHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowRoleDropdown(false);
									handleChange('staff_role', '');
								}
							}}
							onFocus={() => {
								if (filteredRoles.length > 0) {
									setShowRoleDropdown(true);
								}
							}}
							onKeyDown={handleRoleKeyDown}
							placeholder="Search role..."
							disabled={loading}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
						/>
						{showRoleDropdown && filteredRoles.length > 0 && (
							<div
								ref={roleDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredRoles.map((role, index) => (
									<button
										key={role}
										type="button"
										onClick={() => handleSelectRole(role)}
										onMouseEnter={() => setRoleHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === roleHighlightedIndex ? 'bg-indigo-50' : ''
										} ${formData.staff_role === role ? 'bg-indigo-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900 capitalize">{role}</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Employment Type */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
					<div className="relative">
						<input
							ref={employmentTypeInputRef}
							type="text"
							value={formData.employment_type || employmentTypeSearchQuery}
							onChange={(e) => {
								setEmploymentTypeSearchQuery(e.target.value);
								setShowEmploymentTypeDropdown(true);
								setEmploymentTypeHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowEmploymentTypeDropdown(false);
									handleChange('employment_type', '');
								}
							}}
							onFocus={() => {
								if (filteredEmploymentTypes.length > 0) {
									setShowEmploymentTypeDropdown(true);
								}
							}}
							onKeyDown={handleEmploymentTypeKeyDown}
							placeholder="Search employment type..."
							disabled={loading}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
						/>
						{showEmploymentTypeDropdown && filteredEmploymentTypes.length > 0 && (
							<div
								ref={employmentTypeDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredEmploymentTypes.map((type, index) => (
									<button
										key={type}
										type="button"
										onClick={() => handleSelectEmploymentType(type)}
										onMouseEnter={() => setEmploymentTypeHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === employmentTypeHighlightedIndex ? 'bg-indigo-50' : ''
										} ${formData.employment_type === type ? 'bg-indigo-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{type}</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Gender */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
					<div className="relative">
						<input
							ref={genderInputRef}
							type="text"
							value={formData.staff_gender || genderSearchQuery}
							onChange={(e) => {
								setGenderSearchQuery(e.target.value);
								setShowGenderDropdown(true);
								setGenderHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowGenderDropdown(false);
									handleChange('staff_gender', '');
								}
							}}
							onFocus={() => {
								if (filteredGenders.length > 0) {
									setShowGenderDropdown(true);
								}
							}}
							onKeyDown={handleGenderKeyDown}
							placeholder="Search gender..."
							disabled={loading}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
						/>
						{showGenderDropdown && filteredGenders.length > 0 && (
							<div
								ref={genderDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredGenders.map((gender, index) => (
									<button
										key={gender}
										type="button"
										onClick={() => handleSelectGender(gender)}
										onMouseEnter={() => setGenderHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === genderHighlightedIndex ? 'bg-indigo-50' : ''
										} ${formData.staff_gender === gender ? 'bg-indigo-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{gender}</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Date of Birth */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
					<input
						type="date"
						value={formData.staff_dob}
						onChange={(e) => handleChange('staff_dob', e.target.value || null)}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
					/>
				</div>
			</div>

			{/* Qualifications */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Qualifications</label>
				<textarea
					value={formData.qualifications}
					onChange={(e) => handleChange('qualifications', e.target.value || null)}
					rows={3}
					className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
					placeholder="Enter qualifications"
				/>
			</div>

			{/* Experience */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
				<input
					type="text"
					value={formData.experience}
					onChange={(e) => handleChange('experience', e.target.value || null)}
					className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
					placeholder="e.g., 5 years"
				/>
			</div>

			{/* NID Photo Upload */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">NID Photo</label>
				<div className="flex items-center gap-4">
					{nidPreview && (
						<div className="relative">
							<img
								src={nidPreview}
								alt="NID preview"
								className="w-24 h-16 rounded object-cover border-2 border-gray-300"
							/>
							<button
								type="button"
								onClick={() => {
									setNidPreview(null);
									setNidFile(null);
									handleChange('staff_nid_photo', null);
								}}
								className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
							>
								×
							</button>
						</div>
					)}
					<div className="flex-1">
						<input
							type="file"
							accept="image/*"
							onChange={handleNidFileChange}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
						/>
						{errors.staff_nid_photo && <p className="mt-1 text-sm text-red-600">{errors.staff_nid_photo}</p>}
						<p className="mt-1 text-xs text-gray-500">PNG, JPG up to 5MB</p>
					</div>
				</div>
			</div>

			{/* Active Status */}
			<div className="flex items-center">
				<input
					type="checkbox"
					id="is_active"
					checked={formData.is_active}
					onChange={(e) => handleChange('is_active', e.target.checked)}
					className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
				/>
				<label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
					Active Status
				</label>
			</div>

			{/* Form Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					disabled={loading}
					className="px-6 py-2.5 border border-gray-300 rounded-[3px] text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-[3px] hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
				>
					{loading && (
						<svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					)}
					Add Staff Member
				</button>
			</div>
		</form>
	);
}

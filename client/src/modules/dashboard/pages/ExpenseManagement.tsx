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
	BanknotesIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseViewModal from '../components/ExpenseViewModal';

interface ExpenseItem {
	expense_id: string;
	school_id: string;
	academic_id?: string | null;
	category: string;
	title: string;
	description: string | null;
	amount: number;
	payment_method: string | null;
	status: string;
	expense_date: string | null;
	invoice_image: string[] | null;
	added_by: string | null;
	approved_by: string | null;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
	academic_year?: {
		academic_id: string;
		academic_name: string;
	} | null;
}

interface FilterState {
	search: string;
	status: string;
	category: string;
}

const EXPENSE_CATEGORIES = [
	'Office Supplies',
	'Rent & Utilities',
	'Maintenance & Repairs',
	'Salaries & Wages',
	'Transportation',
	'Teaching Materials',
	'Events & Activities',
	'Health & Safety',
	'IT & Technology',
	'Other',
];

const EXPENSE_STATUSES = ['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'ARCHIVED'];

export default function ExpenseManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalExpenses, setTotalExpenses] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		status: '',
		category: '',
	});
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | null>(null);
	const [academicYearFilterQuery, setAcademicYearFilterQuery] = useState('');
	const [showAcademicYearFilterDropdown, setShowAcademicYearFilterDropdown] = useState(false);
	const [academicYearFilterHighlightedIndex, setAcademicYearFilterHighlightedIndex] = useState(-1);
	const academicYearFilterDropdownRef = useRef<HTMLDivElement>(null);
	const academicYearFilterInputRef = useRef<HTMLInputElement>(null);
	const [availableAcademicYears, setAvailableAcademicYears] = useState<Array<{ academic_id: string; academic_name: string; is_current: boolean }>>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(50);
	const [showFilters, setShowFilters] = useState(false);

	// Autocomplete states for filter selects
	const [statusFilterQuery, setStatusFilterQuery] = useState('');
	const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
	const [statusFilterHighlightedIndex, setStatusFilterHighlightedIndex] = useState(-1);
	const statusFilterDropdownRef = useRef<HTMLDivElement>(null);
	const statusFilterInputRef = useRef<HTMLInputElement>(null);

	const [categoryFilterQuery, setCategoryFilterQuery] = useState('');
	const [showCategoryFilterDropdown, setShowCategoryFilterDropdown] = useState(false);
	const [categoryFilterHighlightedIndex, setCategoryFilterHighlightedIndex] = useState(-1);
	const categoryFilterDropdownRef = useRef<HTMLDivElement>(null);
	const categoryFilterInputRef = useRef<HTMLInputElement>(null);

	// Modal states
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<ExpenseItem> | null>(null);
	const [formLoading, setFormLoading] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

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

	// Fetch academic years for filter
	useEffect(() => {
		const fetchAcademicYears = async () => {
			if (!schoolId) return;

			try {
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/academic-years/?school_id=${schoolId}&_t=${timestamp}`);
				const academicYears = getArrayFromResponse(data).map((ay: any) => ({
					academic_id: ay.academic_id,
					academic_name: ay.academic_name,
					is_current: ay.is_current || false,
				}));
				setAvailableAcademicYears(academicYears);
			} catch (error: any) {
				// Error fetching academic years
				setAvailableAcademicYears([]);
			}
		};

		fetchAcademicYears();
	}, [schoolId]);

	// Filter options based on search queries
	const filteredStatusOptions = EXPENSE_STATUSES.filter((status) => {
		if (!statusFilterQuery.trim()) return true;
		return status.toLowerCase().includes(statusFilterQuery.toLowerCase());
	});

	const filteredCategoryOptions = EXPENSE_CATEGORIES.filter((category) => {
		if (!categoryFilterQuery.trim()) return true;
		return category.toLowerCase().includes(categoryFilterQuery.toLowerCase());
	});

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
				categoryFilterDropdownRef.current &&
				!categoryFilterDropdownRef.current.contains(target) &&
				categoryFilterInputRef.current &&
				!categoryFilterInputRef.current.contains(target)
			) {
				setShowCategoryFilterDropdown(false);
			}
		};

		if (showStatusFilterDropdown || showCategoryFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showStatusFilterDropdown, showCategoryFilterDropdown]);

	// Fetch expenses with pagination
	useEffect(() => {
		const fetchExpenses = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const params: any = {
					school_id: schoolId,
					page: currentPage,
					page_size: itemsPerPage,
				};
				
				if (selectedAcademicYearId) {
					params.academic_id = selectedAcademicYearId;
				}
				
				const { data } = await api.get(`/expenses/`, { params });
				
				if (data && data.items) {
					// New paginated response format
					setExpenses(data.items || []);
					setTotalExpenses(data.total || 0);
					setTotalPages(data.total_pages || 0);
				} else {
					// Fallback for old format
					setExpenses(data || []);
					setTotalExpenses(data?.length || 0);
					setTotalPages(Math.ceil((data?.length || 0) / itemsPerPage));
				}
			} catch (error: any) {
				const errorMessage = error.response?.data?.detail || 'Failed to load expenses';
				toast.error(errorMessage);
				setExpenses([]);
				setTotalExpenses(0);
				setTotalPages(0);
			} finally {
				setLoading(false);
			}
		};

		fetchExpenses();
	}, [schoolId, currentPage, itemsPerPage, selectedAcademicYearId]);

	// Filter expenses (client-side filtering for search, status, category)
	const filteredExpenses = useMemo(() => {
		let filtered = expenses.filter((expense) => !expense.is_deleted);

		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			filtered = filtered.filter(
				(expense) =>
					expense.title?.toLowerCase().includes(searchLower) ||
					expense.category?.toLowerCase().includes(searchLower) ||
					expense.description?.toLowerCase().includes(searchLower)
			);
		}

		if (filters.status) {
			filtered = filtered.filter((expense) => expense.status === filters.status);
		}

		if (filters.category) {
			filtered = filtered.filter((expense) => expense.category === filters.category);
		}

		return filtered;
	}, [expenses, filters]);

	// Use server-side pagination, but apply client-side filters
	const paginatedExpenses = filteredExpenses;

	// Analytics
	const analytics = useMemo(() => {
		const total = filteredExpenses.length;
		const pending = filteredExpenses.filter((expense) => expense.status === 'PENDING').length;
		const approved = filteredExpenses.filter((expense) => expense.status === 'APPROVED').length;
		const paid = filteredExpenses.filter((expense) => expense.status === 'PAID').length;
		const totalAmount = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

		return {
			total,
			pending,
			approved,
			paid,
			totalAmount,
		};
	}, [filteredExpenses]);

	// Filter handlers
	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const handleClearFilters = () => {
		setFilters({
			search: '',
			status: '',
			category: '',
		});
		setStatusFilterQuery('');
		setCategoryFilterQuery('');
		setSelectedAcademicYearId(null);
		setAcademicYearFilterQuery('');
		setCurrentPage(1);
	};

	// Modal handlers
	const handleCreate = () => {
		setSelectedExpense(null);
		setFormDataToSubmit(null);
		setCreateConfirmOpen(false);
		setCreateModalOpen(true);
	};

	const handleEdit = (expense: ExpenseItem) => {
		setSelectedExpense(expense);
		setFormDataToSubmit(null);
		setUpdateConfirmOpen(false);
		setEditModalOpen(true);
	};

	const handleView = (expense: ExpenseItem) => {
		setSelectedExpense(expense);
		setViewModalOpen(true);
	};

	const handleDelete = (expense: ExpenseItem) => {
		setSelectedExpense(expense);
		setDeleteConfirmOpen(true);
	};

	// Form submission handlers
	const handleCreateSubmit = async (data: Partial<ExpenseItem>) => {
		setFormDataToSubmit(data);
		setCreateModalOpen(false);
		setCreateConfirmOpen(true);
	};

	const handleUpdateSubmit = async (data: Partial<ExpenseItem>) => {
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
			const payload: any = {
				school_id: schoolId,
				category: formDataToSubmit.category || '',
				title: formDataToSubmit.title || '',
				description: formDataToSubmit.description?.trim() || null,
				amount: typeof formDataToSubmit.amount === 'number' ? formDataToSubmit.amount : (formDataToSubmit.amount ? Number(formDataToSubmit.amount) : 0),
				payment_method: formDataToSubmit.payment_method?.trim() || null,
				status: formDataToSubmit.status?.trim() || 'PENDING',
				expense_date: formDataToSubmit.expense_date || null,
				invoice_image: formDataToSubmit.invoice_image || null,
				added_by: staffId || null,
				approved_by: formDataToSubmit.approved_by || null,
			};

			if (payload.description === '') payload.description = null;
			if (payload.payment_method === '') payload.payment_method = null;
			if (payload.expense_date === '') payload.expense_date = null;

			await api.post('/expenses/', payload);
			toast.success('Expense created successfully!');
			setCreateConfirmOpen(false);
			setCreateModalOpen(false);
			setFormDataToSubmit(null);

			// Refresh expenses
			// Refresh expenses with current pagination and filters
			const params: any = {
				school_id: schoolId,
				page: currentPage,
				page_size: itemsPerPage,
			};
			if (selectedAcademicYearId) {
				params.academic_id = selectedAcademicYearId;
			}
			const { data } = await api.get(`/expenses/`, { params });
			if (data && data.items) {
				setExpenses(data.items || []);
				setTotalExpenses(data.total || 0);
				setTotalPages(data.total_pages || 0);
			} else {
				setExpenses(data || []);
				setTotalExpenses(data?.length || 0);
				setTotalPages(Math.ceil((data?.length || 0) / itemsPerPage));
			}
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to create expense';
			toast.error(errorMessage);
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!formDataToSubmit || !selectedExpense || !schoolId) {
			toast.error('Missing required data. Please try again.');
			return;
		}

		try {
			setFormLoading(true);
			const payload: any = {
				...formDataToSubmit,
				amount: formDataToSubmit.amount ? Number(formDataToSubmit.amount) : undefined,
			};

			if (payload.description === '') payload.description = null;
			if (payload.payment_method === '') payload.payment_method = null;
			if (payload.expense_date === '') payload.expense_date = null;

			await api.put(`/expenses/${selectedExpense.expense_id}?school_id=${schoolId}`, payload);
			toast.success('Expense updated successfully!');
			setUpdateConfirmOpen(false);
			setEditModalOpen(false);
			setFormDataToSubmit(null);
			setSelectedExpense(null);

			// Refresh expenses
			// Refresh expenses with current pagination and filters
			const params: any = {
				school_id: schoolId,
				page: currentPage,
				page_size: itemsPerPage,
			};
			if (selectedAcademicYearId) {
				params.academic_id = selectedAcademicYearId;
			}
			const { data } = await api.get(`/expenses/`, { params });
			if (data && data.items) {
				setExpenses(data.items || []);
				setTotalExpenses(data.total || 0);
				setTotalPages(data.total_pages || 0);
			} else {
				setExpenses(data || []);
				setTotalExpenses(data?.length || 0);
				setTotalPages(Math.ceil((data?.length || 0) / itemsPerPage));
			}
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || 'Failed to update expense';
			toast.error(errorMessage);
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDeleteConfirm = async () => {
		if (!selectedExpense || !schoolId) return;

		try {
			setDeleteLoading(true);
			await api.delete(`/expenses/${selectedExpense.expense_id}?school_id=${schoolId}`);
			toast.success('Expense deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedExpense(null);

			// Refresh expenses
			// Refresh expenses with current pagination and filters
			const params: any = {
				school_id: schoolId,
				page: currentPage,
				page_size: itemsPerPage,
			};
			if (selectedAcademicYearId) {
				params.academic_id = selectedAcademicYearId;
			}
			const { data } = await api.get(`/expenses/`, { params });
			if (data && data.items) {
				setExpenses(data.items || []);
				setTotalExpenses(data.total || 0);
				setTotalPages(data.total_pages || 0);
			} else {
				setExpenses(data || []);
				setTotalExpenses(data?.length || 0);
				setTotalPages(Math.ceil((data?.length || 0) / itemsPerPage));
			}
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to delete expense');
		} finally {
			setDeleteLoading(false);
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
			PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
			APPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircleIcon },
			PAID: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
			REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
			ARCHIVED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: ClockIcon },
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
							<p className="mt-4 text-gray-600">Loading expenses...</p>
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
							<h1 className="text-3xl font-bold text-gray-900">Expense Management</h1>
							<p className="text-gray-600 mt-1">Record, categorize, and monitor every financial outgoing from the school</p>
						</div>
						<button
							onClick={handleCreate}
							className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors font-medium"
						>
							<PlusIcon className="w-5 h-5" />
							<span>Add Expense</span>
						</button>
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Expenses</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<BanknotesIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-yellow-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Pending</p>
									<p className="text-3xl font-bold text-yellow-600 mt-2">{analytics.pending}</p>
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
									<p className="text-sm font-medium text-gray-600">Approved</p>
									<p className="text-3xl font-bold text-blue-600 mt-2">{analytics.approved}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<CheckCircleIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-green-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Paid</p>
									<p className="text-3xl font-bold text-green-600 mt-2">{analytics.paid}</p>
								</div>
								<div className="p-3 bg-green-100 rounded-[3px]">
									<CheckCircleIcon className="w-6 h-6 text-green-600" />
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
									placeholder="Search by title, category, or description..."
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
								{(filters.status || filters.category || selectedAcademicYearId) && (
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
								{/* Academic Year Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
									<div className="relative">
										<input
											ref={academicYearFilterInputRef}
											type="text"
											value={
												selectedAcademicYearId
													? availableAcademicYears.find((ay) => ay.academic_id === selectedAcademicYearId)?.academic_name || academicYearFilterQuery
													: academicYearFilterQuery
											}
											onChange={(e) => {
												setAcademicYearFilterQuery(e.target.value);
												setShowAcademicYearFilterDropdown(true);
												setAcademicYearFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowAcademicYearFilterDropdown(false);
													setSelectedAcademicYearId(null);
													setCurrentPage(1);
												}
											}}
											onFocus={() => {
												if (filteredAcademicYearOptions.length > 0) {
													setShowAcademicYearFilterDropdown(true);
												}
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
														setSelectedAcademicYearId(null);
														setAcademicYearFilterQuery('');
														setShowAcademicYearFilterDropdown(false);
														setCurrentPage(1);
													}}
													className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
														!selectedAcademicYearId ? 'bg-primary-100 font-medium' : ''
													}`}
												>
													<div className="text-sm font-medium text-gray-900">All Academic Years</div>
												</button>
												{filteredAcademicYearOptions.map((academicYear, index) => (
													<button
														key={academicYear.academic_id}
														type="button"
														onClick={() => {
															setSelectedAcademicYearId(academicYear.academic_id);
															setAcademicYearFilterQuery(academicYear.academic_name);
															setShowAcademicYearFilterDropdown(false);
															setCurrentPage(1);
														}}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															selectedAcademicYearId === academicYear.academic_id ? 'bg-primary-100 font-medium' : ''
														}`}
													>
														<div className="flex items-center justify-between">
															<span className="text-sm font-medium text-gray-900">{academicYear.academic_name}</span>
															{academicYear.is_current && (
																<span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Current</span>
															)}
														</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

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

								{/* Category Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
									<div className="relative">
										<input
											ref={categoryFilterInputRef}
											type="text"
											value={filters.category || categoryFilterQuery}
											onChange={(e) => {
												setCategoryFilterQuery(e.target.value);
												setShowCategoryFilterDropdown(true);
												setCategoryFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowCategoryFilterDropdown(false);
													handleFilterChange('category', '');
												}
											}}
											onFocus={() => {
												if (filteredCategoryOptions.length > 0) {
													setShowCategoryFilterDropdown(true);
												}
											}}
											placeholder="All Categories"
											className="w-full px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
										/>
										{showCategoryFilterDropdown && filteredCategoryOptions.length > 0 && (
											<div
												ref={categoryFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('category', '');
														setCategoryFilterQuery('');
														setShowCategoryFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Categories</div>
												</button>
												{filteredCategoryOptions.map((category, index) => (
													<button
														key={category}
														type="button"
														onClick={() => {
															handleFilterChange('category', category);
															setCategoryFilterQuery(category);
															setShowCategoryFilterDropdown(false);
														}}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															filters.category === category ? 'bg-primary-100 font-medium' : ''
														}`}
													>
														<div className="text-sm font-medium text-gray-900">{category}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Expenses Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Title
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Description
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Category
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Date
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Amount
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Payment Method
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
											<td colSpan={8} className="px-6 py-8 text-center">
												<div className="flex items-center justify-center">
													<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
												</div>
											</td>
										</tr>
									) : paginatedExpenses.length === 0 ? (
										<tr>
											<td colSpan={8} className="px-6 py-8 text-center">
												<div className="flex flex-col items-center justify-center gap-3">
													<BanknotesIcon className="w-12 h-12 text-gray-400" />
													<p className="text-gray-500 font-medium">No expenses found</p>
												</div>
											</td>
										</tr>
									) : (
										paginatedExpenses.map((expense) => (
											<tr key={expense.expense_id} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">{expense.title}</div>
												</td>
												<td className="px-6 py-4">
													<div className="text-sm text-gray-500 max-w-xs truncate">
														{expense.description || 'N/A'}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">{expense.category || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">{formatDate(expense.expense_date)}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">
														{formatCurrency(expense.amount || 0)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">
														{expense.payment_method ? expense.payment_method.replace('_', ' ') : 'N/A'}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(expense.status)}</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex items-center justify-end gap-2">
														<button
															onClick={() => handleView(expense)}
															className="text-primary-600 hover:text-primary-900 p-1"
															title="View"
														>
															<EyeIcon className="w-5 h-5" />
														</button>
														<button
															onClick={() => handleEdit(expense)}
															className="text-blue-600 hover:text-blue-900 p-1"
															title="Edit"
														>
															<PencilIcon className="w-5 h-5" />
														</button>
														<button
															onClick={() => handleDelete(expense)}
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
										Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalExpenses)} of{' '}
										{totalExpenses} expenses
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
			<Modal isOpen={createModalOpen} onClose={() => {
				setCreateModalOpen(false);
				setFormDataToSubmit(null);
				setCreateConfirmOpen(false);
			}} title="Create Expense" size="xl">
				<ExpenseForm
					expense={null}
					onSubmit={handleCreateSubmit}
					onCancel={() => {
						setCreateModalOpen(false);
						setFormDataToSubmit(null);
						setCreateConfirmOpen(false);
					}}
					loading={formLoading}
					mode="create"
					schoolId={schoolId || ''}
					staffId={staffId || ''}
				/>
			</Modal>

			<Modal isOpen={editModalOpen} onClose={() => {
				setEditModalOpen(false);
				setFormDataToSubmit(null);
				setUpdateConfirmOpen(false);
			}} title="Edit Expense" size="xl">
				<ExpenseForm
					expense={selectedExpense}
					onSubmit={handleUpdateSubmit}
					onCancel={() => {
						setEditModalOpen(false);
						setFormDataToSubmit(null);
						setUpdateConfirmOpen(false);
					}}
					loading={formLoading}
					mode="edit"
					schoolId={schoolId || ''}
					staffId={staffId || ''}
				/>
			</Modal>

			<ExpenseViewModal
				expense={selectedExpense}
				isOpen={viewModalOpen}
				onClose={() => setViewModalOpen(false)}
				onEdit={() => {
					setViewModalOpen(false);
					handleEdit(selectedExpense!);
				}}
				onDelete={() => {
					setViewModalOpen(false);
					handleDelete(selectedExpense!);
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
				title="Create Expense"
				message={`Are you sure you want to create the expense "${formDataToSubmit?.title || 'this expense'}"?`}
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
				title="Update Expense"
				message={`Are you sure you want to update "${selectedExpense?.title || 'this expense'}"?`}
				confirmText="Update"
				cancelText="Cancel"
				type="warning"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={deleteConfirmOpen}
				onClose={() => {
					setDeleteConfirmOpen(false);
					setSelectedExpense(null);
				}}
				onConfirm={handleDeleteConfirm}
				title="Delete Expense"
				message={`Are you sure you want to delete "${selectedExpense?.title || 'this expense'}"? This action cannot be undone.`}
				confirmText="Delete"
				cancelText="Cancel"
				type="danger"
				loading={deleteLoading}
			/>
		</div>
	);
}


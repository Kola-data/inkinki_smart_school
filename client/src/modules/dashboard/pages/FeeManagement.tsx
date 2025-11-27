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
	DocumentTextIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import FeeManagementForm from '../components/FeeManagementForm';
import BulkFeeManagementForm from '../components/BulkFeeManagementForm';
import FeeManagementViewModal from '../components/FeeManagementViewModal';
import FeeInvoicesModal from '../components/FeeInvoicesModal';
import TransactionEditModal from '../components/TransactionEditModal';
import TransactionDeleteModal from '../components/TransactionDeleteModal';

interface FeeManagementMember {
	fee_id: string;
	school_id: string;
	std_id: string;
	fee_type_id: string;
	academic_id: string;
	term: string;
	amount_paid: number;
	status: string;
	student?: {
		std_id: string;
		std_name: string;
		std_code: string | null;
		std_dob: string | null;
		std_gender: string | null;
		status: string | null;
		current_class_name: string | null;
	} | null;
	fee_type?: {
		fee_type_id: string;
		fee_type_name: string;
		description: string | null;
		amount_to_pay: number;
		is_active: string;
	} | null;
	academic_year?: {
		academic_id: string;
		academic_name: string;
		start_date: string | null;
		end_date: string | null;
		is_current: boolean;
	} | null;
	invoice_img?: string | null;
	created_at: string | null;
	updated_at: string | null;
}

interface FilterState {
	search: string;
	status: string;
	fee_type_id: string;
	academic_id: string;
	term: string;
	grade: string;
}

export default function FeeManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [fees, setFees] = useState<FeeManagementMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [invoiceCounts, setInvoiceCounts] = useState<Record<string, { count: number; totalAmount: number }>>({});
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		status: '',
		fee_type_id: '',
		academic_id: '',
		term: '',
		grade: '',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [showFilters, setShowFilters] = useState(false);

	// Autocomplete state for filters
	const [statusFilterQuery, setStatusFilterQuery] = useState('');
	const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
	const [statusFilterHighlightedIndex, setStatusFilterHighlightedIndex] = useState(-1);
	const statusFilterDropdownRef = useRef<HTMLDivElement>(null);
	const statusFilterInputRef = useRef<HTMLInputElement>(null);

	const [feeTypeFilterQuery, setFeeTypeFilterQuery] = useState('');
	const [showFeeTypeFilterDropdown, setShowFeeTypeFilterDropdown] = useState(false);
	const [feeTypeFilterHighlightedIndex, setFeeTypeFilterHighlightedIndex] = useState(-1);
	const feeTypeFilterDropdownRef = useRef<HTMLDivElement>(null);
	const feeTypeFilterInputRef = useRef<HTMLInputElement>(null);

	const [academicYearFilterQuery, setAcademicYearFilterQuery] = useState('');
	const [showAcademicYearFilterDropdown, setShowAcademicYearFilterDropdown] = useState(false);
	const [academicYearFilterHighlightedIndex, setAcademicYearFilterHighlightedIndex] = useState(-1);
	const academicYearFilterDropdownRef = useRef<HTMLDivElement>(null);
	const academicYearFilterInputRef = useRef<HTMLInputElement>(null);

	const [termFilterQuery, setTermFilterQuery] = useState('');
	const [showTermFilterDropdown, setShowTermFilterDropdown] = useState(false);
	const [termFilterHighlightedIndex, setTermFilterHighlightedIndex] = useState(-1);
	const termFilterDropdownRef = useRef<HTMLDivElement>(null);
	const termFilterInputRef = useRef<HTMLInputElement>(null);

	const [gradeFilterQuery, setGradeFilterQuery] = useState('');
	const [showGradeFilterDropdown, setShowGradeFilterDropdown] = useState(false);
	const [gradeFilterHighlightedIndex, setGradeFilterHighlightedIndex] = useState(-1);
	const gradeFilterDropdownRef = useRef<HTMLDivElement>(null);
	const gradeFilterInputRef = useRef<HTMLInputElement>(null);

	const statusOptions = ['pending', 'paid', 'overdue', 'partial'];
	const filteredStatusOptions = statusOptions.filter((status) => {
		if (!statusFilterQuery.trim()) return true;
		return status.toLowerCase().includes(statusFilterQuery.toLowerCase());
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
				feeTypeFilterDropdownRef.current &&
				!feeTypeFilterDropdownRef.current.contains(target) &&
				feeTypeFilterInputRef.current &&
				!feeTypeFilterInputRef.current.contains(target)
			) {
				setShowFeeTypeFilterDropdown(false);
			}

			if (
				academicYearFilterDropdownRef.current &&
				!academicYearFilterDropdownRef.current.contains(target) &&
				academicYearFilterInputRef.current &&
				!academicYearFilterInputRef.current.contains(target)
			) {
				setShowAcademicYearFilterDropdown(false);
			}

			if (
				termFilterDropdownRef.current &&
				!termFilterDropdownRef.current.contains(target) &&
				termFilterInputRef.current &&
				!termFilterInputRef.current.contains(target)
			) {
				setShowTermFilterDropdown(false);
			}

			if (
				gradeFilterDropdownRef.current &&
				!gradeFilterDropdownRef.current.contains(target) &&
				gradeFilterInputRef.current &&
				!gradeFilterInputRef.current.contains(target)
			) {
				setShowGradeFilterDropdown(false);
			}
		};

		if (showStatusFilterDropdown || showFeeTypeFilterDropdown || showAcademicYearFilterDropdown || showTermFilterDropdown || showGradeFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showStatusFilterDropdown, showFeeTypeFilterDropdown, showAcademicYearFilterDropdown, showTermFilterDropdown, showGradeFilterDropdown]);

	// Modal states
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [invoicesModalOpen, setInvoicesModalOpen] = useState(false);
	const [transactionEditModalOpen, setTransactionEditModalOpen] = useState(false);
	const [transactionDeleteModalOpen, setTransactionDeleteModalOpen] = useState(false);
	const [selectedFee, setSelectedFee] = useState<FeeManagementMember | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<FeeManagementMember> | null>(null);
	const [formLoading, setFormLoading] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

	// Get school ID from logged-in user's staff data
	const schoolId = useMemo(() => {
		const staff = localStorage.getItem('staff');
		if (staff) {
			try {
				const staffData = JSON.parse(staff);
				if (staffData?.school_id) {
					return staffData.school_id;
				}
			} catch {
				// Ignore parse errors
			}
		}
		
		return null;
	}, []);

	// Fetch fees data using school_id from logged-in user
	useEffect(() => {
		const fetchFees = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/fee-management/?school_id=${schoolId}&_t=${timestamp}`);
				setFees(getArrayFromResponse(data));
			} catch (error: any) {
				const errorMessage = error.response?.data?.detail || 'Failed to fetch fees';
				if (error.response?.status !== 403) {
					toast.error(errorMessage);
				}} finally {
				setLoading(false);
			}
		};

		fetchFees();
	}, [schoolId]);

	// Fetch invoice counts for all fees
	useEffect(() => {
		const fetchInvoiceCounts = async () => {
			if (!schoolId || fees.length === 0) return;

			try {
				const counts: Record<string, { count: number; totalAmount: number }> = {};
				
				// Fetch invoices for all fees in parallel
				const invoicePromises = fees.map(async (fee) => {
					try {
						const { data } = await api.get(`/fee-invoices/?school_id=${schoolId}&fee_id=${fee.fee_id}`);
						const invoices = getArrayFromResponse(data);
						const totalAmount = invoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
						counts[fee.fee_id] = {
							count: invoices.length,
							totalAmount: totalAmount,
						};
					} catch (error) {counts[fee.fee_id] = { count: 0, totalAmount: 0 };
					}
				});

				await Promise.all(invoicePromises);
				setInvoiceCounts(counts);
			} catch (error) {}
		};

		fetchInvoiceCounts();
	}, [schoolId, fees]);

	// State for filter options
	const [availableFeeTypes, setAvailableFeeTypes] = useState<Array<{ fee_type_id: string; fee_type_name: string }>>([]);
	const [availableAcademicYears, setAvailableAcademicYears] = useState<Array<{ academic_id: string; academic_name: string; is_current: boolean }>>([]);
	
	// All available terms (hardcoded as standard terms)
	const termOptions = ['Term 1', 'Term 2', 'Term 3', 'First Term', 'Second Term', 'Third Term'];
	const availableTerms = termOptions;

	// Fetch filter options from API
	useEffect(() => {
		const fetchFilterOptions = async () => {
			if (!schoolId) return;

			try {
				const timestamp = new Date().getTime();

				// Fetch fee types
				const feeTypesResponse = await api.get(`/fee-types/?school_id=${schoolId}&_t=${timestamp}`);
				const feeTypes = (feeTypesResponse.data || []).map((ft: any) => ({
					fee_type_id: ft.fee_type_id,
					fee_type_name: ft.fee_type_name,
				}));
				setAvailableFeeTypes(feeTypes);

				// Fetch all academic years (both current and non-current)
				const academicYearsResponse = await api.get(`/academic-years/?school_id=${schoolId}&_t=${timestamp}`);
				const academicYears = (academicYearsResponse.data || []).map((ay: any) => ({
					academic_id: ay.academic_id,
					academic_name: ay.academic_name,
					is_current: ay.is_current || false,
				}));
				setAvailableAcademicYears(academicYears);
			} catch (error: any) {}
		};

		fetchFilterOptions();
	}, [schoolId]);

	const availableGrades = useMemo(() => {
		const grades = new Set<string>();
		fees.forEach((fee) => {
			if (fee.student?.current_class_name) {
				grades.add(fee.student.current_class_name);
			}
		});
		return Array.from(grades).sort();
	}, [fees]);

	// Filtered fees
	const filteredFees = useMemo(() => {
		return fees.filter((fee) => {
			const matchesSearch = !filters.search || 
				fee.student?.std_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				fee.student?.std_code?.toLowerCase().includes(filters.search.toLowerCase()) ||
				fee.fee_type?.fee_type_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				fee.term?.toLowerCase().includes(filters.search.toLowerCase());
			
			const matchesStatus = !filters.status || fee.status === filters.status;
			const matchesFeeType = !filters.fee_type_id || fee.fee_type_id === filters.fee_type_id;
			const matchesAcademicYear = !filters.academic_id || fee.academic_id === filters.academic_id;
			const matchesTerm = !filters.term || fee.term === filters.term;
			const matchesGrade = !filters.grade || fee.student?.current_class_name === filters.grade;
			
			return matchesSearch && matchesStatus && matchesFeeType && matchesAcademicYear && matchesTerm && matchesGrade;
		});
	}, [fees, filters]);

	// Pagination
	const totalPages = Math.ceil(filteredFees.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedFees = useMemo(() => {
		return filteredFees.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredFees, startIndex, itemsPerPage]);

	// Analytics
	const analytics = useMemo(() => {
		const total = fees.length;
		const paid = fees.filter((f) => f.status === 'paid').length;
		const pending = fees.filter((f) => f.status === 'pending').length;
		const overdue = fees.filter((f) => f.status === 'overdue').length;
		const totalAmount = fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0);

		return {
			total,
			paid,
			pending,
			overdue,
			totalAmount,
		};
	}, [fees]);

	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const resetFilters = () => {
		setFilters({ search: '', status: '', fee_type_id: '', academic_id: '', term: '', grade: '' });
		setStatusFilterQuery('');
		setFeeTypeFilterQuery('');
		setAcademicYearFilterQuery('');
		setTermFilterQuery('');
		setGradeFilterQuery('');
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

	// Filtered options for autocomplete
	const filteredFeeTypes = useMemo(() => {
		if (!feeTypeFilterQuery.trim()) return availableFeeTypes;
		const query = feeTypeFilterQuery.toLowerCase();
		return availableFeeTypes.filter((ft) => 
			ft.fee_type_name?.toLowerCase().includes(query)
		);
	}, [feeTypeFilterQuery, availableFeeTypes]);

	// Sort academic years: current first, then by name
	const sortedAcademicYears = useMemo(() => {
		return [...availableAcademicYears].sort((a, b) => {
			// Current academic year first
			if (a.is_current && !b.is_current) return -1;
			if (!a.is_current && b.is_current) return 1;
			// Then sort alphabetically
			return a.academic_name.localeCompare(b.academic_name);
		});
	}, [availableAcademicYears]);

	const filteredAcademicYears = useMemo(() => {
		if (!academicYearFilterQuery.trim()) return sortedAcademicYears;
		const query = academicYearFilterQuery.toLowerCase();
		return sortedAcademicYears.filter((ay) => 
			ay.academic_name?.toLowerCase().includes(query)
		);
	}, [academicYearFilterQuery, sortedAcademicYears]);

	const filteredTerms = useMemo(() => {
		if (!termFilterQuery.trim()) return availableTerms;
		const query = termFilterQuery.toLowerCase();
		return availableTerms.filter((term) => 
			term.toLowerCase().includes(query)
		);
	}, [termFilterQuery, availableTerms]);

	const filteredGrades = useMemo(() => {
		if (!gradeFilterQuery.trim()) return availableGrades;
		const query = gradeFilterQuery.toLowerCase();
		return availableGrades.filter((grade) => 
			grade.toLowerCase().includes(query)
		);
	}, [gradeFilterQuery, availableGrades]);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
		}).format(amount);
	};

	const getStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case 'paid':
				return 'bg-green-100 text-green-800';
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			case 'overdue':
				return 'bg-red-100 text-red-800';
			case 'partial':
				return 'bg-blue-100 text-blue-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const toggleSidebar = () => {
		setSidebarOpen(!sidebarOpen);
	};

	// Refresh fees data with cache busting
	const refreshFees = async () => {
		if (!schoolId) return;

		try {
			const timestamp = new Date().getTime();
			const { data } = await api.get(`/fee-management/?school_id=${schoolId}&_t=${timestamp}`);
			setFees(getArrayFromResponse(data));
			setCurrentPage(1);
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || 'Failed to refresh fees data';
			toast.error(errorMessage);}
	};

	// Handle Bulk Create (form submission - shows confirm)
	const handleBulkCreateSubmit = async (feeRecords: Array<{ std_id: string; fee_type_id: string; academic_id: string; term: string; amount_paid: number; status: string; invoice_img?: string }>) => {
		setFormDataToSubmit({ bulkRecords: feeRecords } as any);
		setCreateModalOpen(false);
		setCreateConfirmOpen(true);
	};

	// Handle Bulk Create (after confirmation)
	const handleBulkCreateConfirm = async () => {
		if (!schoolId || !formDataToSubmit || !(formDataToSubmit as any).bulkRecords) {
			toast.error('School information not found');
			return;
		}

		setFormLoading(true);
		try {
			const bulkRecords = (formDataToSubmit as any).bulkRecords;
			const feeRecords = bulkRecords.map((record: any) => ({
				...record,
				school_id: schoolId,
			}));

			// Use async function to handle bulk creation
			const response = await api.post(`/fee-management/bulk`, {
				school_id: schoolId,
				fee_records: feeRecords,
			});

			toast.success(`${response.data.length} fee record(s) created successfully!`);
			setCreateConfirmOpen(false);
			setFormDataToSubmit(null);
			await refreshFees();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to create fee records');
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Update (form submission - shows confirm)
	const handleUpdateSubmit = async (formData: Partial<FeeManagementMember>) => {
		setFormDataToSubmit(formData);
		setEditModalOpen(false);
		setUpdateConfirmOpen(true);
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!selectedFee || !schoolId || !formDataToSubmit) return;

		setFormLoading(true);
		try {
			await api.put(`/fee-management/${selectedFee.fee_id}?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Fee record updated successfully!');
			setUpdateConfirmOpen(false);
			setSelectedFee(null);
			setFormDataToSubmit(null);
			await refreshFees();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to update fee record');
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDelete = async () => {
		if (!selectedFee || !schoolId) return;

		setDeleteLoading(true);
		try {
			await api.delete(`/fee-management/${selectedFee.fee_id}?school_id=${schoolId}`);
			toast.success('Fee record deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedFee(null);
			await refreshFees();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to delete fee record');
		} finally {
			setDeleteLoading(false);
		}
	};

	// Open modals
	const openViewModal = (fee: FeeManagementMember) => {
		setSelectedFee(fee);
		setViewModalOpen(true);
	};

	const openEditModal = (fee: FeeManagementMember) => {
		setSelectedFee(fee);
		setViewModalOpen(false);
		setTransactionEditModalOpen(true);
	};

	const openDeleteConfirm = (fee: FeeManagementMember) => {
		setSelectedFee(fee);
		setViewModalOpen(false);
		setTransactionDeleteModalOpen(true);
	};

	const handleEditRequestFromDelete = (invoiceIds: string[]) => {
		// Open edit modal with pre-selected invoices (if needed)
		setTransactionDeleteModalOpen(false);
		setTransactionEditModalOpen(true);
	};

	const openInvoicesModal = (fee: FeeManagementMember) => {
		setSelectedFee(fee);
		setInvoicesModalOpen(true);
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
							<p className="mt-4 text-gray-600">Loading fees...</p>
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
							<h1 className="text-3xl font-bold text-gray-900">Fee Management</h1>
							<p className="text-gray-600 mt-1">Manage student fee records and payments</p>
						</div>
						<button
							onClick={() => setCreateModalOpen(true)}
							className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors font-medium"
						>
							<PlusIcon className="w-5 h-5" />
							<span>Add Fee Record</span>
						</button>
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Fees</p>
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
									<p className="text-sm font-medium text-gray-600">Paid</p>
									<p className="text-3xl font-bold text-green-600 mt-2">{analytics.paid}</p>
								</div>
								<div className="p-3 bg-green-100 rounded-[3px]">
									<SparklesIcon className="w-6 h-6 text-green-600" />
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
									<BanknotesIcon className="w-6 h-6 text-yellow-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Overdue</p>
									<p className="text-3xl font-bold text-red-600 mt-2">{analytics.overdue}</p>
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
									placeholder="Search by student name, code, fee type, or term..."
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
								{(filters.status || filters.fee_type_id || filters.academic_id || filters.term || filters.grade) && (
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
							<div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
								{/* Status Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
									<div className="relative">
										<input
											ref={statusFilterInputRef}
											type="text"
											value={filters.status ? filters.status : statusFilterQuery}
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
														<div className="text-sm font-medium text-gray-900 capitalize">{status}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								{/* Fee Type Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Fee Type</label>
									<div className="relative">
										<input
											ref={feeTypeFilterInputRef}
											type="text"
											value={filters.fee_type_id ? availableFeeTypes.find(ft => ft.fee_type_id === filters.fee_type_id)?.fee_type_name || '' : feeTypeFilterQuery}
											onChange={(e) => {
												setFeeTypeFilterQuery(e.target.value);
												setShowFeeTypeFilterDropdown(true);
												setFeeTypeFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowFeeTypeFilterDropdown(false);
													handleFilterChange('fee_type_id', '');
												}
											}}
											onFocus={() => {
												if (filteredFeeTypes.length > 0) {
													setShowFeeTypeFilterDropdown(true);
												}
											}}
											placeholder="All Fee Types"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showFeeTypeFilterDropdown && filteredFeeTypes.length > 0 && (
											<div
												ref={feeTypeFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('fee_type_id', '');
														setFeeTypeFilterQuery('');
														setShowFeeTypeFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Fee Types</div>
												</button>
												{filteredFeeTypes.map((feeType, index) => (
													<button
														key={feeType.fee_type_id}
														type="button"
														onClick={() => {
															handleFilterChange('fee_type_id', feeType.fee_type_id);
															setFeeTypeFilterQuery(feeType.fee_type_name);
															setShowFeeTypeFilterDropdown(false);
														}}
														onMouseEnter={() => setFeeTypeFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === feeTypeFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.fee_type_id === feeType.fee_type_id ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">{feeType.fee_type_name}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								{/* Academic Year Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
									<div className="relative">
										<input
											ref={academicYearFilterInputRef}
											type="text"
											value={filters.academic_id ? sortedAcademicYears.find(ay => ay.academic_id === filters.academic_id)?.academic_name || '' : academicYearFilterQuery}
											onChange={(e) => {
												setAcademicYearFilterQuery(e.target.value);
												setShowAcademicYearFilterDropdown(true);
												setAcademicYearFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowAcademicYearFilterDropdown(false);
													handleFilterChange('academic_id', '');
												}
											}}
											onFocus={() => {
												if (filteredAcademicYears.length > 0) {
													setShowAcademicYearFilterDropdown(true);
												}
											}}
											placeholder="All Academic Years"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showAcademicYearFilterDropdown && filteredAcademicYears.length > 0 && (
											<div
												ref={academicYearFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('academic_id', '');
														setAcademicYearFilterQuery('');
														setShowAcademicYearFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Academic Years</div>
												</button>
												{filteredAcademicYears.map((academicYear, index) => (
													<button
														key={academicYear.academic_id}
														type="button"
														onClick={() => {
															handleFilterChange('academic_id', academicYear.academic_id);
															setAcademicYearFilterQuery(academicYear.academic_name);
															setShowAcademicYearFilterDropdown(false);
														}}
														onMouseEnter={() => setAcademicYearFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === academicYearFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.academic_id === academicYear.academic_id ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="flex items-center justify-between">
															<div className="text-sm font-medium text-gray-900">{academicYear.academic_name}</div>
															{academicYear.is_current && (
																<span className="text-xs text-green-600 font-medium">Current</span>
															)}
														</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								{/* Term Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
									<div className="relative">
										<input
											ref={termFilterInputRef}
											type="text"
											value={filters.term ? filters.term : termFilterQuery}
											onChange={(e) => {
												setTermFilterQuery(e.target.value);
												setShowTermFilterDropdown(true);
												setTermFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowTermFilterDropdown(false);
													handleFilterChange('term', '');
												}
											}}
											onFocus={() => {
												if (filteredTerms.length > 0) {
													setShowTermFilterDropdown(true);
												}
											}}
											placeholder="All Terms"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showTermFilterDropdown && filteredTerms.length > 0 && (
											<div
												ref={termFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('term', '');
														setTermFilterQuery('');
														setShowTermFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Terms</div>
												</button>
												{filteredTerms.map((term, index) => (
													<button
														key={term}
														type="button"
														onClick={() => {
															handleFilterChange('term', term);
															setTermFilterQuery(term);
															setShowTermFilterDropdown(false);
														}}
														onMouseEnter={() => setTermFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === termFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.term === term ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">{term}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								{/* Grade Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
									<div className="relative">
										<input
											ref={gradeFilterInputRef}
											type="text"
											value={filters.grade ? filters.grade : gradeFilterQuery}
											onChange={(e) => {
												setGradeFilterQuery(e.target.value);
												setShowGradeFilterDropdown(true);
												setGradeFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowGradeFilterDropdown(false);
													handleFilterChange('grade', '');
												}
											}}
											onFocus={() => {
												if (filteredGrades.length > 0) {
													setShowGradeFilterDropdown(true);
												}
											}}
											placeholder="All Grades"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showGradeFilterDropdown && filteredGrades.length > 0 && (
											<div
												ref={gradeFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('grade', '');
														setGradeFilterQuery('');
														setShowGradeFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Grades</div>
												</button>
												{filteredGrades.map((grade, index) => (
													<button
														key={grade}
														type="button"
														onClick={() => {
															handleFilterChange('grade', grade);
															setGradeFilterQuery(grade);
															setShowGradeFilterDropdown(false);
														}}
														onMouseEnter={() => setGradeFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === gradeFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.grade === grade ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">{grade}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Fees Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Type</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount To Pay</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{paginatedFees.length === 0 ? (
										<tr>
											<td colSpan={10} className="px-6 py-12 text-center">
												<div className="flex flex-col items-center justify-center gap-3">
													<BanknotesIcon className="w-12 h-12 text-gray-400" />
													<p className="text-gray-500 font-medium">No fee records found</p>
												</div>
											</td>
										</tr>
									) : (
										paginatedFees.map((fee) => (
											<tr key={fee.fee_id} className="hover:bg-gray-50 transition-colors">
												<td className="px-6 py-4 whitespace-nowrap">
													<div>
														<div className="text-sm font-medium text-gray-900">{fee.student?.std_name || 'N/A'}</div>
														<div className="flex items-center gap-2 mt-1">
															{fee.student?.std_code && (
																<div className="text-xs text-gray-500">{fee.student.std_code}</div>
															)}
															{fee.student?.current_class_name && (
																<>
																	{fee.student?.std_code && <span className="text-xs text-gray-300">•</span>}
																	<div className="text-xs text-blue-600 font-medium">{fee.student.current_class_name}</div>
																</>
															)}
														</div>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">{fee.fee_type?.fee_type_name || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">{fee.academic_year?.academic_name || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">{fee.term || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">{formatCurrency(fee.amount_paid || 0)}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-blue-600">
														{fee.fee_type?.amount_to_pay ? formatCurrency(fee.fee_type.amount_to_pay) : 'N/A'}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													{fee.fee_type?.amount_to_pay !== undefined ? (
														<div className={`text-sm font-medium ${
															(fee.fee_type.amount_to_pay - (fee.amount_paid || 0)) > 0 
																? 'text-red-600' 
																: 'text-green-600'
														}`}>
															{formatCurrency(Math.max(0, fee.fee_type.amount_to_pay - (fee.amount_paid || 0)))}
														</div>
													) : (
														<div className="text-sm text-gray-400">N/A</div>
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center gap-2">
														{fee.invoice_img ? (() => {
															const baseURL = api.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:8000';
															// Handle path that may already include 'uploads/' prefix
															let imagePath = fee.invoice_img;
															if (!imagePath.startsWith('uploads/')) {
																imagePath = `uploads/${imagePath}`;
															}
															// Ensure path starts with / for proper URL construction
															const imageUrl = `${baseURL}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
															return (
																<a
																	href={imageUrl}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="relative inline-block"
																>
																	<img
																		src={imageUrl}
																		alt="Invoice"
																		className="w-12 h-12 object-cover border border-gray-300 rounded-[3px] hover:opacity-80 transition-opacity cursor-pointer"
																		onError={(e) => {(e.target as HTMLImageElement).style.display = 'none';
																		}}
																	/>
																</a>
															);
														})() : (
															<span className="text-sm text-gray-400">No image</span>
														)}
														{invoiceCounts[fee.fee_id] && invoiceCounts[fee.fee_id].count > 0 && (
															<div className="flex flex-col">
																<span className="text-xs font-medium text-purple-600">
																	{invoiceCounts[fee.fee_id].count} invoice{invoiceCounts[fee.fee_id].count !== 1 ? 's' : ''}
																</span>
																<span className="text-xs text-gray-500">
																	{formatCurrency(invoiceCounts[fee.fee_id].totalAmount)}
																</span>
															</div>
														)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium capitalize ${getStatusColor(fee.status)}`}>
														{fee.status}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
													<div className="flex items-center gap-2">
														<button
															onClick={() => openViewModal(fee)}
															className="text-blue-600 hover:text-blue-900 transition-colors"
															title="View"
														>
															<EyeIcon className="w-5 h-5" />
														</button>
														<button
															onClick={() => openInvoicesModal(fee)}
															className="text-purple-600 hover:text-purple-900 transition-colors"
															title="View Invoices"
														>
															<DocumentTextIcon className="w-5 h-5" />
														</button>
														<button
															onClick={() => openEditModal(fee)}
															className="text-green-600 hover:text-green-900 transition-colors"
															title="Edit"
														>
															<PencilIcon className="w-5 h-5" />
														</button>
														<button
															onClick={() => openDeleteConfirm(fee)}
															className="text-red-600 hover:text-red-900 transition-colors"
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
							<div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
								<div className="text-sm text-gray-700">
									Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
									<span className="font-medium">
										{Math.min(startIndex + itemsPerPage, filteredFees.length)}
									</span>{' '}
									of <span className="font-medium">{filteredFees.length}</span> results
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
										disabled={currentPage === 1}
										className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Previous
									</button>
									<span className="text-sm text-gray-700">
										Page <span className="font-medium">{currentPage}</span> of{' '}
										<span className="font-medium">{totalPages}</span>
									</span>
									<button
										onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
										disabled={currentPage === totalPages}
										className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Next
									</button>
								</div>
							</div>
						)}
					</div>
				</main>
			</div>

			{/* Create Modal (Bulk) */}
			<Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Fee Records" size="4xl">
				<BulkFeeManagementForm
					schoolId={schoolId || ''}
					onSubmit={handleBulkCreateSubmit}
					onCancel={() => setCreateModalOpen(false)}
					loading={formLoading}
				/>
			</Modal>

			{/* Edit Modal */}
			<Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Fee Record" size="xl">
				{selectedFee && (
					<FeeManagementForm
						mode="edit"
						fee={selectedFee}
						schoolId={schoolId || ''}
						onSubmit={handleUpdateSubmit}
						onCancel={() => setEditModalOpen(false)}
						loading={formLoading}
					/>
				)}
			</Modal>

			{/* View Modal */}
			{selectedFee && (
				<FeeManagementViewModal
					fee={selectedFee}
					isOpen={viewModalOpen}
					onClose={() => {
						setViewModalOpen(false);
						setSelectedFee(null);
					}}
					onEdit={() => openEditModal(selectedFee)}
					onDelete={() => openDeleteConfirm(selectedFee)}
				/>
			)}

			{/* Confirm Modals */}
			<ConfirmModal
				isOpen={createConfirmOpen}
				onClose={() => {
					setCreateConfirmOpen(false);
					setFormDataToSubmit(null);
				}}
				onConfirm={handleBulkCreateConfirm}
				title="Create Fee Records"
				message={`Are you sure you want to create ${(formDataToSubmit as any)?.bulkRecords?.length || 0} fee record(s)?`}
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
				title="Update Fee Record"
				message="Are you sure you want to update this fee record?"
				confirmText="Update"
				type="info"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={deleteConfirmOpen}
				onClose={() => {
					setDeleteConfirmOpen(false);
					setSelectedFee(null);
				}}
				onConfirm={handleDelete}
				title="Delete Fee Record"
				message="Are you sure you want to delete this fee record? This action cannot be undone."
				confirmText="Delete"
				type="danger"
				loading={deleteLoading}
			/>

			{/* Invoices Modal */}
			{selectedFee && schoolId && (
				<FeeInvoicesModal
					feeId={selectedFee.fee_id}
					schoolId={schoolId}
					isOpen={invoicesModalOpen}
					onClose={() => {
						setInvoicesModalOpen(false);
						setSelectedFee(null);
					}}
				/>
			)}

			{/* Transaction Edit Modal */}
			{selectedFee && schoolId && (
				<TransactionEditModal
					fee={selectedFee}
					schoolId={schoolId}
					isOpen={transactionEditModalOpen}
					onClose={() => {
						setTransactionEditModalOpen(false);
						setSelectedFee(null);
					}}
					onSuccess={async () => {
						await refreshFees();
						// Refresh invoice counts
						const counts: Record<string, { count: number; totalAmount: number }> = {};
						const invoicePromises = fees.map(async (fee) => {
							try {
								const { data } = await api.get(`/fee-invoices/?school_id=${schoolId}&fee_id=${fee.fee_id}`);
								const invoices = data || [];
								const totalAmount = invoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
								counts[fee.fee_id] = {
									count: invoices.length,
									totalAmount: totalAmount,
								};
							} catch (error) {
								counts[fee.fee_id] = { count: 0, totalAmount: 0 };
							}
						});
						await Promise.all(invoicePromises);
						setInvoiceCounts(counts);
					}}
				/>
			)}

			{/* Transaction Delete Modal */}
			{selectedFee && schoolId && (
				<TransactionDeleteModal
					fee={selectedFee}
					schoolId={schoolId}
					isOpen={transactionDeleteModalOpen}
					onClose={() => {
						setTransactionDeleteModalOpen(false);
						setSelectedFee(null);
					}}
					onSuccess={async () => {
						await refreshFees();
						// Refresh invoice counts
						const counts: Record<string, { count: number; totalAmount: number }> = {};
						const invoicePromises = fees.map(async (fee) => {
							try {
								const { data } = await api.get(`/fee-invoices/?school_id=${schoolId}&fee_id=${fee.fee_id}`);
								const invoices = data || [];
								const totalAmount = invoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
								counts[fee.fee_id] = {
									count: invoices.length,
									totalAmount: totalAmount,
								};
							} catch (error) {
								counts[fee.fee_id] = { count: 0, totalAmount: 0 };
							}
						});
						await Promise.all(invoicePromises);
						setInvoiceCounts(counts);
					}}
					onEditRequest={handleEditRequestFromDelete}
				/>
			)}
		</div>
	);
}


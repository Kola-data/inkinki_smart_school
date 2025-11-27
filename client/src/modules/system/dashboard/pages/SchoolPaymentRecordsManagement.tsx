import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import { getArrayFromResponse } from '../../../../utils/apiHelpers';
import {
	DocumentTextIcon,
	PlusIcon,
	MagnifyingGlassIcon,
	PencilIcon,
	TrashIcon,
	BuildingOfficeIcon,
	FunnelIcon,
	XMarkIcon,
	CurrencyDollarIcon,
	ClockIcon,
	CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface SchoolPaymentRecord {
	record_id: string;
	school_id: string;
	payment_id: string;
	status: string;
	date: string;
	is_deleted: boolean;
	created_at: string;
	updated_at?: string;
}

interface School {
	school_id: string;
	school_name: string;
}

interface PaymentSeason {
	pay_id: string;
	season_pay_name: string;
	from_date?: string;
	end_date?: string;
}

export default function SchoolPaymentRecordsManagement() {
	const [records, setRecords] = useState<SchoolPaymentRecord[]>([]);
	const [schools, setSchools] = useState<School[]>([]);
	const [paymentSeasons, setPaymentSeasons] = useState<PaymentSeason[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingRecord, setEditingRecord] = useState<SchoolPaymentRecord | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [showFilters, setShowFilters] = useState(false);
	
	// Filter state
	const [filters, setFilters] = useState({
		search: '',
		school_id: '',
		payment_id: '',
		status: '',
	});
	
	const [formData, setFormData] = useState({
		school_id: '',
		payment_id: '',
		status: 'pending',
		date: ''
	});

	// Autocomplete states for school
	const [schoolQuery, setSchoolQuery] = useState('');
	const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
	const [schoolHighlightedIndex, setSchoolHighlightedIndex] = useState(-1);
	const schoolDropdownRef = useRef<HTMLDivElement>(null);
	const schoolInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for payment season
	const [paymentSeasonQuery, setPaymentSeasonQuery] = useState('');
	const [showPaymentSeasonDropdown, setShowPaymentSeasonDropdown] = useState(false);
	const [paymentSeasonHighlightedIndex, setPaymentSeasonHighlightedIndex] = useState(-1);
	const paymentSeasonDropdownRef = useRef<HTMLDivElement>(null);
	const paymentSeasonInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for status
	const [statusQuery, setStatusQuery] = useState('Pending');
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const [statusHighlightedIndex, setStatusHighlightedIndex] = useState(-1);
	const statusDropdownRef = useRef<HTMLDivElement>(null);
	const statusInputRef = useRef<HTMLInputElement>(null);

	// Filter autocomplete states
	const [schoolFilterQuery, setSchoolFilterQuery] = useState('');
	const [showSchoolFilterDropdown, setShowSchoolFilterDropdown] = useState(false);
	const [schoolFilterHighlightedIndex, setSchoolFilterHighlightedIndex] = useState(-1);
	const schoolFilterDropdownRef = useRef<HTMLDivElement>(null);
	const schoolFilterInputRef = useRef<HTMLInputElement>(null);

	const [paymentSeasonFilterQuery, setPaymentSeasonFilterQuery] = useState('');
	const [showPaymentSeasonFilterDropdown, setShowPaymentSeasonFilterDropdown] = useState(false);
	const [paymentSeasonFilterHighlightedIndex, setPaymentSeasonFilterHighlightedIndex] = useState(-1);
	const paymentSeasonFilterDropdownRef = useRef<HTMLDivElement>(null);
	const paymentSeasonFilterInputRef = useRef<HTMLInputElement>(null);

	const [statusFilterQuery, setStatusFilterQuery] = useState('');
	const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
	const [statusFilterHighlightedIndex, setStatusFilterHighlightedIndex] = useState(-1);
	const statusFilterDropdownRef = useRef<HTMLDivElement>(null);
	const statusFilterInputRef = useRef<HTMLInputElement>(null);

	const statusOptions = ['pending', 'paid', 'overdue', 'cancelled'];

	useEffect(() => {
		fetchRecords();
		fetchSchools();
		fetchPaymentSeasons();
	}, []);

	const fetchRecords = async () => {
		try {
			setLoading(true);
			const { data } = await api.get('/school-payment-records/');
			setRecords(getArrayFromResponse(data));
		} catch (err: any) {
			const errorMessage = err.response?.data?.detail || 'Failed to fetch payment records';
			toast.error(errorMessage);
			setRecords([]);
		} finally {
			setLoading(false);
		}
	};

	const fetchSchools = async () => {
		try {
			const { data } = await api.get('/school/');
			setSchools(getArrayFromResponse(data));
		} catch (err: any) {
			console.error('Failed to fetch schools:', err);
		}
	};

	const fetchPaymentSeasons = async () => {
		try {
			const { data } = await api.get('/payment-seasons/');
			setPaymentSeasons(getArrayFromResponse(data));
		} catch (err: any) {
			console.error('Failed to fetch payment seasons:', err);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// Validate that school and payment season are selected
		if (!formData.school_id) {
			toast.error('Please select a school');
			return;
		}
		if (!formData.payment_id) {
			toast.error('Please select a payment season');
			return;
		}
		
		try {
			const payload = {
				...formData,
				school_id: formData.school_id,
				payment_id: formData.payment_id,
			};

			if (editingRecord) {
				await api.put(`/school-payment-records/${editingRecord.record_id}`, payload);
				toast.success('Payment record updated successfully');
			} else {
				await api.post('/school-payment-records/', payload);
				toast.success('Payment record created successfully');
			}

			setShowForm(false);
			setEditingRecord(null);
			resetForm();
			fetchRecords();
		} catch (err: any) {
			const errorMessage = err.response?.data?.detail || 'Failed to save payment record';
			toast.error(errorMessage);
		}
	};

	const handleEdit = (record: SchoolPaymentRecord) => {
		setEditingRecord(record);
		setFormData({
			school_id: record.school_id,
			payment_id: record.payment_id,
			status: record.status,
			date: record.date
		});
		// Set autocomplete queries
		const school = schools.find(s => s.school_id === record.school_id);
		const season = paymentSeasons.find(p => p.pay_id === record.payment_id);
		setSchoolQuery(school?.school_name || '');
		setPaymentSeasonQuery(season?.season_pay_name || '');
		setStatusQuery(record.status.charAt(0).toUpperCase() + record.status.slice(1));
		setShowForm(true);
	};

	const handleDelete = async (recordId: string) => {
		if (!window.confirm('Are you sure you want to delete this payment record?')) {
			return;
		}

		try {
			await api.delete(`/school-payment-records/${recordId}`);
			toast.success('Payment record deleted successfully');
			fetchRecords();
		} catch (err: any) {
			toast.error('Failed to delete payment record');
		}
	};

	// Selection handlers - update formData first, then query
	const handleSelectSchool = (school: School) => {
		setFormData((prev) => ({ ...prev, school_id: school.school_id }));
		setSchoolQuery(school.school_name);
		setShowSchoolDropdown(false);
		setSchoolHighlightedIndex(-1);
	};

	const handleSelectPaymentSeason = (season: PaymentSeason) => {
		setFormData((prev) => ({ ...prev, payment_id: season.pay_id }));
		setPaymentSeasonQuery(season.season_pay_name);
		setShowPaymentSeasonDropdown(false);
		setPaymentSeasonHighlightedIndex(-1);
	};

	const handleSelectStatus = (status: string) => {
		setFormData((prev) => ({ ...prev, status }));
		setStatusQuery(status.charAt(0).toUpperCase() + status.slice(1));
		setShowStatusDropdown(false);
		setStatusHighlightedIndex(-1);
	};

	// Filter school options based on query
	const filteredSchoolOptions = useMemo(() => {
		return schools.filter((school) => {
			if (!schoolQuery.trim()) return true;
			return school.school_name.toLowerCase().includes(schoolQuery.toLowerCase());
		});
	}, [schools, schoolQuery]);

	// Filter payment season options based on query
	const filteredPaymentSeasonOptions = useMemo(() => {
		return paymentSeasons.filter((season) => {
			if (!paymentSeasonQuery.trim()) return true;
			return season.season_pay_name.toLowerCase().includes(paymentSeasonQuery.toLowerCase());
		});
	}, [paymentSeasons, paymentSeasonQuery]);

	// Filter status options based on query
	const filteredStatusOptions = useMemo(() => {
		return statusOptions.filter((status) => {
			if (!statusQuery.trim()) return true;
			return status.toLowerCase().includes(statusQuery.toLowerCase());
		});
	}, [statusQuery]);

	// Keyboard navigation for school autocomplete
	const handleSchoolKeyDown = (e: React.KeyboardEvent) => {
		if (!showSchoolDropdown || filteredSchoolOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setSchoolHighlightedIndex((prev) => (prev < filteredSchoolOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setSchoolHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (schoolHighlightedIndex >= 0 && schoolHighlightedIndex < filteredSchoolOptions.length) {
					handleSelectSchool(filteredSchoolOptions[schoolHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowSchoolDropdown(false);
				setSchoolHighlightedIndex(-1);
				break;
		}
	};

	// Keyboard navigation for payment season autocomplete
	const handlePaymentSeasonKeyDown = (e: React.KeyboardEvent) => {
		if (!showPaymentSeasonDropdown || filteredPaymentSeasonOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setPaymentSeasonHighlightedIndex((prev) => (prev < filteredPaymentSeasonOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setPaymentSeasonHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (paymentSeasonHighlightedIndex >= 0 && paymentSeasonHighlightedIndex < filteredPaymentSeasonOptions.length) {
					handleSelectPaymentSeason(filteredPaymentSeasonOptions[paymentSeasonHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowPaymentSeasonDropdown(false);
				setPaymentSeasonHighlightedIndex(-1);
				break;
		}
	};

	// Keyboard navigation for status autocomplete
	const handleStatusKeyDown = (e: React.KeyboardEvent) => {
		if (!showStatusDropdown || filteredStatusOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setStatusHighlightedIndex((prev) => (prev < filteredStatusOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setStatusHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (statusHighlightedIndex >= 0 && statusHighlightedIndex < filteredStatusOptions.length) {
					handleSelectStatus(filteredStatusOptions[statusHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowStatusDropdown(false);
				setStatusHighlightedIndex(-1);
				break;
		}
	};

	// Keyboard navigation for filter dropdowns
	const handleSchoolFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showSchoolFilterDropdown || filteredSchoolFilterOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setSchoolFilterHighlightedIndex((prev) => (prev < filteredSchoolFilterOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setSchoolFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (schoolFilterHighlightedIndex >= 0 && schoolFilterHighlightedIndex < filteredSchoolFilterOptions.length) {
					const selected = filteredSchoolFilterOptions[schoolFilterHighlightedIndex];
					handleFilterChange('school_id', selected.school_id);
					setSchoolFilterQuery(selected.school_name);
					setShowSchoolFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowSchoolFilterDropdown(false);
				setSchoolFilterHighlightedIndex(-1);
				break;
		}
	};

	const handlePaymentSeasonFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showPaymentSeasonFilterDropdown || filteredPaymentSeasonFilterOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setPaymentSeasonFilterHighlightedIndex((prev) => (prev < filteredPaymentSeasonFilterOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setPaymentSeasonFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (paymentSeasonFilterHighlightedIndex >= 0 && paymentSeasonFilterHighlightedIndex < filteredPaymentSeasonFilterOptions.length) {
					const selected = filteredPaymentSeasonFilterOptions[paymentSeasonFilterHighlightedIndex];
					handleFilterChange('payment_id', selected.pay_id);
					setPaymentSeasonFilterQuery(selected.season_pay_name);
					setShowPaymentSeasonFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowPaymentSeasonFilterDropdown(false);
				setPaymentSeasonFilterHighlightedIndex(-1);
				break;
		}
	};

	const handleStatusFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showStatusFilterDropdown || filteredStatusFilterOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setStatusFilterHighlightedIndex((prev) => (prev < filteredStatusFilterOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setStatusFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (statusFilterHighlightedIndex >= 0 && statusFilterHighlightedIndex < filteredStatusFilterOptions.length) {
					const selected = filteredStatusFilterOptions[statusFilterHighlightedIndex];
					handleFilterChange('status', selected);
					setStatusFilterQuery(selected.charAt(0).toUpperCase() + selected.slice(1));
					setShowStatusFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowStatusFilterDropdown(false);
				setStatusFilterHighlightedIndex(-1);
				break;
		}
	};

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				(schoolDropdownRef.current && !schoolDropdownRef.current.contains(target) && !schoolInputRef.current?.contains(target)) ||
				(paymentSeasonDropdownRef.current && !paymentSeasonDropdownRef.current.contains(target) && !paymentSeasonInputRef.current?.contains(target)) ||
				(statusDropdownRef.current && !statusDropdownRef.current.contains(target) && !statusInputRef.current?.contains(target)) ||
				(schoolFilterDropdownRef.current && !schoolFilterDropdownRef.current.contains(target) && !schoolFilterInputRef.current?.contains(target)) ||
				(paymentSeasonFilterDropdownRef.current && !paymentSeasonFilterDropdownRef.current.contains(target) && !paymentSeasonFilterInputRef.current?.contains(target)) ||
				(statusFilterDropdownRef.current && !statusFilterDropdownRef.current.contains(target) && !statusFilterInputRef.current?.contains(target))
			) {
				if (showSchoolDropdown) {
					setShowSchoolDropdown(false);
					setSchoolHighlightedIndex(-1);
				}
				if (showPaymentSeasonDropdown) {
					setShowPaymentSeasonDropdown(false);
					setPaymentSeasonHighlightedIndex(-1);
				}
				if (showStatusDropdown) {
					setShowStatusDropdown(false);
					setStatusHighlightedIndex(-1);
				}
				if (showSchoolFilterDropdown) {
					setShowSchoolFilterDropdown(false);
					setSchoolFilterHighlightedIndex(-1);
				}
				if (showPaymentSeasonFilterDropdown) {
					setShowPaymentSeasonFilterDropdown(false);
					setPaymentSeasonFilterHighlightedIndex(-1);
				}
				if (showStatusFilterDropdown) {
					setShowStatusFilterDropdown(false);
					setStatusFilterHighlightedIndex(-1);
				}
			}
		};

		if (showSchoolDropdown || showPaymentSeasonDropdown || showStatusDropdown || showSchoolFilterDropdown || showPaymentSeasonFilterDropdown || showStatusFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showSchoolDropdown, showPaymentSeasonDropdown, showStatusDropdown, showSchoolFilterDropdown, showPaymentSeasonFilterDropdown, showStatusFilterDropdown]);

	// Update queries when editing (set initial values)
	useEffect(() => {
		if (editingRecord && schools.length > 0 && paymentSeasons.length > 0) {
			const school = schools.find(s => s.school_id === editingRecord.school_id);
			const season = paymentSeasons.find(p => p.pay_id === editingRecord.payment_id);
			if (school) setSchoolQuery(school.school_name);
			if (season) setPaymentSeasonQuery(season.season_pay_name);
		}
	}, [editingRecord, schools, paymentSeasons]);

	useEffect(() => {
		if (formData.status) {
			setStatusQuery(formData.status.charAt(0).toUpperCase() + formData.status.slice(1));
		}
	}, [formData.status]);

	const resetForm = () => {
		setFormData({
			school_id: '',
			payment_id: '',
			status: 'pending',
			date: ''
		});
		setSchoolQuery('');
		setPaymentSeasonQuery('');
		setStatusQuery('Pending');
		setEditingRecord(null);
	};

	const resetFilters = () => {
		setFilters({
			search: '',
			school_id: '',
			payment_id: '',
			status: '',
		});
		setSchoolFilterQuery('');
		setPaymentSeasonFilterQuery('');
		setStatusFilterQuery('');
		setCurrentPage(1);
	};

	const handleFilterChange = (key: keyof typeof filters, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	// Filter records based on filters
	const filteredRecords = useMemo(() => {
		let filtered = records.filter((record) => !record.is_deleted);

		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			filtered = filtered.filter((record) => {
				const school = schools.find(s => s.school_id === record.school_id);
				const season = paymentSeasons.find(p => p.pay_id === record.payment_id);
				return (
					school?.school_name.toLowerCase().includes(searchLower) ||
					season?.season_pay_name.toLowerCase().includes(searchLower) ||
					record.status.toLowerCase().includes(searchLower)
				);
			});
		}

		if (filters.school_id) {
			filtered = filtered.filter((record) => record.school_id === filters.school_id);
		}

		if (filters.payment_id) {
			filtered = filtered.filter((record) => record.payment_id === filters.payment_id);
		}

		if (filters.status) {
			filtered = filtered.filter((record) => record.status === filters.status);
		}

		return filtered;
	}, [records, filters, schools, paymentSeasons]);

	// Pagination
	const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

	// Analytics
	const analytics = useMemo(() => {
		const total = filteredRecords.length;
		const paid = filteredRecords.filter((r) => r.status === 'paid').length;
		const pending = filteredRecords.filter((r) => r.status === 'pending').length;
		const overdue = filteredRecords.filter((r) => r.status === 'overdue').length;
		
		const statusCounts = filteredRecords.reduce((acc, record) => {
			acc[record.status] = (acc[record.status] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		return {
			total,
			paid,
			pending,
			overdue,
			statusCounts,
		};
	}, [filteredRecords]);

	// Filter options for filters
	const filteredSchoolFilterOptions = useMemo(() => {
		return schools.filter((school) => {
			if (!schoolFilterQuery.trim()) return true;
			return school.school_name.toLowerCase().includes(schoolFilterQuery.toLowerCase());
		});
	}, [schools, schoolFilterQuery]);

	const filteredPaymentSeasonFilterOptions = useMemo(() => {
		return paymentSeasons.filter((season) => {
			if (!paymentSeasonFilterQuery.trim()) return true;
			return season.season_pay_name.toLowerCase().includes(paymentSeasonFilterQuery.toLowerCase());
		});
	}, [paymentSeasons, paymentSeasonFilterQuery]);

	const filteredStatusFilterOptions = useMemo(() => {
		return statusOptions.filter((status) => {
			if (!statusFilterQuery.trim()) return true;
			return status.toLowerCase().includes(statusFilterQuery.toLowerCase());
		});
	}, [statusFilterQuery]);

	const getSchoolName = (schoolId: string) => {
		const school = schools.find(s => s.school_id === schoolId);
		return school?.school_name || 'Unknown';
	};

	const getPaymentSeasonName = (paymentId: string) => {
		const season = paymentSeasons.find(p => p.pay_id === paymentId);
		return season?.season_pay_name || 'Unknown';
	};

	const getPaymentSeasonStartDate = (paymentId: string) => {
		const season = paymentSeasons.find(p => p.pay_id === paymentId);
		if (season?.from_date) {
			return new Date(season.from_date).toLocaleDateString();
		}
		return '—';
	};

	const getPaymentSeasonEndDate = (paymentId: string) => {
		const season = paymentSeasons.find(p => p.pay_id === paymentId);
		if (season?.end_date) {
			return new Date(season.end_date).toLocaleDateString();
		}
		return '—';
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-gray-500">Loading payment records...</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">School Payment Records</h1>
					<p className="text-gray-600 mt-1">Manage payment records for schools</p>
				</div>
				<button
					onClick={() => {
						resetForm();
						setShowForm(true);
					}}
					className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-[3px] hover:bg-indigo-700 transition"
				>
					<PlusIcon className="w-5 h-5" />
					<span>Add Record</span>
				</button>
			</div>

			{/* Analytics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
					<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Total Records</p>
							<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
						</div>
						<div className="p-3 bg-blue-100 rounded-[3px]">
							<DocumentTextIcon className="w-6 h-6 text-blue-600" />
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
					<div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Overdue</p>
							<p className="text-3xl font-bold text-red-600 mt-2">{analytics.overdue}</p>
						</div>
						<div className="p-3 bg-red-100 rounded-[3px]">
							<CurrencyDollarIcon className="w-6 h-6 text-red-600" />
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
							placeholder="Search by school name, payment season, or status..."
							value={filters.search}
							onChange={(e) => handleFilterChange('search', e.target.value)}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
						/>
					</div>
					<div className="flex items-center gap-3 flex-wrap">
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
									? 'bg-indigo-600 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							<FunnelIcon className="w-5 h-5" />
							<span>Filters</span>
						</button>
						{(filters.school_id || filters.payment_id || filters.status) && (
							<button
								onClick={resetFilters}
								className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[3px] font-medium transition-all duration-200 flex items-center gap-2"
							>
								<XMarkIcon className="w-5 h-5" />
								<span>Clear</span>
							</button>
						)}
					</div>
				</div>

				{/* Advanced Filters */}
				{showFilters && (
					<div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
						{/* School Filter */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">School</label>
							<div className="relative">
								<input
									ref={schoolFilterInputRef}
									type="text"
									value={filters.school_id ? getSchoolName(filters.school_id) : schoolFilterQuery}
									onChange={(e) => {
										setSchoolFilterQuery(e.target.value);
										setShowSchoolFilterDropdown(true);
										setSchoolFilterHighlightedIndex(-1);
										// Clear filter if user is typing something different
										if (filters.school_id) {
											const currentSchoolName = getSchoolName(filters.school_id);
											if (e.target.value !== currentSchoolName) {
												handleFilterChange('school_id', '');
											}
										}
										if (!e.target.value.trim()) {
											setShowSchoolFilterDropdown(false);
											handleFilterChange('school_id', '');
										}
									}}
									onFocus={() => {
										if (filteredSchoolFilterOptions.length > 0) {
											setShowSchoolFilterDropdown(true);
										}
									}}
									onKeyDown={handleSchoolFilterKeyDown}
									placeholder="All"
									className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
								/>
								{showSchoolFilterDropdown && filteredSchoolFilterOptions.length > 0 && (
									<div
										ref={schoolFilterDropdownRef}
										className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
									>
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setSchoolFilterQuery('');
												handleFilterChange('school_id', '');
												setShowSchoolFilterDropdown(false);
												setSchoolFilterHighlightedIndex(-1);
											}}
											className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
										>
											<div className="text-sm font-medium text-gray-900">All</div>
										</button>
										{filteredSchoolFilterOptions.map((school, index) => (
											<button
												key={school.school_id}
												type="button"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													setSchoolFilterQuery(school.school_name);
													handleFilterChange('school_id', school.school_id);
													setShowSchoolFilterDropdown(false);
													setSchoolFilterHighlightedIndex(-1);
												}}
												onMouseEnter={() => setSchoolFilterHighlightedIndex(index)}
												className={`w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors ${
													index === schoolFilterHighlightedIndex ? 'bg-indigo-50' : ''
												} ${filters.school_id === school.school_id ? 'bg-indigo-100 font-medium' : ''}`}
											>
												<div className="text-sm font-medium text-gray-900">{school.school_name}</div>
											</button>
										))}
									</div>
								)}
							</div>
						</div>

						{/* Payment Season Filter */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Payment Season</label>
							<div className="relative">
								<input
									ref={paymentSeasonFilterInputRef}
									type="text"
									value={filters.payment_id ? getPaymentSeasonName(filters.payment_id) : paymentSeasonFilterQuery}
									onChange={(e) => {
										setPaymentSeasonFilterQuery(e.target.value);
										setShowPaymentSeasonFilterDropdown(true);
										setPaymentSeasonFilterHighlightedIndex(-1);
										// Clear filter if user is typing something different
										if (filters.payment_id) {
											const currentSeasonName = getPaymentSeasonName(filters.payment_id);
											if (e.target.value !== currentSeasonName) {
												handleFilterChange('payment_id', '');
											}
										}
										if (!e.target.value.trim()) {
											setShowPaymentSeasonFilterDropdown(false);
											handleFilterChange('payment_id', '');
										}
									}}
									onFocus={() => {
										if (filteredPaymentSeasonFilterOptions.length > 0) {
											setShowPaymentSeasonFilterDropdown(true);
										}
									}}
									onKeyDown={handlePaymentSeasonFilterKeyDown}
									placeholder="All"
									className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
								/>
								{showPaymentSeasonFilterDropdown && filteredPaymentSeasonFilterOptions.length > 0 && (
									<div
										ref={paymentSeasonFilterDropdownRef}
										className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
									>
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setPaymentSeasonFilterQuery('');
												handleFilterChange('payment_id', '');
												setShowPaymentSeasonFilterDropdown(false);
												setPaymentSeasonFilterHighlightedIndex(-1);
											}}
											className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
										>
											<div className="text-sm font-medium text-gray-900">All</div>
										</button>
										{filteredPaymentSeasonFilterOptions.map((season, index) => (
											<button
												key={season.pay_id}
												type="button"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													setPaymentSeasonFilterQuery(season.season_pay_name);
													handleFilterChange('payment_id', season.pay_id);
													setShowPaymentSeasonFilterDropdown(false);
													setPaymentSeasonFilterHighlightedIndex(-1);
												}}
												onMouseEnter={() => setPaymentSeasonFilterHighlightedIndex(index)}
												className={`w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors ${
													index === paymentSeasonFilterHighlightedIndex ? 'bg-indigo-50' : ''
												} ${filters.payment_id === season.pay_id ? 'bg-indigo-100 font-medium' : ''}`}
											>
												<div className="text-sm font-medium text-gray-900">{season.season_pay_name}</div>
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
									value={filters.status ? filters.status.charAt(0).toUpperCase() + filters.status.slice(1) : statusFilterQuery}
									onChange={(e) => {
										setStatusFilterQuery(e.target.value);
										setShowStatusFilterDropdown(true);
										setStatusFilterHighlightedIndex(-1);
										// Clear filter if user is typing something different
										if (filters.status) {
											const currentStatus = filters.status.charAt(0).toUpperCase() + filters.status.slice(1);
											if (e.target.value !== currentStatus) {
												handleFilterChange('status', '');
											}
										}
										if (!e.target.value.trim()) {
											setShowStatusFilterDropdown(false);
											handleFilterChange('status', '');
										}
									}}
									onFocus={() => {
										if (filteredStatusFilterOptions.length > 0) {
											setShowStatusFilterDropdown(true);
										}
									}}
									onKeyDown={handleStatusFilterKeyDown}
									placeholder="All"
									className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
								/>
								{showStatusFilterDropdown && filteredStatusFilterOptions.length > 0 && (
									<div
										ref={statusFilterDropdownRef}
										className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
									>
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setStatusFilterQuery('');
												handleFilterChange('status', '');
												setShowStatusFilterDropdown(false);
												setStatusFilterHighlightedIndex(-1);
											}}
											className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
										>
											<div className="text-sm font-medium text-gray-900">All</div>
										</button>
										{filteredStatusFilterOptions.map((status, index) => (
											<button
												key={status}
												type="button"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													setStatusFilterQuery(status.charAt(0).toUpperCase() + status.slice(1));
													handleFilterChange('status', status);
													setShowStatusFilterDropdown(false);
													setStatusFilterHighlightedIndex(-1);
												}}
												onMouseEnter={() => setStatusFilterHighlightedIndex(index)}
												className={`w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors ${
													index === statusFilterHighlightedIndex ? 'bg-indigo-50' : ''
												} ${filters.status === status ? 'bg-indigo-100 font-medium' : ''}`}
											>
												<div className="text-sm font-medium text-gray-900">{status.charAt(0).toUpperCase() + status.slice(1)}</div>
											</button>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Form Modal */}
			{showForm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-[3px] shadow-xl w-full max-w-md mx-4">
						<div className="p-6 border-b border-gray-200">
							<h2 className="text-xl font-semibold">
								{editingRecord ? 'Edit Payment Record' : 'Create Payment Record'}
							</h2>
						</div>
						<form onSubmit={handleSubmit} className="p-6 space-y-4">
							{/* School */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									School <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<input
										ref={schoolInputRef}
										type="text"
										value={formData.school_id ? getSchoolName(formData.school_id) : schoolQuery}
										onChange={(e) => {
											setSchoolQuery(e.target.value);
											setShowSchoolDropdown(true);
											setSchoolHighlightedIndex(-1);
											if (!e.target.value.trim()) {
												setShowSchoolDropdown(false);
												setFormData((prev) => ({ ...prev, school_id: '' }));
											}
										}}
										onFocus={() => {
											if (filteredSchoolOptions.length > 0) {
												setShowSchoolDropdown(true);
											}
										}}
										onKeyDown={handleSchoolKeyDown}
										placeholder="Search school..."
										className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
									/>
									{showSchoolDropdown && filteredSchoolOptions.length > 0 && (
										<div
											ref={schoolDropdownRef}
											className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
										>
											{filteredSchoolOptions.map((school, index) => (
												<button
													key={school.school_id}
													type="button"
													onClick={() => handleSelectSchool(school)}
													onMouseEnter={() => setSchoolHighlightedIndex(index)}
													className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
														index === schoolHighlightedIndex ? 'bg-indigo-50' : ''
													} ${formData.school_id === school.school_id ? 'bg-indigo-100 font-medium' : ''}`}
												>
													<div className="text-sm font-medium text-gray-900">{school.school_name}</div>
												</button>
											))}
										</div>
									)}
									{showSchoolDropdown && filteredSchoolOptions.length === 0 && schoolQuery.trim() && (
										<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg">
											<div className="px-4 py-2.5 text-sm text-gray-500">No schools found</div>
										</div>
									)}
								</div>
							</div>

							{/* Payment Season */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Payment Season <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<input
										ref={paymentSeasonInputRef}
										type="text"
										value={formData.payment_id ? getPaymentSeasonName(formData.payment_id) : paymentSeasonQuery}
										onChange={(e) => {
											setPaymentSeasonQuery(e.target.value);
											setShowPaymentSeasonDropdown(true);
											setPaymentSeasonHighlightedIndex(-1);
											if (!e.target.value.trim()) {
												setShowPaymentSeasonDropdown(false);
												setFormData((prev) => ({ ...prev, payment_id: '' }));
											}
										}}
										onFocus={() => {
											if (filteredPaymentSeasonOptions.length > 0) {
												setShowPaymentSeasonDropdown(true);
											}
										}}
										onKeyDown={handlePaymentSeasonKeyDown}
										placeholder="Search payment season..."
										className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
									/>
									{showPaymentSeasonDropdown && filteredPaymentSeasonOptions.length > 0 && (
										<div
											ref={paymentSeasonDropdownRef}
											className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
										>
											{filteredPaymentSeasonOptions.map((season, index) => (
												<button
													key={season.pay_id}
													type="button"
													onClick={() => handleSelectPaymentSeason(season)}
													onMouseEnter={() => setPaymentSeasonHighlightedIndex(index)}
													className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
														index === paymentSeasonHighlightedIndex ? 'bg-indigo-50' : ''
													} ${formData.payment_id === season.pay_id ? 'bg-indigo-100 font-medium' : ''}`}
												>
													<div className="text-sm font-medium text-gray-900">{season.season_pay_name}</div>
												</button>
											))}
										</div>
									)}
									{showPaymentSeasonDropdown && filteredPaymentSeasonOptions.length === 0 && paymentSeasonQuery.trim() && (
										<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg">
											<div className="px-4 py-2.5 text-sm text-gray-500">No payment seasons found</div>
										</div>
									)}
								</div>
							</div>

							{/* Date */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Date <span className="text-red-500">*</span>
								</label>
								<input
									type="date"
									required
									value={formData.date}
									onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
									className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
								/>
							</div>

							{/* Status */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Status <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<input
										ref={statusInputRef}
										type="text"
										value={formData.status ? formData.status.charAt(0).toUpperCase() + formData.status.slice(1) : statusQuery}
										onChange={(e) => {
											setStatusQuery(e.target.value);
											setShowStatusDropdown(true);
											setStatusHighlightedIndex(-1);
											if (!e.target.value.trim()) {
												setShowStatusDropdown(false);
												setFormData((prev) => ({ ...prev, status: '' }));
											}
										}}
										onFocus={() => {
											if (filteredStatusOptions.length > 0) {
												setShowStatusDropdown(true);
											}
										}}
										onKeyDown={handleStatusKeyDown}
										placeholder="Search status..."
										className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
									/>
									{showStatusDropdown && filteredStatusOptions.length > 0 && (
										<div
											ref={statusDropdownRef}
											className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
										>
											{filteredStatusOptions.map((status, index) => (
												<button
													key={status}
													type="button"
													onClick={() => handleSelectStatus(status)}
													onMouseEnter={() => setStatusHighlightedIndex(index)}
													className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
														index === statusHighlightedIndex ? 'bg-indigo-50' : ''
													} ${formData.status === status ? 'bg-indigo-100 font-medium' : ''}`}
												>
													<div className="text-sm font-medium text-gray-900">{status.charAt(0).toUpperCase() + status.slice(1)}</div>
												</button>
											))}
										</div>
									)}
									{showStatusDropdown && filteredStatusOptions.length === 0 && statusQuery.trim() && (
										<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg">
											<div className="px-4 py-2.5 text-sm text-gray-500">No status found</div>
										</div>
									)}
								</div>
							</div>

							{/* Buttons */}
							<div className="flex gap-3 pt-4">
								<button
									type="submit"
									className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-[3px] hover:bg-indigo-700 transition font-medium"
								>
									{editingRecord ? 'Update' : 'Create'}
								</button>
								<button
									type="button"
									onClick={() => {
										setShowForm(false);
										resetForm();
									}}
									className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-[3px] hover:bg-gray-300 transition font-medium"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="bg-white rounded-[3px] shadow-card border border-gray-100 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									School
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Payment Season
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Start Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									End Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Record Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{paginatedRecords.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-6 py-12 text-center">
										<div className="flex flex-col items-center gap-3">
											<DocumentTextIcon className="w-12 h-12 text-gray-400" />
											<p className="text-gray-500 font-medium">No payment records found</p>
											<p className="text-sm text-gray-400">Try adjusting your filters</p>
										</div>
									</td>
								</tr>
							) : (
								paginatedRecords.map((record) => (
									<tr key={record.record_id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{getSchoolName(record.school_id)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{getPaymentSeasonName(record.payment_id)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{getPaymentSeasonStartDate(record.payment_id)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{getPaymentSeasonEndDate(record.payment_id)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{new Date(record.date).toLocaleDateString()}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`px-2 py-1 text-xs font-medium rounded-full ${
												record.status === 'paid' ? 'bg-green-100 text-green-800' :
												record.status === 'overdue' ? 'bg-red-100 text-red-800' :
												record.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
												'bg-yellow-100 text-yellow-800'
											}`}>
												{record.status}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<div className="flex items-center gap-2">
												<button
													onClick={() => handleEdit(record)}
													className="text-indigo-600 hover:text-indigo-900"
													title="Edit"
												>
													<PencilIcon className="w-5 h-5" />
												</button>
												<button
													onClick={() => handleDelete(record.record_id)}
													className="text-red-600 hover:text-red-900"
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
					</div>
				)}

				{/* Results count */}
				<div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
					<p className="text-sm text-gray-600">
						Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredRecords.length)} of{' '}
						{filteredRecords.length} results
					</p>
				</div>
			</div>
		</div>
	);
}


import { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../../../components/Modal';
import { DocumentTextIcon, PhotoIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import toast from 'react-hot-toast';

interface Invoice {
	invoice_id: string;
	fee_id: string;
	school_id: string;
	amount: number;
	invoice_img: string | null;
	created_at: string | null;
	updated_at: string | null;
}

interface AcademicYearOption {
	academic_id: string;
	academic_name: string;
	is_current: boolean;
}

interface FeeInvoicesModalProps {
	feeId: string;
	schoolId: string;
	isOpen: boolean;
	onClose: () => void;
}

export default function FeeInvoicesModal({ feeId, schoolId, isOpen, onClose }: FeeInvoicesModalProps) {
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(false);
	const [feeData, setFeeData] = useState<any>(null);
	const [availableAcademicYears, setAvailableAcademicYears] = useState<AcademicYearOption[]>([]);
	const [academicYearFilterQuery, setAcademicYearFilterQuery] = useState('');
	const [showAcademicYearFilterDropdown, setShowAcademicYearFilterDropdown] = useState(false);
	const [academicYearFilterHighlightedIndex, setAcademicYearFilterHighlightedIndex] = useState(-1);
	const academicYearFilterDropdownRef = useRef<HTMLDivElement>(null);
	const academicYearFilterInputRef = useRef<HTMLInputElement>(null);
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');

	useEffect(() => {
		if (isOpen && feeId && schoolId) {
			fetchData();
		}
	}, [isOpen, feeId, schoolId]);

	const fetchData = async () => {
		try {
			setLoading(true);
			
			// Fetch fee data to get academic year info
			const feeResponse = await api.get(`/fee-management/${feeId}?school_id=${schoolId}`);
			setFeeData(feeResponse.data);
			
			// Fetch invoices
			const invoicesResponse = await api.get(`/fee-invoices/?school_id=${schoolId}&fee_id=${feeId}`);
			setInvoices(getArrayFromResponse(invoicesResponse.data));
			
			// Fetch academic years
			const academicYearsResponse = await api.get(`/academic-years/?school_id=${schoolId}`);
			const academicYears = getArrayFromResponse(academicYearsResponse.data).map((ay: any) => ({
				academic_id: ay.academic_id,
				academic_name: ay.academic_name,
				is_current: ay.is_current || false,
			}));
			setAvailableAcademicYears(academicYears);
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || 'Failed to fetch data';
			toast.error(errorMessage);} finally {
			setLoading(false);
		}
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				academicYearFilterDropdownRef.current &&
				!academicYearFilterDropdownRef.current.contains(event.target as Node) &&
				academicYearFilterInputRef.current &&
				!academicYearFilterInputRef.current.contains(event.target as Node)
			) {
				setShowAcademicYearFilterDropdown(false);
			}
		};

		if (showAcademicYearFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showAcademicYearFilterDropdown]);

	// Sort academic years: current first, then alphabetically
	const sortedAcademicYears = useMemo(() => {
		return [...availableAcademicYears].sort((a, b) => {
			// Current academic years first
			if (a.is_current && !b.is_current) return -1;
			if (!a.is_current && b.is_current) return 1;
			// Then sort alphabetically
			return a.academic_name.localeCompare(b.academic_name);
		});
	}, [availableAcademicYears]);

	// Filter academic years based on query
	const filteredAcademicYears = useMemo(() => {
		if (!academicYearFilterQuery.trim()) return sortedAcademicYears;
		const query = academicYearFilterQuery.toLowerCase();
		return sortedAcademicYears.filter((ay) =>
			ay.academic_name?.toLowerCase().includes(query)
		);
	}, [academicYearFilterQuery, sortedAcademicYears]);

	// Handle keyboard navigation for academic year filter
	const handleAcademicYearFilterKeyDown = (e: React.KeyboardEvent) => {
		const filtered = filteredAcademicYears;
		const highlightedIndex = academicYearFilterHighlightedIndex;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setAcademicYearFilterHighlightedIndex(Math.min(highlightedIndex + 1, filtered.length - 1));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setAcademicYearFilterHighlightedIndex(Math.max(highlightedIndex - 1, -1));
		} else if (e.key === 'Enter' && highlightedIndex >= 0 && filtered[highlightedIndex]) {
			e.preventDefault();
			setSelectedAcademicYearId(filtered[highlightedIndex].academic_id);
			setAcademicYearFilterQuery(filtered[highlightedIndex].academic_name);
			setShowAcademicYearFilterDropdown(false);
		} else if (e.key === 'Escape') {
			setShowAcademicYearFilterDropdown(false);
		}
	};

	// Set initial academic year filter when fee data is loaded
	useEffect(() => {
		if (feeData?.academic_year && !selectedAcademicYearId) {
			setSelectedAcademicYearId(feeData.academic_year.academic_id);
			setAcademicYearFilterQuery(feeData.academic_year.academic_name);
		}
	}, [feeData, selectedAcademicYearId]);

	const filteredInvoices = invoices; // Invoices are already filtered by fee_id, so all belong to same academic year

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
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const getImageUrl = (imagePath: string | null) => {
		if (!imagePath) return null;
		const baseURL = api.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:8000';
		let path = imagePath;
		if (!path.startsWith('uploads/')) {
			path = `uploads/${path}`;
		}
		return `${baseURL}${path.startsWith('/') ? path : `/${path}`}`;
	};

	const totalAmount = invoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Fee Invoices" size="xl">
			<div className="flex flex-col">
				{/* Academic Year Filter */}
				<div className="mb-4">
					<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
						<AcademicCapIcon className="w-4 h-4 inline mr-1" />
						Academic Year Filter
					</label>
					<div className="relative">
						<input
							ref={academicYearFilterInputRef}
							type="text"
							value={selectedAcademicYearId ? sortedAcademicYears.find(ay => ay.academic_id === selectedAcademicYearId)?.academic_name || '' : academicYearFilterQuery}
							onChange={(e) => {
								setAcademicYearFilterQuery(e.target.value);
								setShowAcademicYearFilterDropdown(true);
								setAcademicYearFilterHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowAcademicYearFilterDropdown(false);
									setSelectedAcademicYearId('');
								}
							}}
							onFocus={() => {
								if (sortedAcademicYears.length > 0) {
									setShowAcademicYearFilterDropdown(true);
									// Clear query on focus to show all academic years
									if (selectedAcademicYearId) {
										// Keep the selected value visible but show all options
										setAcademicYearFilterQuery('');
									}
								}
							}}
							onKeyDown={handleAcademicYearFilterKeyDown}
							placeholder="Search academic year..."
							className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
						/>
						{showAcademicYearFilterDropdown && sortedAcademicYears.length > 0 && (
							<div
								ref={academicYearFilterDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								<button
									type="button"
									onClick={() => {
										setSelectedAcademicYearId('');
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
											setSelectedAcademicYearId(academicYear.academic_id);
											setAcademicYearFilterQuery(academicYear.academic_name);
											setShowAcademicYearFilterDropdown(false);
										}}
										onMouseEnter={() => setAcademicYearFilterHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === academicYearFilterHighlightedIndex ? 'bg-blue-50' : ''
										} ${selectedAcademicYearId === academicYear.academic_id ? 'bg-blue-100 font-medium' : ''}`}
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

				{/* Summary */}
				<div className="mb-6 p-4 bg-blue-50 rounded-[3px] border border-blue-200">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-12 h-12 rounded-full bg-blue-600 grid place-items-center">
								<DocumentTextIcon className="w-6 h-6 text-white" />
							</div>
							<div>
								<p className="text-sm text-gray-600">Total Invoices</p>
								<p className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</p>
							</div>
						</div>
						<div className="text-right">
							<p className="text-sm text-gray-600">Total Amount</p>
							<p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</p>
						</div>
					</div>
				</div>

				{/* Loading State */}
				{loading && (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					</div>
				)}

				{/* Invoices Grid */}
				{!loading && filteredInvoices.length === 0 && (
					<div className="text-center py-12">
						<PhotoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-500 text-lg">No invoices found</p>
						<p className="text-gray-400 text-sm mt-2">No invoice records exist for this fee</p>
					</div>
				)}

				{!loading && filteredInvoices.length > 0 && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
						{filteredInvoices.map((invoice) => {
							const imageUrl = getImageUrl(invoice.invoice_img);
							return (
								<div
									key={invoice.invoice_id}
									className="border border-gray-200 rounded-[3px] p-4 hover:shadow-md transition-shadow"
								>
									{/* Invoice Header */}
									<div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
										<div>
											<p className="text-sm text-gray-600">Amount</p>
											<p className="text-lg font-bold text-gray-900">{formatCurrency(invoice.amount)}</p>
										</div>
										<div className="text-right">
											<p className="text-xs text-gray-500">Date</p>
											<p className="text-xs text-gray-700">{formatDate(invoice.created_at)}</p>
										</div>
									</div>

									{/* Invoice Image */}
									{imageUrl ? (
										<div className="relative">
											<a
												href={imageUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="block"
											>
												<img
													src={imageUrl}
													alt="Invoice"
													className="w-full h-48 object-contain border border-gray-300 rounded-[3px] hover:opacity-90 transition-opacity cursor-pointer bg-gray-50"
													onError={(e) => {
														const target = e.target as HTMLImageElement;
														target.style.display = 'none';
														const fallback = target.nextElementSibling as HTMLElement;
														if (fallback) {
															fallback.style.display = 'flex';
														}
													}}
												/>
											</a>
											<div
												className="w-full h-48 border border-gray-300 rounded-[3px] bg-gray-100 flex items-center justify-center text-gray-400"
												style={{ display: 'none' }}
											>
												<PhotoIcon className="w-12 h-12" />
											</div>
										</div>
									) : (
										<div className="w-full h-48 border border-gray-300 rounded-[3px] bg-gray-100 flex items-center justify-center text-gray-400">
											<div className="text-center">
												<PhotoIcon className="w-12 h-12 mx-auto mb-2" />
												<p className="text-sm">No image</p>
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</Modal>
	);
}


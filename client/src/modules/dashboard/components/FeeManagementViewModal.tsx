import { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../../../components/Modal';
import { BanknotesIcon, UserIcon, AcademicCapIcon, CalendarIcon, DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import { getArrayFromResponse } from '../../../utils/apiHelpers';

interface FeeManagementMember {
	fee_id: string;
	school_id: string;
	std_id: string;
	fee_type_id: string;
	academic_id: string;
	term: string;
	amount_paid: number;
	status: string;
	invoice_img?: string | null;
	student?: {
		std_id: string;
		std_name: string;
		std_code: string | null;
		std_dob: string | null;
		std_gender: string | null;
		status: string | null;
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
	created_at: string | null;
	updated_at: string | null;
}

interface FeeManagementViewModalProps {
	fee: FeeManagementMember;
	isOpen: boolean;
	onClose: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

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

export default function FeeManagementViewModal({ fee, isOpen, onClose, onEdit, onDelete }: FeeManagementViewModalProps) {
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loadingInvoices, setLoadingInvoices] = useState(false);
	const [availableAcademicYears, setAvailableAcademicYears] = useState<AcademicYearOption[]>([]);
	const [academicYearFilterQuery, setAcademicYearFilterQuery] = useState('');
	const [showAcademicYearFilterDropdown, setShowAcademicYearFilterDropdown] = useState(false);
	const [academicYearFilterHighlightedIndex, setAcademicYearFilterHighlightedIndex] = useState(-1);
	const academicYearFilterDropdownRef = useRef<HTMLDivElement>(null);
	const academicYearFilterInputRef = useRef<HTMLInputElement>(null);
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');

	useEffect(() => {
		if (isOpen && fee.fee_id && fee.school_id) {
			fetchData();
		}
	}, [isOpen, fee.fee_id, fee.school_id]);

	const fetchData = async () => {
		try {
			setLoadingInvoices(true);
			
			// Fetch invoices
			const invoicesResponse = await api.get(`/fee-invoices/?school_id=${fee.school_id}&fee_id=${fee.fee_id}`);
			setInvoices(getArrayFromResponse(invoicesResponse.data));
			
			// Fetch academic years
			const academicYearsResponse = await api.get(`/academic-years/?school_id=${fee.school_id}`);
			const academicYears = getArrayFromResponse(academicYearsResponse.data).map((ay: any) => ({
				academic_id: ay.academic_id,
				academic_name: ay.academic_name,
				is_current: ay.is_current || false,
			}));
			setAvailableAcademicYears(academicYears);
		} catch (error: any) {setInvoices([]);
		} finally {
			setLoadingInvoices(false);
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
			if (a.is_current && !b.is_current) return -1;
			if (!a.is_current && b.is_current) return 1;
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
		if (fee.academic_year && !selectedAcademicYearId) {
			setSelectedAcademicYearId(fee.academic_year.academic_id);
			setAcademicYearFilterQuery(fee.academic_year.academic_name);
		}
	}, [fee.academic_year, selectedAcademicYearId]);

	const filteredInvoices = invoices; // All invoices belong to same fee/academic year

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

	const getImageUrl = (imagePath: string | null) => {
		if (!imagePath) return null;
		const baseURL = api.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:8000';
		let path = imagePath;
		if (!path.startsWith('uploads/')) {
			path = `uploads/${path}`;
		}
		return `${baseURL}${path.startsWith('/') ? path : `/${path}`}`;
	};

	const totalInvoiceAmount = invoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Fee Management Details" size="xl">
			<div className="flex flex-col">
				{/* Fee Header */}
				<div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
					<div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
						<BanknotesIcon className="w-8 h-8 text-white" />
					</div>
					<div className="flex-1">
						<h2 className="text-2xl font-bold text-gray-900">
							{fee.fee_type?.fee_type_name || 'Fee Record'}
						</h2>
						<div className="flex items-center gap-2 mt-2">
							<span className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium capitalize ${getStatusColor(fee.status)}`}>
								{fee.status}
							</span>
							<span className="text-sm text-gray-500">•</span>
							<span className="text-sm text-gray-600">{fee.term}</span>
						</div>
					</div>
				</div>

				{/* Details Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					{/* Student Information */}
					<div className="md:col-span-2">
						<label className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
							<UserIcon className="w-4 h-4" />
							Student Information
						</label>
						<div className="bg-gray-50 rounded-[3px] p-4">
							<p className="text-gray-900 font-medium text-lg">
								{fee.student?.std_name || 'N/A'}
							</p>
							{fee.student?.std_code && (
								<p className="text-sm text-gray-600 mt-1">Code: {fee.student.std_code}</p>
							)}
							{fee.student?.std_gender && (
								<p className="text-sm text-gray-600">Gender: {fee.student.std_gender}</p>
							)}
						</div>
					</div>

					{/* Fee Type */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Fee Type
						</label>
						<p className="text-gray-900 font-medium">{fee.fee_type?.fee_type_name || 'N/A'}</p>
						{fee.fee_type?.amount_to_pay && (
							<p className="text-sm text-gray-600 mt-1">
								Expected: {formatCurrency(fee.fee_type.amount_to_pay)}
							</p>
						)}
					</div>

					{/* Academic Year */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Academic Year
						</label>
						<p className="text-gray-900 font-medium">{fee.academic_year?.academic_name || 'N/A'}</p>
						{fee.academic_year?.is_current && (
							<span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-xs font-medium mt-1 bg-green-100 text-green-800">
								Current
							</span>
						)}
					</div>

					{/* Term */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Term
						</label>
						<p className="text-gray-900 font-medium">{fee.term || 'N/A'}</p>
					</div>

					{/* Status */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Status
						</label>
						<span className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium capitalize ${getStatusColor(fee.status)}`}>
							{fee.status}
						</span>
					</div>

					{/* Amount Paid */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Amount Paid
						</label>
						<p className="text-gray-900 font-medium text-lg">{formatCurrency(fee.amount_paid || 0)}</p>
					</div>

					{/* Balance (if applicable) */}
					{fee.fee_type?.amount_to_pay && fee.amount_paid < fee.fee_type.amount_to_pay && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Remaining Balance
							</label>
							<p className="text-red-600 font-medium text-lg">
								{formatCurrency(fee.fee_type.amount_to_pay - fee.amount_paid)}
							</p>
						</div>
					)}

					{/* Invoice Image */}
					{fee.invoice_img && (
						<div className="md:col-span-2">
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Invoice
							</label>
							{(() => {
								const baseURL = 'http://localhost:8000';
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
										className="inline-block"
									>
										<img
											src={imageUrl}
											alt="Invoice"
											className="max-w-full h-auto max-h-64 border border-gray-300 rounded-[3px] hover:opacity-90 transition-opacity cursor-pointer"
											onError={(e) => {(e.target as HTMLImageElement).style.display = 'none';
											}}
										/>
									</a>
								);
							})()}
						</div>
					)}

					{/* Fee Type Description */}
					{fee.fee_type?.description && (
						<div className="md:col-span-2">
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Fee Type Description
							</label>
							<p className="text-gray-900 font-medium whitespace-pre-wrap">{fee.fee_type.description}</p>
						</div>
					)}

					{/* Created At */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Created At
						</label>
						<p className="text-gray-900 font-medium">{formatDate(fee.created_at)}</p>
					</div>

					{/* Updated At */}
					{fee.updated_at && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Last Updated
							</label>
							<p className="text-gray-900 font-medium">{formatDate(fee.updated_at)}</p>
						</div>
					)}
				</div>

				{/* Invoices Section */}
				<div className="mt-6 pt-6 border-t border-gray-200">
					<div className="flex items-center justify-between mb-4 flex-wrap gap-4">
						<label className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
							<DocumentTextIcon className="w-4 h-4" />
							Invoices ({filteredInvoices.length})
						</label>
						{/* Academic Year Filter */}
						<div className="flex items-center gap-2 flex-1 max-w-xs">
							<AcademicCapIcon className="w-4 h-4 text-gray-500" />
							<div className="relative flex-1">
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
									className="w-full px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
					</div>
					
					{loadingInvoices ? (
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
						</div>
					) : filteredInvoices.length === 0 ? (
						<div className="text-center py-8 bg-gray-50 rounded-[3px]">
							<PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
							<p className="text-gray-500 text-sm">No invoices found</p>
						</div>
					) : (
						<div className="space-y-4">
							{/* Summary */}
							<div className="bg-blue-50 rounded-[3px] p-3 border border-blue-200">
								<div className="flex items-center justify-between">
									<span className="text-sm text-gray-600">Total Invoices:</span>
									<span className="text-sm font-medium text-gray-900">{filteredInvoices.length}</span>
								</div>
								<div className="flex items-center justify-between mt-1">
									<span className="text-sm text-gray-600">Total Invoice Amount:</span>
									<span className="text-sm font-bold text-blue-600">{formatCurrency(totalInvoiceAmount)}</span>
								</div>
							</div>

							{/* Invoice List */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
								{filteredInvoices.map((invoice) => {
									const imageUrl = getImageUrl(invoice.invoice_img);
									return (
										<div
											key={invoice.invoice_id}
											className="border border-gray-200 rounded-[3px] p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
										>
											<div className="flex items-start justify-between mb-2">
												<div>
													<p className="text-xs text-gray-500">Amount</p>
													<p className="text-sm font-bold text-gray-900">{formatCurrency(invoice.amount)}</p>
												</div>
												<div className="text-right">
													<p className="text-xs text-gray-500">Date</p>
													<p className="text-xs text-gray-700">{formatDate(invoice.created_at)}</p>
												</div>
											</div>
											{imageUrl ? (
												<a
													href={imageUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="block"
												>
													<img
														src={imageUrl}
														alt="Invoice"
														className="w-full h-32 object-contain border border-gray-300 rounded-[3px] hover:opacity-90 transition-opacity cursor-pointer bg-white"
														onError={(e) => {
															const target = e.target as HTMLImageElement;
															target.style.display = 'none';
														}}
													/>
												</a>
											) : (
												<div className="w-full h-32 border border-gray-300 rounded-[3px] bg-white flex items-center justify-center text-gray-400">
													<PhotoIcon className="w-8 h-8" />
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
					<button
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 transition-colors"
					>
						Close
					</button>
					<button
						onClick={onEdit}
						className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-[3px] hover:bg-green-700 transition-colors"
					>
						Edit
					</button>
					<button
						onClick={onDelete}
						className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-[3px] hover:bg-red-700 transition-colors"
					>
						Delete
					</button>
				</div>
			</div>
		</Modal>
	);
}


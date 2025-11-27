import { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../../../components/Modal';
import { DocumentTextIcon, PhotoIcon, PencilIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import toast from 'react-hot-toast';
import { convertFileToBase64, validateImageFile, validateFileSize } from '../../../utils/fileUtils';

interface Invoice {
	invoice_id: string;
	fee_id: string;
	school_id: string;
	amount: number;
	invoice_img: string | null;
	created_at: string | null;
	updated_at: string | null;
}

interface FeeManagementMember {
	fee_id: string;
	school_id: string;
	std_id: string;
	fee_type_id: string;
	academic_id: string;
	term: string;
	amount_paid: number;
	status: string;
	fee_type?: {
		fee_type_id: string;
		fee_type_name: string;
		amount_to_pay: number;
	} | null;
}

interface FeeTypeOption {
	fee_type_id: string;
	fee_type_name: string;
	amount_to_pay: number;
}

interface AcademicYearOption {
	academic_id: string;
	academic_name: string;
	is_current: boolean;
}

interface TransactionEditModalProps {
	fee: FeeManagementMember;
	schoolId: string;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

interface EditableTransaction {
	invoice: Invoice;
	selected: boolean;
	amount: number;
	fee_type_id: string;
	invoice_img: string | null;
	invoiceFile: File | null;
	invoicePreview: string | null;
}

export default function TransactionEditModal({ fee, schoolId, isOpen, onClose, onSuccess }: TransactionEditModalProps) {
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [editableTransactions, setEditableTransactions] = useState<EditableTransaction[]>([]);
	const [availableFeeTypes, setAvailableFeeTypes] = useState<FeeTypeOption[]>([]);
	const [availableAcademicYears, setAvailableAcademicYears] = useState<AcademicYearOption[]>([]);
	const [academicYearFilterQuery, setAcademicYearFilterQuery] = useState('');
	const [showAcademicYearFilterDropdown, setShowAcademicYearFilterDropdown] = useState(false);
	const [academicYearFilterHighlightedIndex, setAcademicYearFilterHighlightedIndex] = useState(-1);
	const academicYearFilterDropdownRef = useRef<HTMLDivElement>(null);
	const academicYearFilterInputRef = useRef<HTMLInputElement>(null);
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
	
	// Autocomplete states for fee type
	const [feeTypeSearchQueries, setFeeTypeSearchQueries] = useState<Record<string, string>>({});
	const [showFeeTypeDropdowns, setShowFeeTypeDropdowns] = useState<Record<string, boolean>>({});
	const [feeTypeHighlightedIndices, setFeeTypeHighlightedIndices] = useState<Record<string, number>>({});
	const feeTypeDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const feeTypeInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

	useEffect(() => {
		if (isOpen && fee.fee_id && schoolId) {
			fetchData();
		}
	}, [isOpen, fee.fee_id, schoolId]);

	const fetchData = async () => {
		try {
			setLoading(true);
			
			// Fetch invoices
			const invoicesResponse = await api.get(`/fee-invoices/?school_id=${schoolId}&fee_id=${fee.fee_id}`);
			const fetchedInvoices = getArrayFromResponse(invoicesResponse.data);
			setInvoices(fetchedInvoices);
			
			// Initialize editable transactions
			const editable = fetchedInvoices.map((inv: Invoice) => ({
				invoice: inv,
				selected: false,
				amount: inv.amount,
				fee_type_id: fee.fee_type_id,
				invoice_img: inv.invoice_img,
				invoiceFile: null,
				invoicePreview: null,
			}));
			setEditableTransactions(editable);
			
			// Fetch fee types
			const feeTypesResponse = await api.get(`/fee-types/?school_id=${schoolId}`);
			const feeTypes = getArrayFromResponse(feeTypesResponse.data).map((ft: any) => ({
				fee_type_id: ft.fee_type_id,
				fee_type_name: ft.fee_type_name,
				amount_to_pay: ft.amount_to_pay || 0,
			}));
			setAvailableFeeTypes(feeTypes);
			
			// Fetch academic years
			const academicYearsResponse = await api.get(`/academic-years/?school_id=${schoolId}`);
			const academicYears = getArrayFromResponse(academicYearsResponse.data).map((ay: any) => ({
				academic_id: ay.academic_id,
				academic_name: ay.academic_name,
				is_current: ay.is_current || false,
			}));
			setAvailableAcademicYears(academicYears);
			
			// Initialize search queries
			const queries: Record<string, string> = {};
			editable.forEach((et) => {
				const feeType = feeTypes.find((ft) => ft.fee_type_id === et.fee_type_id);
				queries[et.invoice.invoice_id] = feeType ? feeType.fee_type_name : '';
			});
			setFeeTypeSearchQueries(queries);
			
			// Set initial academic year filter
			if (fee.academic_id && !selectedAcademicYearId) {
				const academicYear = academicYears.find((ay) => ay.academic_id === fee.academic_id);
				if (academicYear) {
					setSelectedAcademicYearId(academicYear.academic_id);
					setAcademicYearFilterQuery(academicYear.academic_name);
				}
			}
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to fetch transactions');} finally {
			setLoading(false);
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

	const getImageUrl = (imagePath: string | null) => {
		if (!imagePath) return null;
		const baseURL = api.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:8000';
		let path = imagePath;
		if (!path.startsWith('uploads/')) {
			path = `uploads/${path}`;
		}
		return `${baseURL}${path.startsWith('/') ? path : `/${path}`}`;
	};

	const toggleSelect = (invoiceId: string) => {
		setEditableTransactions((prev) =>
			prev.map((et) =>
				et.invoice.invoice_id === invoiceId ? { ...et, selected: !et.selected } : et
			)
		);
	};

	const updateTransaction = (invoiceId: string, field: keyof EditableTransaction, value: any) => {
		setEditableTransactions((prev) =>
			prev.map((et) => {
				if (et.invoice.invoice_id === invoiceId) {
					if (field === 'amount') {
						return { ...et, amount: parseFloat(value) || 0 };
					} else if (field === 'fee_type_id') {
						const feeType = availableFeeTypes.find((ft) => ft.fee_type_id === value);
						if (feeType) {
							setFeeTypeSearchQueries((queries) => ({
								...queries,
								[invoiceId]: feeType.fee_type_name,
							}));
						}
						return { ...et, fee_type_id: value };
					}
					return { ...et, [field]: value };
				}
				return et;
			})
		);
	};

	const handleInvoiceFileChange = async (invoiceId: string, file: File | null) => {
		if (!file) {
			updateTransaction(invoiceId, 'invoiceFile', null);
			updateTransaction(invoiceId, 'invoicePreview', null);
			return;
		}

		if (!validateImageFile(file)) {
			toast.error('Please select a valid image file (PNG, JPG, JPEG)');
			return;
		}

		if (!validateFileSize(file, 5)) {
			toast.error('Image size must be less than 5MB');
			return;
		}

		try {
			const base64 = await convertFileToBase64(file);
			updateTransaction(invoiceId, 'invoiceFile', file);
			updateTransaction(invoiceId, 'invoicePreview', base64);
			updateTransaction(invoiceId, 'invoice_img', base64);
		} catch (error) {
			toast.error('Failed to process image file');}
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			// All transactions belong to the same fee, so they all have the same term
			// Sum all transactions (selected ones use edited amounts, unselected ones use original amounts)
			let totalSum = 0;
			for (const transaction of editableTransactions) {
				if (transaction.selected) {
					// Use the edited amount for selected transactions
					totalSum += transaction.amount || 0;
				} else {
					// Use the original invoice amount for unselected transactions
					totalSum += transaction.invoice.amount || 0;
				}
			}

			// Update fee type if any selected transaction has a different fee type
			const selectedTransactions = editableTransactions.filter((et) => et.selected);
			const updatedFeeTypeIds = new Set<string>();
			selectedTransactions.forEach((transaction) => {
				if (transaction.fee_type_id !== fee.fee_type_id) {
					updatedFeeTypeIds.add(transaction.fee_type_id);
				}
			});

			// Prepare update data for fee management
			const feeUpdateData: any = {
				amount_paid: totalSum, // Sum of all transactions for this term
				replace_amount: true, // Replace the amount instead of adding
			};

			// If fee type changed, update it (use first changed fee type)
			if (updatedFeeTypeIds.size > 0) {
				feeUpdateData.fee_type_id = Array.from(updatedFeeTypeIds)[0];
			}

			// Update fee management record with the sum of all transactions
			await api.put(`/fee-management/${fee.fee_id}?school_id=${schoolId}`, feeUpdateData);

			// Update individual invoice amounts and images for selected transactions
			for (const transaction of selectedTransactions) {
				const invoiceUpdateData: any = {
					amount: transaction.amount,
				};

				if (transaction.invoice_img && transaction.invoice_img !== transaction.invoice.invoice_img) {
					invoiceUpdateData.invoice_img = transaction.invoice_img;
				}

				// Update invoice
				await api.put(
					`/fee-invoices/${transaction.invoice.invoice_id}?school_id=${schoolId}`,
					invoiceUpdateData
				);
			}

			toast.success(`Fee updated successfully! Total amount: ${formatCurrency(totalSum)}`);
			onSuccess();
			onClose();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to update fee');} finally {
			setSaving(false);
		}
	};

	const filteredFeeTypes = (invoiceId: string) => {
		const query = feeTypeSearchQueries[invoiceId] || '';
		if (!query.trim()) return availableFeeTypes;
		return availableFeeTypes.filter((ft) =>
			ft.fee_type_name.toLowerCase().includes(query.toLowerCase())
		);
	};

	const handleFeeTypeKeyDown = (invoiceId: string, e: React.KeyboardEvent) => {
		const filtered = filteredFeeTypes(invoiceId);
		const highlightedIndex = feeTypeHighlightedIndices[invoiceId] || -1;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setFeeTypeHighlightedIndices((prev) => ({
				...prev,
				[invoiceId]: Math.min(highlightedIndex + 1, filtered.length - 1),
			}));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setFeeTypeHighlightedIndices((prev) => ({
				...prev,
				[invoiceId]: Math.max(highlightedIndex - 1, -1),
			}));
		} else if (e.key === 'Enter' && highlightedIndex >= 0 && filtered[highlightedIndex]) {
			e.preventDefault();
			updateTransaction(invoiceId, 'fee_type_id', filtered[highlightedIndex].fee_type_id);
			setShowFeeTypeDropdowns((prev) => ({ ...prev, [invoiceId]: false }));
		} else if (e.key === 'Escape') {
			setShowFeeTypeDropdowns((prev) => ({ ...prev, [invoiceId]: false }));
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

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Edit Transactions" size="4xl">
			<div className="flex flex-col">
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					</div>
				) : invoices.length === 0 ? (
					<div className="text-center py-12">
						<DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-500 text-lg">No transactions found</p>
					</div>
				) : (
					<>
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

						<div className="mb-4 p-3 bg-blue-50 rounded-[3px] border border-blue-200">
							<p className="text-sm text-gray-700 mb-2">
								Select transactions to edit their details. All transactions will be summed to update the fee total.
							</p>
							<p className="text-xs text-gray-600">
								Selected transactions will use edited amounts, unselected transactions will use original amounts. The fee amount will be the sum of all transactions.
							</p>
						</div>

						<div className="space-y-4 max-h-[500px] overflow-y-auto">
							{editableTransactions.map((et) => {
								const imageUrl = et.invoicePreview || getImageUrl(et.invoice.invoice_img);
								const filtered = filteredFeeTypes(et.invoice.invoice_id);
								const highlightedIndex = feeTypeHighlightedIndices[et.invoice.invoice_id] || -1;
								const showDropdown = showFeeTypeDropdowns[et.invoice.invoice_id] || false;

								return (
									<div
										key={et.invoice.invoice_id}
										className={`border rounded-[3px] p-4 ${
											et.selected
												? 'border-blue-500 bg-blue-50'
												: 'border-gray-200 bg-white'
										}`}
									>
										<div className="flex items-start gap-4">
											{/* Checkbox */}
											<input
												type="checkbox"
												checked={et.selected}
												onChange={() => toggleSelect(et.invoice.invoice_id)}
												className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
											/>

											{/* Transaction Info */}
											<div className="flex-1">
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													{/* Amount */}
													<div>
														<label className="block text-xs font-medium text-gray-500 mb-1">
															Amount
														</label>
														<input
															type="number"
															value={et.amount}
															onChange={(e) =>
																updateTransaction(et.invoice.invoice_id, 'amount', e.target.value)
															}
															className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-sm"
															disabled={!et.selected}
														/>
													</div>

													{/* Fee Type */}
													<div className="relative" ref={(el) => (feeTypeDropdownRefs.current[et.invoice.invoice_id] = el)}>
														<label className="block text-xs font-medium text-gray-500 mb-1">
															Fee Type
														</label>
														<input
															ref={(el) => (feeTypeInputRefs.current[et.invoice.invoice_id] = el)}
															type="text"
															value={feeTypeSearchQueries[et.invoice.invoice_id] || ''}
															onChange={(e) => {
																setFeeTypeSearchQueries((prev) => ({
																	...prev,
																	[et.invoice.invoice_id]: e.target.value,
																}));
																setShowFeeTypeDropdowns((prev) => ({ ...prev, [et.invoice.invoice_id]: true }));
																setFeeTypeHighlightedIndices((prev) => ({ ...prev, [et.invoice.invoice_id]: -1 }));
															}}
															onFocus={() =>
																setShowFeeTypeDropdowns((prev) => ({ ...prev, [et.invoice.invoice_id]: true }))
															}
															onKeyDown={(e) => handleFeeTypeKeyDown(et.invoice.invoice_id, e)}
															className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-sm"
															disabled={!et.selected}
															placeholder="Search fee type..."
														/>
														{showDropdown && filtered.length > 0 && (
															<div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto">
																{filtered.map((ft, index) => (
																	<div
																		key={ft.fee_type_id}
																		onClick={() => {
																			updateTransaction(et.invoice.invoice_id, 'fee_type_id', ft.fee_type_id);
																			setShowFeeTypeDropdowns((prev) => ({ ...prev, [et.invoice.invoice_id]: false }));
																		}}
																		className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
																			index === highlightedIndex ? 'bg-blue-100' : ''
																		}`}
																	>
																		{ft.fee_type_name}
																	</div>
																))}
															</div>
														)}
													</div>

													{/* Invoice Image */}
													<div className="md:col-span-2">
														<label className="block text-xs font-medium text-gray-500 mb-1">
															Invoice Image
														</label>
														<div className="flex items-center gap-3">
															{imageUrl ? (
																<img
																	src={imageUrl}
																	alt="Invoice"
																	className="w-24 h-24 object-contain border border-gray-300 rounded-[3px]"
																/>
															) : (
																<div className="w-24 h-24 border border-gray-300 rounded-[3px] bg-gray-100 flex items-center justify-center">
																	<PhotoIcon className="w-8 h-8 text-gray-400" />
																</div>
															)}
															<input
																type="file"
																accept="image/*"
																onChange={(e) => {
																	const file = e.target.files?.[0] || null;
																	handleInvoiceFileChange(et.invoice.invoice_id, file);
																}}
																className="text-sm"
																disabled={!et.selected}
															/>
														</div>
													</div>
												</div>

												{/* Transaction Date */}
												<div className="mt-2 text-xs text-gray-500">
													Created: {formatDate(et.invoice.created_at)}
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{/* Footer */}
						<div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
							<button
								onClick={onClose}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 transition-colors"
								disabled={saving}
							>
								Cancel
							</button>
							<button
								onClick={handleSave}
								disabled={saving || editableTransactions.filter((et) => et.selected).length === 0}
								className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-[3px] hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								{saving ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										Saving...
									</>
								) : (
									<>
										<PencilIcon className="w-4 h-4" />
										Save Changes
									</>
								)}
							</button>
						</div>
					</>
				)}
			</div>
		</Modal>
	);
}


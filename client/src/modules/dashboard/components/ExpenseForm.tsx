import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { convertFileToBase64, validateImageFile, validateFileSize } from '../../../utils/fileUtils';
import { PhotoIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';

interface ExpenseItem {
	expense_id?: string;
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
}

interface ExpenseFormData {
	school_id: string;
	academic_id?: string | null;
	category: string;
	title: string;
	description: string;
	amount: string | number;
	payment_method: string;
	status: string;
	expense_date: string;
	invoice_image: string[];
	added_by: string;
	approved_by?: string | null;
}

interface ExpenseFormProps {
	expense?: ExpenseItem | null;
	onSubmit: (data: Partial<ExpenseItem>) => void;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
	schoolId: string;
	staffId: string;
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

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'ONLINE_PAYMENT'];

export default function ExpenseForm({
	expense,
	onSubmit,
	onCancel,
	loading = false,
	mode,
	schoolId,
	staffId,
}: ExpenseFormProps) {
	const [formData, setFormData] = useState<Partial<ExpenseFormData>>({
		school_id: schoolId,
		category: '',
		title: '',
		description: '',
		amount: '',
		payment_method: '',
		status: '',
		expense_date: '',
		invoice_image: [],
		added_by: staffId,
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
	const [invoicePreviews, setInvoicePreviews] = useState<string[]>([]);

	// Autocomplete states
	const [categorySearchQuery, setCategorySearchQuery] = useState('');
	const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
	const [categoryHighlightedIndex, setCategoryHighlightedIndex] = useState(-1);
	const categoryDropdownRef = useRef<HTMLDivElement>(null);
	const categoryInputRef = useRef<HTMLInputElement>(null);

	const [statusSearchQuery, setStatusSearchQuery] = useState('');
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const [statusHighlightedIndex, setStatusHighlightedIndex] = useState(-1);
	const statusDropdownRef = useRef<HTMLDivElement>(null);
	const statusInputRef = useRef<HTMLInputElement>(null);

	const [paymentMethodSearchQuery, setPaymentMethodSearchQuery] = useState('');
	const [showPaymentMethodDropdown, setShowPaymentMethodDropdown] = useState(false);
	const [paymentMethodHighlightedIndex, setPaymentMethodHighlightedIndex] = useState(-1);
	const paymentMethodDropdownRef = useRef<HTMLDivElement>(null);
	const paymentMethodInputRef = useRef<HTMLInputElement>(null);

	// Academic year states
	const [availableAcademicYears, setAvailableAcademicYears] = useState<Array<{ academic_id: string; academic_name: string; is_current: boolean }>>([]);
	const [academicYearSearchQuery, setAcademicYearSearchQuery] = useState('');
	const [showAcademicYearDropdown, setShowAcademicYearDropdown] = useState(false);
	const [academicYearHighlightedIndex, setAcademicYearHighlightedIndex] = useState(-1);
	const academicYearDropdownRef = useRef<HTMLDivElement>(null);
	const academicYearInputRef = useRef<HTMLInputElement>(null);

	// Fetch academic years
	useEffect(() => {
		const fetchAcademicYears = async () => {
			if (!schoolId) return;

			try {
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/academic-years/?school_id=${schoolId}&_t=${timestamp}`);
				const academicYears = (data || []).map((ay: any) => ({
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

	useEffect(() => {
		if (expense && mode === 'edit') {
			setFormData({
				school_id: schoolId,
				academic_id: expense.academic_id || null,
				category: expense.category || '',
				title: expense.title || '',
				description: expense.description || '',
				amount: expense.amount?.toString() || '',
				payment_method: expense.payment_method || '',
				status: expense.status || '',
				expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : '',
				invoice_image: expense.invoice_image || [],
				added_by: expense.added_by || staffId,
			});
			setCategorySearchQuery(expense.category || '');
			setStatusSearchQuery(expense.status || '');
			setPaymentMethodSearchQuery(expense.payment_method || '');
			const selectedYear = availableAcademicYears.find(ay => ay.academic_id === expense.academic_id);
			setAcademicYearSearchQuery(selectedYear?.academic_name || '');
			
			// Set existing invoice images as previews
			if (expense.invoice_image && expense.invoice_image.length > 0) {
				const previews = expense.invoice_image.map(img => {
					if (img.startsWith('http')) return img;
					return `http://localhost:8000/${img}`;
				});
				setInvoicePreviews(previews);
			}
		} else {
			// Set current academic year as default
			const currentYear = availableAcademicYears.find(ay => ay.is_current);
			setFormData({
				school_id: schoolId,
				academic_id: currentYear?.academic_id || null,
				category: '',
				title: '',
				description: '',
				amount: '',
				payment_method: '',
				status: '',
				expense_date: '',
				invoice_image: [],
				added_by: staffId,
			});
			setCategorySearchQuery('');
			setStatusSearchQuery('');
			setPaymentMethodSearchQuery('');
			setAcademicYearSearchQuery(currentYear?.academic_name || '');
			setInvoiceFiles([]);
			setInvoicePreviews([]);
		}
	}, [expense, mode, schoolId, staffId, availableAcademicYears]);

	// Filter options based on search queries
	const filteredCategories = EXPENSE_CATEGORIES.filter((category) => {
		if (!categorySearchQuery.trim()) return true;
		return category.toLowerCase().includes(categorySearchQuery.toLowerCase());
	});

	const filteredStatuses = EXPENSE_STATUSES.filter((status) => {
		if (!statusSearchQuery.trim()) return true;
		return status.toLowerCase().includes(statusSearchQuery.toLowerCase());
	});

	const filteredPaymentMethods = PAYMENT_METHODS.filter((method) => {
		if (!paymentMethodSearchQuery.trim()) return true;
		return method.toLowerCase().includes(paymentMethodSearchQuery.toLowerCase());
	});

	const filteredAcademicYears = availableAcademicYears.filter((ay) => {
		if (!academicYearSearchQuery.trim()) return true;
		return ay.academic_name.toLowerCase().includes(academicYearSearchQuery.toLowerCase());
	});

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;

			if (
				categoryDropdownRef.current &&
				!categoryDropdownRef.current.contains(target) &&
				categoryInputRef.current &&
				!categoryInputRef.current.contains(target)
			) {
				setShowCategoryDropdown(false);
			}

			if (
				statusDropdownRef.current &&
				!statusDropdownRef.current.contains(target) &&
				statusInputRef.current &&
				!statusInputRef.current.contains(target)
			) {
				setShowStatusDropdown(false);
			}

			if (
				paymentMethodDropdownRef.current &&
				!paymentMethodDropdownRef.current.contains(target) &&
				paymentMethodInputRef.current &&
				!paymentMethodInputRef.current.contains(target)
			) {
				setShowPaymentMethodDropdown(false);
			}

			if (
				academicYearDropdownRef.current &&
				!academicYearDropdownRef.current.contains(target) &&
				academicYearInputRef.current &&
				!academicYearInputRef.current.contains(target)
			) {
				setShowAcademicYearDropdown(false);
			}
		};

		if (showCategoryDropdown || showStatusDropdown || showPaymentMethodDropdown || showAcademicYearDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showCategoryDropdown, showStatusDropdown, showPaymentMethodDropdown, showAcademicYearDropdown]);

	const handleChange = (field: keyof ExpenseFormData, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	const handleInvoiceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length === 0) return;

		const validFiles: File[] = [];
		const newPreviews: string[] = [];

		for (const file of files) {
			if (!validateImageFile(file)) {
				toast.error(`${file.name} is not a valid image file`);
				continue;
			}
			if (!validateFileSize(file, 5 * 1024 * 1024)) {
				toast.error(`${file.name} is too large. Maximum size is 5MB`);
				continue;
			}

			validFiles.push(file);
			const base64 = await convertFileToBase64(file);
			newPreviews.push(base64);
		}

		setInvoiceFiles((prev) => [...prev, ...validFiles]);
		setInvoicePreviews((prev) => [...prev, ...newPreviews]);
	};

	const removeInvoiceImage = (index: number) => {
		setInvoiceFiles((prev) => prev.filter((_, i) => i !== index));
		setInvoicePreviews((prev) => prev.filter((_, i) => i !== index));
	};

	const validate = () => {
		const newErrors: Record<string, string> = {};

		if (!formData.category?.trim()) {
			newErrors.category = 'Category is required';
		}

		if (!formData.title?.trim()) {
			newErrors.title = 'Title is required';
		}

		const amountValue = typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount;
		if (!amountValue || isNaN(amountValue) || amountValue <= 0) {
			newErrors.amount = 'Amount must be greater than 0';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validate()) {
			return;
		}

		// Convert invoice files to base64 and combine with existing images
		const invoiceImages: string[] = [];
		
		// Add existing invoice images (file paths) from form data
		if (formData.invoice_image && formData.invoice_image.length > 0) {
			// Keep existing file paths (not base64)
			formData.invoice_image.forEach(img => {
				if (img && !img.startsWith('data:') && !img.startsWith('http')) {
					// It's a file path, keep it
					invoiceImages.push(img);
				}
			});
		}
		
		// Add new base64 images from uploaded files
		for (const file of invoiceFiles) {
			try {
				const base64 = await convertFileToBase64(file);
				invoiceImages.push(base64);
			} catch (error) {
				// Error converting file to base64
			}
		}

		// Ensure amount is a valid number
		const amountValue = typeof formData.amount === 'string' ? parseFloat(formData.amount) : Number(formData.amount);
		
		const submitData: Partial<ExpenseItem> = {
			school_id: schoolId,
			academic_id: formData.academic_id || null,
			category: formData.category || '',
			title: formData.title || '',
			description: formData.description?.trim() || null,
			amount: amountValue || 0,
			payment_method: formData.payment_method?.trim() || null,
			status: formData.status?.trim() || 'PENDING',
			expense_date: formData.expense_date || null,
			invoice_image: invoiceImages.length > 0 ? invoiceImages : null,
			added_by: staffId || null,
			approved_by: formData.approved_by || null,
		};
		
		onSubmit(submitData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Category */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Category <span className="text-red-500">*</span>
					</label>
					<div className="relative">
						<input
							ref={categoryInputRef}
							type="text"
							value={formData.category || categorySearchQuery}
							onChange={(e) => {
								setCategorySearchQuery(e.target.value);
								setShowCategoryDropdown(true);
								setCategoryHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowCategoryDropdown(false);
									handleChange('category', '');
								}
							}}
							onFocus={() => {
								if (filteredCategories.length > 0) {
									setShowCategoryDropdown(true);
								}
								setCategorySearchQuery('');
							}}
							className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
								errors.category ? 'border-red-500' : 'border-gray-300'
							}`}
							placeholder="Select category"
							disabled={loading}
						/>
						{showCategoryDropdown && filteredCategories.length > 0 && (
							<div
								ref={categoryDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredCategories.map((category, index) => (
									<button
										key={category}
										type="button"
										onClick={() => {
											handleChange('category', category);
											setCategorySearchQuery(category);
											setShowCategoryDropdown(false);
										}}
										onMouseEnter={() => setCategoryHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === categoryHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.category === category ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{category}</div>
									</button>
								))}
							</div>
						)}
					</div>
					{errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
				</div>

				{/* Title */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Title <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						value={formData.title || ''}
						onChange={(e) => handleChange('title', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.title ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter expense title"
						disabled={loading}
					/>
					{errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
				</div>

				{/* Academic Year */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Academic Year
					</label>
					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<CalendarDaysIcon className="h-5 w-5 text-gray-400" />
						</div>
						<input
							ref={academicYearInputRef}
							type="text"
							value={
								formData.academic_id
									? availableAcademicYears.find((ay) => ay.academic_id === formData.academic_id)?.academic_name || academicYearSearchQuery
									: academicYearSearchQuery
							}
							onChange={(e) => {
								setAcademicYearSearchQuery(e.target.value);
								setShowAcademicYearDropdown(true);
								setAcademicYearHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowAcademicYearDropdown(false);
									handleChange('academic_id', null);
								}
							}}
							onFocus={() => {
								if (filteredAcademicYears.length > 0) {
									setShowAcademicYearDropdown(true);
								}
							}}
							className="w-full pl-10 px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
							placeholder="Select academic year (optional)"
							disabled={loading}
						/>
						{showAcademicYearDropdown && filteredAcademicYears.length > 0 && (
							<div
								ref={academicYearDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								<button
									type="button"
									onClick={() => {
										handleChange('academic_id', null);
										setAcademicYearSearchQuery('');
										setShowAcademicYearDropdown(false);
									}}
									className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
										!formData.academic_id ? 'bg-primary-100 font-medium' : ''
									}`}
								>
									<div className="text-sm font-medium text-gray-900">None (Optional)</div>
								</button>
								{filteredAcademicYears.map((academicYear, index) => (
									<button
										key={academicYear.academic_id}
										type="button"
										onClick={() => {
											handleChange('academic_id', academicYear.academic_id);
											setAcademicYearSearchQuery(academicYear.academic_name);
											setShowAcademicYearDropdown(false);
										}}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											formData.academic_id === academicYear.academic_id ? 'bg-primary-100 font-medium' : ''
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

				{/* Amount */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Amount <span className="text-red-500">*</span>
					</label>
					<input
						type="number"
						step="0.01"
						min="0"
						value={formData.amount || ''}
						onChange={(e) => handleChange('amount', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.amount ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="0.00"
						disabled={loading}
					/>
					{errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
				</div>

				{/* Payment Method */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
					<div className="relative">
						<input
							ref={paymentMethodInputRef}
							type="text"
							value={formData.payment_method || paymentMethodSearchQuery}
							onChange={(e) => {
								setPaymentMethodSearchQuery(e.target.value);
								setShowPaymentMethodDropdown(true);
								setPaymentMethodHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowPaymentMethodDropdown(false);
									handleChange('payment_method', '');
								}
							}}
							onFocus={() => {
								if (filteredPaymentMethods.length > 0) {
									setShowPaymentMethodDropdown(true);
								}
								setPaymentMethodSearchQuery('');
							}}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
							placeholder="Select payment method"
							disabled={loading}
						/>
						{showPaymentMethodDropdown && filteredPaymentMethods.length > 0 && (
							<div
								ref={paymentMethodDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredPaymentMethods.map((method, index) => (
									<button
										key={method}
										type="button"
										onClick={() => {
											handleChange('payment_method', method);
											setPaymentMethodSearchQuery(method);
											setShowPaymentMethodDropdown(false);
										}}
										onMouseEnter={() => setPaymentMethodHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === paymentMethodHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.payment_method === method ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{method.replace('_', ' ')}</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Status */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
					<div className="relative">
						<input
							ref={statusInputRef}
							type="text"
							value={formData.status || statusSearchQuery}
							onChange={(e) => {
								setStatusSearchQuery(e.target.value);
								setShowStatusDropdown(true);
								setStatusHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowStatusDropdown(false);
									handleChange('status', '');
								}
							}}
							onFocus={() => {
								if (filteredStatuses.length > 0) {
									setShowStatusDropdown(true);
								}
								setStatusSearchQuery('');
							}}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
							placeholder="Select status"
							disabled={loading}
						/>
						{showStatusDropdown && filteredStatuses.length > 0 && (
							<div
								ref={statusDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredStatuses.map((status, index) => (
									<button
										key={status}
										type="button"
										onClick={() => {
											handleChange('status', status);
											setStatusSearchQuery(status);
											setShowStatusDropdown(false);
										}}
										onMouseEnter={() => setStatusHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === statusHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.status === status ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{status}</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Expense Date */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Expense Date</label>
					<input
						type="date"
						value={formData.expense_date || ''}
						onChange={(e) => handleChange('expense_date', e.target.value)}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
						disabled={loading}
					/>
				</div>
			</div>

			{/* Description */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
				<textarea
					value={formData.description || ''}
					onChange={(e) => handleChange('description', e.target.value)}
					rows={4}
					className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
					placeholder="Enter expense description"
					disabled={loading}
				/>
			</div>

			{/* Invoice Images */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Invoice Images</label>
				<div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-300 px-6 py-6">
					<div className="text-center">
						<PhotoIcon className="mx-auto h-8 w-8 text-gray-400" />
						<div className="mt-2 flex text-sm leading-6 text-gray-600">
							<label
								htmlFor="invoice-upload"
								className="relative cursor-pointer rounded-md bg-white font-semibold text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 hover:text-primary-500"
							>
								<span>Upload files</span>
								<input
									id="invoice-upload"
									name="invoice-upload"
									type="file"
									multiple
									accept="image/*"
									className="sr-only"
									onChange={handleInvoiceFileChange}
									disabled={loading}
								/>
							</label>
							<p className="pl-1">or drag and drop</p>
						</div>
						<p className="text-xs leading-5 text-gray-600">PNG, JPG, GIF up to 5MB each</p>
					</div>
				</div>
				{invoicePreviews.length > 0 && (
					<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
						{invoicePreviews.map((preview, index) => (
							<div key={index} className="relative">
								<img
									src={preview}
									alt={`Invoice ${index + 1}`}
									className="w-full h-20 object-cover rounded-[3px] border border-gray-300"
								/>
								<button
									type="button"
									onClick={() => removeInvoiceImage(index)}
									className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
									disabled={loading}
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Form Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					disabled={loading}
					className="px-4 py-2.5 border border-gray-300 rounded-[3px] text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-4 py-2.5 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
				</button>
			</div>
		</form>
	);
}


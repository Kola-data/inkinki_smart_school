import { useState, useEffect, useRef } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import { convertFileToBase64, validateImageFile, validateFileSize } from '../../../utils/fileUtils';

interface FeeManagementMember {
	fee_id?: string;
	school_id: string;
	std_id: string;
	fee_type_id: string;
	academic_id: string;
	term: string;
	amount_paid: number;
	status: string;
	invoice_img?: string | null;
}

interface StudentOption {
	std_id: string;
	std_name: string;
	std_code: string | null;
}

interface FeeTypeOption {
	fee_type_id: string;
	fee_type_name: string;
	amount_to_pay: number;
}

interface AcademicYearOption {
	academic_id: string;
	academic_name: string;
	start_date: string | null;
	end_date: string | null;
}

interface FeeManagementFormProps {
	fee?: FeeManagementMember | null;
	onSubmit: (data: Partial<FeeManagementMember>) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
	schoolId: string;
}

export default function FeeManagementForm({ fee, onSubmit, onCancel, loading = false, mode, schoolId }: FeeManagementFormProps) {
	const [formData, setFormData] = useState<Partial<FeeManagementMember>>({
		std_id: '',
		fee_type_id: '',
		academic_id: '',
		term: '',
		amount_paid: 0,
		status: 'pending',
		school_id: schoolId,
		invoice_img: null,
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [availableStudents, setAvailableStudents] = useState<StudentOption[]>([]);
	const [availableFeeTypes, setAvailableFeeTypes] = useState<FeeTypeOption[]>([]);
	const [availableAcademicYears, setAvailableAcademicYears] = useState<AcademicYearOption[]>([]);
	const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
	const [invoicePreview, setInvoicePreview] = useState<string | null>(null);

	// Autocomplete states for student
	const [studentSearchQuery, setStudentSearchQuery] = useState('');
	const [showStudentDropdown, setShowStudentDropdown] = useState(false);
	const [studentHighlightedIndex, setStudentHighlightedIndex] = useState(-1);
	const studentDropdownRef = useRef<HTMLDivElement>(null);
	const studentInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for fee type
	const [feeTypeSearchQuery, setFeeTypeSearchQuery] = useState('');
	const [showFeeTypeDropdown, setShowFeeTypeDropdown] = useState(false);
	const [feeTypeHighlightedIndex, setFeeTypeHighlightedIndex] = useState(-1);
	const feeTypeDropdownRef = useRef<HTMLDivElement>(null);
	const feeTypeInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for academic year
	const [academicYearSearchQuery, setAcademicYearSearchQuery] = useState('');
	const [showAcademicYearDropdown, setShowAcademicYearDropdown] = useState(false);
	const [academicYearHighlightedIndex, setAcademicYearHighlightedIndex] = useState(-1);
	const academicYearDropdownRef = useRef<HTMLDivElement>(null);
	const academicYearInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for term
	const [termSearchQuery, setTermSearchQuery] = useState('');
	const [showTermDropdown, setShowTermDropdown] = useState(false);
	const [termHighlightedIndex, setTermHighlightedIndex] = useState(-1);
	const termDropdownRef = useRef<HTMLDivElement>(null);
	const termInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for status
	const [statusSearchQuery, setStatusSearchQuery] = useState('');
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const [statusHighlightedIndex, setStatusHighlightedIndex] = useState(-1);
	const statusDropdownRef = useRef<HTMLDivElement>(null);
	const statusInputRef = useRef<HTMLInputElement>(null);

	const termOptions = ['Term 1', 'Term 2', 'Term 3', 'First Term', 'Second Term', 'Third Term'];
	const statusOptions = ['pending', 'paid', 'overdue', 'partial'];

	// Fetch options
	useEffect(() => {
		const fetchOptions = async () => {
			if (!schoolId) return;

			try {
				const timestamp = new Date().getTime();

				// Fetch students
				const studentsResponse = await api.get(`/students/?school_id=${schoolId}&_t=${timestamp}`);
				const students: StudentOption[] = getArrayFromResponse(studentsResponse.data).map((s: any) => ({
					std_id: s.std_id,
					std_name: s.std_name,
					std_code: s.std_code,
				}));
				setAvailableStudents(students);

				// Fetch fee types
				const feeTypesResponse = await api.get(`/fee-types/?school_id=${schoolId}&_t=${timestamp}`);
				const feeTypes: FeeTypeOption[] = getArrayFromResponse(feeTypesResponse.data).map((ft: any) => ({
					fee_type_id: ft.fee_type_id,
					fee_type_name: ft.fee_type_name,
					amount_to_pay: ft.amount_to_pay,
				}));
				setAvailableFeeTypes(feeTypes);

				// Fetch academic years
				const academicYearsResponse = await api.get(`/academic-years/?school_id=${schoolId}&_t=${timestamp}`);
				const academicYears: AcademicYearOption[] = getArrayFromResponse(academicYearsResponse.data).map((ay: any) => ({
					academic_id: ay.academic_id,
					academic_name: ay.academic_name,
					start_date: ay.start_date,
					end_date: ay.end_date,
				}));
				setAvailableAcademicYears(academicYears);
			} catch (error: any) {setAvailableStudents([]);
				setAvailableFeeTypes([]);
				setAvailableAcademicYears([]);
			}
		};

		fetchOptions();
	}, [schoolId]);

	// Set form data when editing
	useEffect(() => {
		if (fee && mode === 'edit') {
			setFormData({
				std_id: fee.std_id || '',
				fee_type_id: fee.fee_type_id || '',
				academic_id: fee.academic_id || '',
				term: fee.term || '',
				amount_paid: fee.amount_paid || 0,
				status: fee.status || 'pending',
				school_id: schoolId,
				invoice_img: fee.invoice_img || null,
			});
			setErrors({});
			
			// Set search queries based on selected values
			const selectedStudent = availableStudents.find((s) => s.std_id === fee.std_id);
			setStudentSearchQuery(selectedStudent ? `${selectedStudent.std_name}${selectedStudent.std_code ? ` (${selectedStudent.std_code})` : ''}` : '');
			
			const selectedFeeType = availableFeeTypes.find((ft) => ft.fee_type_id === fee.fee_type_id);
			setFeeTypeSearchQuery(selectedFeeType ? selectedFeeType.fee_type_name : '');
			
			const selectedAcademicYear = availableAcademicYears.find((ay) => ay.academic_id === fee.academic_id);
			setAcademicYearSearchQuery(selectedAcademicYear ? selectedAcademicYear.academic_name : '');
			
			setTermSearchQuery(fee.term || '');
			setStatusSearchQuery(fee.status || 'pending');
		}
		if (mode === 'create') {
			setFormData({
				std_id: '',
				fee_type_id: '',
				academic_id: '',
				term: '',
				amount_paid: 0,
				status: 'pending',
				school_id: schoolId,
				invoice_img: null,
			});
			setErrors({});
			setStudentSearchQuery('');
			setFeeTypeSearchQuery('');
			setAcademicYearSearchQuery('');
			setTermSearchQuery('');
			setStatusSearchQuery('pending');
		}
	}, [fee, mode, schoolId, availableStudents, availableFeeTypes, availableAcademicYears]);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				studentDropdownRef.current &&
				!studentDropdownRef.current.contains(event.target as Node) &&
				studentInputRef.current &&
				!studentInputRef.current.contains(event.target as Node)
			) {
				setShowStudentDropdown(false);
			}
			if (
				feeTypeDropdownRef.current &&
				!feeTypeDropdownRef.current.contains(event.target as Node) &&
				feeTypeInputRef.current &&
				!feeTypeInputRef.current.contains(event.target as Node)
			) {
				setShowFeeTypeDropdown(false);
			}
			if (
				academicYearDropdownRef.current &&
				!academicYearDropdownRef.current.contains(event.target as Node) &&
				academicYearInputRef.current &&
				!academicYearInputRef.current.contains(event.target as Node)
			) {
				setShowAcademicYearDropdown(false);
			}
			if (
				termDropdownRef.current &&
				!termDropdownRef.current.contains(event.target as Node) &&
				termInputRef.current &&
				!termInputRef.current.contains(event.target as Node)
			) {
				setShowTermDropdown(false);
			}
			if (
				statusDropdownRef.current &&
				!statusDropdownRef.current.contains(event.target as Node) &&
				statusInputRef.current &&
				!statusInputRef.current.contains(event.target as Node)
			) {
				setShowStatusDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Filter options
	const filteredStudents = availableStudents.filter((student) => {
		if (!studentSearchQuery.trim()) return true;
		const query = studentSearchQuery.toLowerCase();
		return (
			(student.std_name && student.std_name.toLowerCase().includes(query)) ||
			(student.std_code && student.std_code.toLowerCase().includes(query))
		);
	});

	const filteredFeeTypes = availableFeeTypes.filter((feeType) => {
		if (!feeTypeSearchQuery.trim()) return true;
		const query = feeTypeSearchQuery.toLowerCase();
		return feeType.fee_type_name && feeType.fee_type_name.toLowerCase().includes(query);
	});

	const filteredAcademicYears = availableAcademicYears.filter((academicYear) => {
		if (!academicYearSearchQuery.trim()) return true;
		const query = academicYearSearchQuery.toLowerCase();
		return academicYear.academic_name && academicYear.academic_name.toLowerCase().includes(query);
	});

	const filteredTerms = termOptions.filter((term) => {
		if (!termSearchQuery.trim()) return true;
		const query = termSearchQuery.toLowerCase();
		return term.toLowerCase().includes(query);
	});

	const filteredStatuses = statusOptions.filter((status) => {
		if (!statusSearchQuery.trim()) return true;
		const query = statusSearchQuery.toLowerCase();
		return status.toLowerCase().includes(query);
	});

	// Get selected option details
	const selectedStudent = availableStudents.find((s) => s.std_id === formData.std_id);
	const selectedFeeType = availableFeeTypes.find((ft) => ft.fee_type_id === formData.fee_type_id);
	const selectedAcademicYear = availableAcademicYears.find((ay) => ay.academic_id === formData.academic_id);


	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.std_id?.trim()) {
			newErrors.std_id = 'Student is required';
		}
		if (!formData.fee_type_id?.trim()) {
			newErrors.fee_type_id = 'Fee type is required';
		}
		if (!formData.academic_id?.trim()) {
			newErrors.academic_id = 'Academic year is required';
		}
		if (!formData.term?.trim()) {
			newErrors.term = 'Term is required';
		}
		if (formData.amount_paid === undefined || formData.amount_paid === null) {
			newErrors.amount_paid = 'Amount paid is required';
		} else if (formData.amount_paid < 0) {
			newErrors.amount_paid = 'Amount paid must be 0 or greater';
		}
		// Invoice image is required
		if (!invoiceFile && !formData.invoice_img) {
			newErrors.invoice_img = 'Invoice image is required';
		}
		if (!formData.status?.trim()) {
			newErrors.status = 'Status is required';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleInvoiceFileChange = async (file: File | null) => {
		if (!file) {
			setInvoiceFile(null);
			setInvoicePreview(null);
			return;
		}

		if (!validateImageFile(file)) {
			setErrors((prev) => ({ ...prev, invoice_img: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)' }));
			return;
		}

		if (!validateFileSize(file, 5)) {
			setErrors((prev) => ({ ...prev, invoice_img: 'Image file size must be less than 5MB' }));
			return;
		}

		setInvoiceFile(file);
		setErrors((prev) => ({ ...prev, invoice_img: '' }));
		
		// Create preview
		const preview = URL.createObjectURL(file);
		setInvoicePreview(preview);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (validate()) {
			const submitData: any = { ...formData };
			// Ensure amount_paid is a number
			if (typeof submitData.amount_paid === 'string') {
				submitData.amount_paid = parseFloat(submitData.amount_paid) || 0;
			}
			
			// Convert invoice image to base64 if present
			if (invoiceFile) {
				try {
					submitData.invoice_img = await convertFileToBase64(invoiceFile);
				} catch (error) {
					setErrors((prev) => ({ ...prev, invoice_img: 'Failed to process invoice image' }));
					return;
				}
			} else if (mode === 'edit' && !submitData.invoice_img) {
				// Keep existing invoice if not changed
				submitData.invoice_img = null;
			}
			
			await onSubmit(submitData);
		}
	};

	const handleChange = (field: keyof FeeManagementMember, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	const handleStudentKeyDown = (e: React.KeyboardEvent) => {
		if (!showStudentDropdown || filteredStudents.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setStudentHighlightedIndex((prev) => (prev < filteredStudents.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setStudentHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (studentHighlightedIndex >= 0 && studentHighlightedIndex < filteredStudents.length) {
					const selected = filteredStudents[studentHighlightedIndex];
					handleChange('std_id', selected.std_id);
					setStudentSearchQuery(`${selected.std_name}${selected.std_code ? ` (${selected.std_code})` : ''}`);
					setShowStudentDropdown(false);
				}
				break;
			case 'Escape':
				setShowStudentDropdown(false);
				setStudentHighlightedIndex(-1);
				break;
		}
	};

	const handleFeeTypeKeyDown = (e: React.KeyboardEvent) => {
		if (!showFeeTypeDropdown || filteredFeeTypes.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setFeeTypeHighlightedIndex((prev) => (prev < filteredFeeTypes.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setFeeTypeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (feeTypeHighlightedIndex >= 0 && feeTypeHighlightedIndex < filteredFeeTypes.length) {
					const selected = filteredFeeTypes[feeTypeHighlightedIndex];
					handleChange('fee_type_id', selected.fee_type_id);
					setFeeTypeSearchQuery(selected.fee_type_name);
					setShowFeeTypeDropdown(false);
				}
				break;
			case 'Escape':
				setShowFeeTypeDropdown(false);
				setFeeTypeHighlightedIndex(-1);
				break;
		}
	};

	const handleAcademicYearKeyDown = (e: React.KeyboardEvent) => {
		if (!showAcademicYearDropdown || filteredAcademicYears.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setAcademicYearHighlightedIndex((prev) => (prev < filteredAcademicYears.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setAcademicYearHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (academicYearHighlightedIndex >= 0 && academicYearHighlightedIndex < filteredAcademicYears.length) {
					const selected = filteredAcademicYears[academicYearHighlightedIndex];
					handleChange('academic_id', selected.academic_id);
					setAcademicYearSearchQuery(selected.academic_name);
					setShowAcademicYearDropdown(false);
				}
				break;
			case 'Escape':
				setShowAcademicYearDropdown(false);
				setAcademicYearHighlightedIndex(-1);
				break;
		}
	};

	const handleTermKeyDown = (e: React.KeyboardEvent) => {
		if (!showTermDropdown || filteredTerms.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setTermHighlightedIndex((prev) => (prev < filteredTerms.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setTermHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (termHighlightedIndex >= 0 && termHighlightedIndex < filteredTerms.length) {
					const selected = filteredTerms[termHighlightedIndex];
					handleChange('term', selected);
					setTermSearchQuery(selected);
					setShowTermDropdown(false);
				}
				break;
			case 'Escape':
				setShowTermDropdown(false);
				setTermHighlightedIndex(-1);
				break;
		}
	};

	const handleStatusKeyDown = (e: React.KeyboardEvent) => {
		if (!showStatusDropdown || filteredStatuses.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setStatusHighlightedIndex((prev) => (prev < filteredStatuses.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setStatusHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (statusHighlightedIndex >= 0 && statusHighlightedIndex < filteredStatuses.length) {
					const selected = filteredStatuses[statusHighlightedIndex];
					handleChange('status', selected);
					setStatusSearchQuery(selected);
					setShowStatusDropdown(false);
				}
				break;
			case 'Escape':
				setShowStatusDropdown(false);
				setStatusHighlightedIndex(-1);
				break;
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Student Selection */}
			<div className="md:col-span-2">
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Student <span className="text-red-500">*</span>
				</label>
				<div className="relative">
					<input
						ref={studentInputRef}
						type="text"
						value={studentSearchQuery}
						onChange={(e) => {
							setStudentSearchQuery(e.target.value);
							setShowStudentDropdown(true);
							setStudentHighlightedIndex(-1);
							if (!e.target.value.trim()) {
								setShowStudentDropdown(false);
								handleChange('std_id', '');
							}
						}}
						onFocus={() => {
							if (filteredStudents.length > 0) {
								setShowStudentDropdown(true);
							}
						}}
						onKeyDown={handleStudentKeyDown}
						placeholder="Search student by name or code..."
						disabled={loading || availableStudents.length === 0}
						className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
							errors.std_id ? 'border-red-500' : 'border-gray-300'
						} disabled:bg-gray-100 disabled:cursor-not-allowed`}
					/>
					{showStudentDropdown && filteredStudents.length > 0 && (
						<div
							ref={studentDropdownRef}
							className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
						>
							{filteredStudents.map((student, index) => (
								<button
									key={student.std_id}
									type="button"
									onClick={() => {
										handleChange('std_id', student.std_id);
										setStudentSearchQuery(`${student.std_name}${student.std_code ? ` (${student.std_code})` : ''}`);
										setShowStudentDropdown(false);
									}}
									onMouseEnter={() => setStudentHighlightedIndex(index)}
									className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
										index === studentHighlightedIndex ? 'bg-primary-50' : ''
									} ${formData.std_id === student.std_id ? 'bg-primary-100 font-medium' : ''}`}
								>
									<div className="text-sm font-medium text-gray-900">{student.std_name}</div>
									{student.std_code && <div className="text-xs text-gray-500">{student.std_code}</div>}
								</button>
							))}
						</div>
					)}
				</div>
				{errors.std_id && <p className="mt-1 text-sm text-red-500">{errors.std_id}</p>}
			</div>

			{/* Fee Type Selection */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Fee Type <span className="text-red-500">*</span>
				</label>
				<div className="relative">
					<input
						ref={feeTypeInputRef}
						type="text"
						value={feeTypeSearchQuery}
						onChange={(e) => {
							setFeeTypeSearchQuery(e.target.value);
							setShowFeeTypeDropdown(true);
							setFeeTypeHighlightedIndex(-1);
							if (!e.target.value.trim()) {
								setShowFeeTypeDropdown(false);
								handleChange('fee_type_id', '');
							}
						}}
						onFocus={() => {
							if (filteredFeeTypes.length > 0) {
								setShowFeeTypeDropdown(true);
							}
						}}
						onKeyDown={handleFeeTypeKeyDown}
						placeholder="Search fee type..."
						disabled={loading || availableFeeTypes.length === 0}
						className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
							errors.fee_type_id ? 'border-red-500' : 'border-gray-300'
						} disabled:bg-gray-100 disabled:cursor-not-allowed`}
					/>
					{showFeeTypeDropdown && filteredFeeTypes.length > 0 && (
						<div
							ref={feeTypeDropdownRef}
							className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
						>
							{filteredFeeTypes.map((feeType, index) => (
								<button
									key={feeType.fee_type_id}
									type="button"
									onClick={() => {
										handleChange('fee_type_id', feeType.fee_type_id);
										setFeeTypeSearchQuery(feeType.fee_type_name);
										setShowFeeTypeDropdown(false);
									}}
									onMouseEnter={() => setFeeTypeHighlightedIndex(index)}
									className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
										index === feeTypeHighlightedIndex ? 'bg-primary-50' : ''
									} ${formData.fee_type_id === feeType.fee_type_id ? 'bg-primary-100 font-medium' : ''}`}
								>
									<div className="text-sm font-medium text-gray-900">{feeType.fee_type_name}</div>
									<div className="text-xs text-gray-500">${feeType.amount_to_pay.toFixed(2)}</div>
								</button>
							))}
						</div>
					)}
				</div>
				{errors.fee_type_id && <p className="mt-1 text-sm text-red-500">{errors.fee_type_id}</p>}
			</div>

			{/* Academic Year Selection */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Academic Year <span className="text-red-500">*</span>
				</label>
				<div className="relative">
					<input
						ref={academicYearInputRef}
						type="text"
						value={academicYearSearchQuery}
						onChange={(e) => {
							setAcademicYearSearchQuery(e.target.value);
							setShowAcademicYearDropdown(true);
							setAcademicYearHighlightedIndex(-1);
							if (!e.target.value.trim()) {
								setShowAcademicYearDropdown(false);
								handleChange('academic_id', '');
							}
						}}
						onFocus={() => {
							if (filteredAcademicYears.length > 0) {
								setShowAcademicYearDropdown(true);
							}
						}}
						onKeyDown={handleAcademicYearKeyDown}
						placeholder="Search academic year..."
						disabled={loading || availableAcademicYears.length === 0}
						className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
							errors.academic_id ? 'border-red-500' : 'border-gray-300'
						} disabled:bg-gray-100 disabled:cursor-not-allowed`}
					/>
					{showAcademicYearDropdown && filteredAcademicYears.length > 0 && (
						<div
							ref={academicYearDropdownRef}
							className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
						>
							{filteredAcademicYears.map((academicYear, index) => (
								<button
									key={academicYear.academic_id}
									type="button"
									onClick={() => {
										handleChange('academic_id', academicYear.academic_id);
										setAcademicYearSearchQuery(academicYear.academic_name);
										setShowAcademicYearDropdown(false);
									}}
									onMouseEnter={() => setAcademicYearHighlightedIndex(index)}
									className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
										index === academicYearHighlightedIndex ? 'bg-primary-50' : ''
									} ${formData.academic_id === academicYear.academic_id ? 'bg-primary-100 font-medium' : ''}`}
								>
									<div className="text-sm font-medium text-gray-900">{academicYear.academic_name}</div>
								</button>
							))}
						</div>
					)}
				</div>
				{errors.academic_id && <p className="mt-1 text-sm text-red-500">{errors.academic_id}</p>}
			</div>

			{/* Term Selection */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Term <span className="text-red-500">*</span>
				</label>
				<div className="relative">
					<input
						ref={termInputRef}
						type="text"
						value={termSearchQuery}
						onChange={(e) => {
							setTermSearchQuery(e.target.value);
							setShowTermDropdown(true);
							setTermHighlightedIndex(-1);
							if (!e.target.value.trim()) {
								setShowTermDropdown(false);
								handleChange('term', '');
							}
						}}
						onFocus={() => {
							if (filteredTerms.length > 0) {
								setShowTermDropdown(true);
							}
						}}
						onKeyDown={handleTermKeyDown}
						placeholder="Select term..."
						disabled={loading}
						className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
							errors.term ? 'border-red-500' : 'border-gray-300'
						} disabled:bg-gray-100 disabled:cursor-not-allowed`}
					/>
					{showTermDropdown && filteredTerms.length > 0 && (
						<div
							ref={termDropdownRef}
							className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
						>
							{filteredTerms.map((term, index) => (
								<button
									key={term}
									type="button"
									onClick={() => {
										handleChange('term', term);
										setTermSearchQuery(term);
										setShowTermDropdown(false);
									}}
									onMouseEnter={() => setTermHighlightedIndex(index)}
									className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
										index === termHighlightedIndex ? 'bg-primary-50' : ''
									} ${formData.term === term ? 'bg-primary-100 font-medium' : ''}`}
								>
									<div className="text-sm font-medium text-gray-900">{term}</div>
								</button>
							))}
						</div>
					)}
				</div>
				{errors.term && <p className="mt-1 text-sm text-red-500">{errors.term}</p>}
			</div>

			{/* Amount Paid */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Amount Paid <span className="text-red-500">*</span>
				</label>
				<input
					type="number"
					step="0.01"
					min="0"
					value={formData.amount_paid || 0}
					onChange={(e) => handleChange('amount_paid', parseFloat(e.target.value) || 0)}
					className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
						errors.amount_paid ? 'border-red-500' : 'border-gray-300'
					}`}
					placeholder="0.00"
					disabled={loading}
				/>
				{errors.amount_paid && <p className="mt-1 text-sm text-red-500">{errors.amount_paid}</p>}
			</div>

			{/* Status Selection */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Status <span className="text-red-500">*</span>
				</label>
				<div className="relative">
					<input
						ref={statusInputRef}
						type="text"
						value={statusSearchQuery}
						onChange={(e) => {
							setStatusSearchQuery(e.target.value);
							setShowStatusDropdown(true);
							setStatusHighlightedIndex(-1);
							if (!e.target.value.trim()) {
								setShowStatusDropdown(false);
								handleChange('status', 'pending');
							}
						}}
						onFocus={() => {
							if (filteredStatuses.length > 0) {
								setShowStatusDropdown(true);
							}
						}}
						onKeyDown={handleStatusKeyDown}
						placeholder="Select status..."
						disabled={loading}
						className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
							errors.status ? 'border-red-500' : 'border-gray-300'
						} disabled:bg-gray-100 disabled:cursor-not-allowed`}
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
									<div className="text-sm font-medium text-gray-900 capitalize">{status}</div>
								</button>
							))}
						</div>
					)}
				</div>
				{errors.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
			</div>

			{/* Invoice Image */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Invoice Image <span className="text-red-500">*</span>
				</label>
				{invoicePreview ? (
					<div className="relative inline-block">
						<img
							src={invoicePreview}
							alt="Invoice preview"
							className="w-32 h-32 object-cover border border-gray-300 rounded-[3px]"
						/>
						<button
							type="button"
							onClick={() => handleInvoiceFileChange(null)}
							className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
						>
							×
						</button>
					</div>
				) : (
					<label className="cursor-pointer">
						<div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-[3px] flex flex-col items-center justify-center hover:border-primary-500 transition-colors">
							<PhotoIcon className="w-8 h-8 text-gray-400" />
							<span className="text-xs text-gray-500 mt-2">Click to upload invoice</span>
						</div>
						<input
							type="file"
							accept="image/*"
							onChange={(e) => {
								const file = e.target.files?.[0] || null;
								handleInvoiceFileChange(file);
							}}
							className="hidden"
							disabled={loading}
						/>
					</label>
				)}
				{errors.invoice_img && <p className="mt-1 text-sm text-red-500">{errors.invoice_img}</p>}
			</div>

			{/* Form Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					disabled={loading}
					className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-[3px] hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Saving...' : mode === 'create' ? 'Create Fee' : 'Update Fee'}
				</button>
			</div>
		</form>
	);
}



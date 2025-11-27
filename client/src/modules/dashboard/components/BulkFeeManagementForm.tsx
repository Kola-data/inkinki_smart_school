import { useState, useEffect, useRef } from 'react';
import { UserGroupIcon, PhotoIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import { convertFileToBase64, validateImageFile, validateFileSize } from '../../../utils/fileUtils';

interface StudentOption {
	std_id: string;
	std_name: string;
	std_code: string | null;
	current_class: string | null;
	current_class_name?: string | null;
}

interface FeeTypeOption {
	fee_type_id: string;
	fee_type_name: string;
	amount_to_pay: number;
}

interface AcademicYearOption {
	academic_id: string;
	academic_name: string;
}

interface BulkFeeRecord {
	std_id: string;
	fee_type_id: string;
	academic_id: string;
	term: string;
	amount_paid: number;
	status: string;
	invoice_img?: string | null;
}

interface BulkFeeManagementFormProps {
	schoolId: string;
	onSubmit: (data: BulkFeeRecord[]) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
}

export default function BulkFeeManagementForm({ schoolId, onSubmit, onCancel, loading = false }: BulkFeeManagementFormProps) {
	const [students, setStudents] = useState<StudentOption[]>([]);
	const [filteredStudents, setFilteredStudents] = useState<StudentOption[]>([]);
	const [availableFeeTypes, setAvailableFeeTypes] = useState<FeeTypeOption[]>([]);
	const [availableAcademicYears, setAvailableAcademicYears] = useState<AcademicYearOption[]>([]);
	const [availableClasses, setAvailableClasses] = useState<Array<{ cls_id: string; cls_name: string }>>([]);

	// Filters
	const [nameFilter, setNameFilter] = useState('');
	const [classFilter, setClassFilter] = useState('');
	const [classFilterQuery, setClassFilterQuery] = useState('');
	const [showClassFilterDropdown, setShowClassFilterDropdown] = useState(false);
	const [classFilterHighlightedIndex, setClassFilterHighlightedIndex] = useState(-1);
	const classFilterDropdownRef = useRef<HTMLDivElement>(null);
	const classFilterInputRef = useRef<HTMLInputElement>(null);

	// Form data for each student
	const [studentFeeData, setStudentFeeData] = useState<Record<string, BulkFeeRecord>>({});
	// Invoice images for each student
	const [invoiceFiles, setInvoiceFiles] = useState<Record<string, File | null>>({});
	const [invoicePreviews, setInvoicePreviews] = useState<Record<string, string>>({});

	// Autocomplete states per student (using refs to track which student is active)
	const [activeFeeTypeDropdown, setActiveFeeTypeDropdown] = useState<string | null>(null);
	const [activeTermDropdown, setActiveTermDropdown] = useState<string | null>(null);
	const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null);
	const [feeTypeSearchQueries, setFeeTypeSearchQueries] = useState<Record<string, string>>({});
	const [termSearchQueries, setTermSearchQueries] = useState<Record<string, string>>({});
	const [statusSearchQueries, setStatusSearchQueries] = useState<Record<string, string>>({});
	const [highlightedIndices, setHighlightedIndices] = useState<Record<string, number>>({});

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
				const studentsData: StudentOption[] = getArrayFromResponse(studentsResponse.data).map((s: any) => ({
					std_id: s.std_id,
					std_name: s.std_name,
					std_code: s.std_code,
					current_class: s.current_class,
					current_class_name: s.current_class_name,
				}));
				setStudents(studentsData);
				setFilteredStudents(studentsData);

				// Fetch fee types
				const feeTypesResponse = await api.get(`/fee-types/?school_id=${schoolId}&_t=${timestamp}`);
				const feeTypes: FeeTypeOption[] = getArrayFromResponse(feeTypesResponse.data).map((ft: any) => ({
					fee_type_id: ft.fee_type_id,
					fee_type_name: ft.fee_type_name,
					amount_to_pay: ft.amount_to_pay,
				}));
				setAvailableFeeTypes(feeTypes);

				// Fetch current academic year only
				try {
					const currentAcademicYearResponse = await api.get(`/academic-years/current?school_id=${schoolId}&_t=${timestamp}`);
					const currentYear: AcademicYearOption = {
						academic_id: currentAcademicYearResponse.data.academic_id,
						academic_name: currentAcademicYearResponse.data.academic_name,
					};
					setAvailableAcademicYears([currentYear]);
				} catch (error: any) {// If no current academic year found, show empty array
					setAvailableAcademicYears([]);
				}

				// Fetch classes
				const classesResponse = await api.get(`/classes/?school_id=${schoolId}&_t=${timestamp}`);
				const classes = getArrayFromResponse(classesResponse.data).map((c: any) => ({
					cls_id: c.cls_id,
					cls_name: c.cls_name,
				}));
				setAvailableClasses(classes);
			} catch (error: any) {}
		};

		fetchOptions();
	}, [schoolId]);

	// Filter students
	useEffect(() => {
		let filtered = students;

		if (nameFilter.trim()) {
			const query = nameFilter.toLowerCase();
			filtered = filtered.filter(
				(s) =>
					s.std_name?.toLowerCase().includes(query) ||
					s.std_code?.toLowerCase().includes(query)
			);
		}

		if (classFilter) {
			filtered = filtered.filter((s) => s.current_class === classFilter);
		}

		setFilteredStudents(filtered);
	}, [nameFilter, classFilter, students]);

	// Initialize fee data for filtered students and auto-set current academic year
	useEffect(() => {
		const currentYear = availableAcademicYears.length > 0 ? availableAcademicYears[0] : null;
		const newData: Record<string, BulkFeeRecord> = { ...studentFeeData };
		filteredStudents.forEach((student) => {
			if (!newData[student.std_id]) {
				newData[student.std_id] = {
					std_id: student.std_id,
					fee_type_id: '',
					academic_id: currentYear?.academic_id || '',
					term: '',
					amount_paid: 0,
					status: 'pending',
					invoice_img: null,
				};
			} else if (currentYear) {
				// Auto-set current academic year if not already set
				newData[student.std_id] = {
					...newData[student.std_id],
					academic_id: currentYear.academic_id,
				};
			}
		});
		setStudentFeeData(newData);
	}, [filteredStudents, availableAcademicYears]);

	// Filter options for a specific student
	const getFilteredFeeTypes = (stdId: string) => {
		const query = feeTypeSearchQueries[stdId] || '';
		if (!query.trim()) return availableFeeTypes;
		const lowerQuery = query.toLowerCase();
		return availableFeeTypes.filter((feeType) => 
			feeType.fee_type_name && feeType.fee_type_name.toLowerCase().includes(lowerQuery)
		);
	};

	const getFilteredTerms = (stdId: string) => {
		const query = termSearchQueries[stdId] || '';
		if (!query.trim()) return termOptions;
		const lowerQuery = query.toLowerCase();
		return termOptions.filter((term) => term.toLowerCase().includes(lowerQuery));
	};

	const getFilteredStatuses = (stdId: string) => {
		const query = statusSearchQueries[stdId] || '';
		if (!query.trim()) return statusOptions;
		const lowerQuery = query.toLowerCase();
		return statusOptions.filter((status) => status.toLowerCase().includes(lowerQuery));
	};

	// Filter classes for autocomplete
	const filteredClasses = availableClasses.filter((cls) => {
		if (!classFilterQuery.trim()) return true;
		const query = classFilterQuery.toLowerCase();
		return cls.cls_name && cls.cls_name.toLowerCase().includes(query);
	});

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			// Check if click is inside any dropdown or input
			const isInsideDropdown = target.closest('.absolute.z-50');
			const isInput = target.tagName === 'INPUT';
			
			if (
				classFilterDropdownRef.current &&
				!classFilterDropdownRef.current.contains(target) &&
				classFilterInputRef.current &&
				!classFilterInputRef.current.contains(target)
			) {
				setShowClassFilterDropdown(false);
			}
			
			if (!isInsideDropdown && !isInput) {
				setActiveFeeTypeDropdown(null);
				setActiveTermDropdown(null);
				setActiveStatusDropdown(null);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleStudentFeeChange = (stdId: string, field: keyof BulkFeeRecord, value: any) => {
		setStudentFeeData((prev) => ({
			...prev,
			[stdId]: {
				...prev[stdId],
				std_id: stdId,
				fee_type_id: prev[stdId]?.fee_type_id || '',
				academic_id: prev[stdId]?.academic_id || '',
				term: prev[stdId]?.term || '',
				amount_paid: prev[stdId]?.amount_paid || 0,
				status: prev[stdId]?.status || 'pending',
				invoice_img: prev[stdId]?.invoice_img || null,
				[field]: value,
			},
		}));
	};

	const validate = (): boolean => {
		for (const student of filteredStudents) {
			const data = studentFeeData[student.std_id];
			if (!data) continue;

			if (!data.fee_type_id?.trim()) {
				return false;
			}
			if (!data.academic_id?.trim()) {
				return false;
			}
			if (!data.term?.trim()) {
				return false;
			}
			if (data.amount_paid === undefined || data.amount_paid === null || data.amount_paid < 0) {
				return false;
			}
			if (!data.status?.trim()) {
				return false;
			}
			// Invoice image is required
			if (!invoiceFiles[student.std_id] && !data.invoice_img) {
				return false;
			}
		}
		return true;
	};

	const handleInvoiceFileChange = async (stdId: string, file: File | null) => {
		if (!file) {
			setInvoiceFiles((prev) => {
				const newFiles = { ...prev };
				delete newFiles[stdId];
				return newFiles;
			});
			setInvoicePreviews((prev) => {
				const newPreviews = { ...prev };
				delete newPreviews[stdId];
				return newPreviews;
			});
			return;
		}

		if (!validateImageFile(file)) {
			alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
			return;
		}

		if (!validateFileSize(file, 5)) {
			alert('Image file size must be less than 5MB');
			return;
		}

		setInvoiceFiles((prev) => ({ ...prev, [stdId]: file }));
		
		// Create preview
		const preview = URL.createObjectURL(file);
		setInvoicePreviews((prev) => ({ ...prev, [stdId]: preview }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) {
			alert('Please fill all required fields for selected students');
			return;
		}

		const feeRecords: BulkFeeRecord[] = [];
		
		for (const student of filteredStudents) {
			const data = studentFeeData[student.std_id];
			if (!data || !data.fee_type_id || !data.academic_id || !data.term) {
				continue;
			}

			// Convert invoice image to base64 if present
			let invoiceBase64: string | null = null;
			if (invoiceFiles[student.std_id]) {
				try {
					invoiceBase64 = await convertFileToBase64(invoiceFiles[student.std_id]!);
				} catch (error) {
					alert(`Failed to process invoice image for ${student.std_name}`);
					return;
				}
			}

			feeRecords.push({
				...data,
				invoice_img: invoiceBase64,
			});
		}

		if (feeRecords.length === 0) {
			alert('No valid fee records to submit');
			return;
		}

		await onSubmit(feeRecords);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4 w-full">
			{/* Filters */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-4 border-b border-gray-200">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Filter by Name</label>
					<input
						type="text"
						value={nameFilter}
						onChange={(e) => setNameFilter(e.target.value)}
						placeholder="Search by student name or code..."
						className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Filter by Class</label>
					<div className="relative">
						<input
							type="text"
							ref={classFilterInputRef}
							value={
								classFilterQuery !== '' 
									? classFilterQuery 
									: classFilter 
										? (availableClasses.find(c => c.cls_id === classFilter)?.cls_name || '')
										: 'All Classes'
							}
							onChange={(e) => {
								const value = e.target.value;
								setClassFilterQuery(value);
								setShowClassFilterDropdown(true);
								setClassFilterHighlightedIndex(-1);
								// Clear filter if user deletes all text
								if (value === '') {
									setClassFilter('');
								}
							}}
							onFocus={() => {
								setShowClassFilterDropdown(true);
							}}
							onKeyDown={(e) => {
								const totalItems = filteredClasses.length + 1; // +1 for "All Classes"
								if (e.key === 'ArrowDown') {
									e.preventDefault();
									setClassFilterHighlightedIndex((prev) => 
										Math.min(prev + 1, totalItems - 1)
									);
								} else if (e.key === 'ArrowUp') {
									e.preventDefault();
									setClassFilterHighlightedIndex((prev) => Math.max(prev - 1, -1));
								} else if (e.key === 'Enter' && classFilterHighlightedIndex >= 0) {
									e.preventDefault();
									if (classFilterHighlightedIndex === 0) {
										setClassFilter('');
										setClassFilterQuery('');
										setShowClassFilterDropdown(false);
									} else {
										const selected = filteredClasses[classFilterHighlightedIndex - 1];
										if (selected) {
											setClassFilter(selected.cls_id);
											setClassFilterQuery('');
											setShowClassFilterDropdown(false);
										}
									}
								} else if (e.key === 'Escape') {
									setShowClassFilterDropdown(false);
								}
							}}
							placeholder="Search class..."
							className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500"
						/>
						{showClassFilterDropdown && (
							<div 
								ref={classFilterDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								<button
									type="button"
									onClick={() => {
										setClassFilter('');
										setClassFilterQuery('');
										setShowClassFilterDropdown(false);
									}}
									onMouseEnter={() => setClassFilterHighlightedIndex(0)}
									className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
										0 === classFilterHighlightedIndex ? 'bg-primary-50' : ''
									} ${!classFilter ? 'bg-primary-100 font-medium' : ''}`}
								>
									<div className="text-sm font-medium text-gray-900">All Classes</div>
								</button>
								{filteredClasses.map((cls, index) => (
									<button
										key={cls.cls_id}
										type="button"
										onClick={() => {
											setClassFilter(cls.cls_id);
											setClassFilterQuery('');
											setShowClassFilterDropdown(false);
										}}
										onMouseEnter={() => setClassFilterHighlightedIndex(index + 1)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index + 1 === classFilterHighlightedIndex ? 'bg-primary-50' : ''
										} ${classFilter === cls.cls_id ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{cls.cls_name}</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Students List with Fee Inputs - All fields on one line */}
			<div className="border border-gray-200 rounded-[3px] overflow-hidden">
				<div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
					<table className="w-full min-w-[1000px]">
					<thead className="bg-gray-50 sticky top-0">
						<tr>
							<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-48">Student</th>
							<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fee Type *</th>
							<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Academic Year *</th>
							<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Term *</th>
							<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount Paid *</th>
							<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status *</th>
							<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice *</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{filteredStudents.length === 0 ? (
							<tr>
								<td colSpan={7} className="px-6 py-12 text-center">
									<div className="flex flex-col items-center gap-3">
										<UserGroupIcon className="w-12 h-12 text-gray-400" />
										<p className="text-gray-500 font-medium">No students found</p>
										<p className="text-sm text-gray-400">Try adjusting your filters</p>
									</div>
								</td>
							</tr>
						) : (
							filteredStudents.map((student) => {
							const feeData = studentFeeData[student.std_id] || {
								std_id: student.std_id,
								fee_type_id: '',
								academic_id: '',
								term: '',
								amount_paid: 0,
								status: 'pending',
								invoice_img: null,
							};

							const selectedFeeType = availableFeeTypes.find((ft) => ft.fee_type_id === feeData.fee_type_id);
							const selectedAcademicYear = availableAcademicYears.find((ay) => ay.academic_id === feeData.academic_id);
							const filteredFeeTypesForStudent = getFilteredFeeTypes(student.std_id);
							const filteredTermsForStudent = getFilteredTerms(student.std_id);
							const filteredStatusesForStudent = getFilteredStatuses(student.std_id);
							const feeTypeHighlighted = highlightedIndices[`feeType_${student.std_id}`] ?? -1;
							const termHighlighted = highlightedIndices[`term_${student.std_id}`] ?? -1;
							const statusHighlighted = highlightedIndices[`status_${student.std_id}`] ?? -1;

							return (
								<tr key={student.std_id} className="hover:bg-gray-50">
									<td className="px-3 py-2">
										<div>
											<div className="text-sm font-medium text-gray-900">{student.std_name}</div>
											{student.std_code && (
												<div className="text-xs text-gray-500">{student.std_code}</div>
											)}
											{student.current_class_name && (
												<div className="text-xs text-gray-400">{student.current_class_name}</div>
											)}
										</div>
									</td>
									<td className="px-3 py-2">
										<div className="relative">
											<input
												type="text"
												value={feeTypeSearchQueries[student.std_id] !== undefined ? feeTypeSearchQueries[student.std_id] : (selectedFeeType?.fee_type_name || '')}
												onChange={(e) => {
													setFeeTypeSearchQueries((prev) => ({ ...prev, [student.std_id]: e.target.value }));
													setActiveFeeTypeDropdown(student.std_id);
													setHighlightedIndices((prev) => ({ ...prev, [`feeType_${student.std_id}`]: -1 }));
												}}
												onFocus={() => {
													setActiveFeeTypeDropdown(student.std_id);
													if (!feeTypeSearchQueries[student.std_id] && selectedFeeType) {
														setFeeTypeSearchQueries((prev) => ({ ...prev, [student.std_id]: selectedFeeType.fee_type_name }));
													}
												}}
												onKeyDown={(e) => {
													if (e.key === 'ArrowDown') {
														e.preventDefault();
														setHighlightedIndices((prev) => ({
															...prev,
															[`feeType_${student.std_id}`]: Math.min(feeTypeHighlighted + 1, filteredFeeTypesForStudent.length - 1),
														}));
													} else if (e.key === 'ArrowUp') {
														e.preventDefault();
														setHighlightedIndices((prev) => ({
															...prev,
															[`feeType_${student.std_id}`]: Math.max(feeTypeHighlighted - 1, -1),
														}));
													} else if (e.key === 'Enter' && feeTypeHighlighted >= 0) {
														e.preventDefault();
														const selected = filteredFeeTypesForStudent[feeTypeHighlighted];
														if (selected) {
													handleStudentFeeChange(student.std_id, 'fee_type_id', selected.fee_type_id);
													setFeeTypeSearchQueries((prev) => ({ ...prev, [student.std_id]: selected.fee_type_name }));
													setActiveFeeTypeDropdown(null);
														}
													} else if (e.key === 'Escape') {
														setActiveFeeTypeDropdown(null);
													}
												}}
												placeholder="Search fee type..."
												className="w-full px-2 py-2 text-sm border border-gray-300 rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500"
												required
											/>
											{activeFeeTypeDropdown === student.std_id && filteredFeeTypesForStudent.length > 0 && (
												<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-40 overflow-auto">
													{filteredFeeTypesForStudent.map((feeType, index) => (
														<button
															key={feeType.fee_type_id}
															type="button"
															onClick={() => {
																handleStudentFeeChange(student.std_id, 'fee_type_id', feeType.fee_type_id);
																setFeeTypeSearchQueries((prev) => ({ ...prev, [student.std_id]: feeType.fee_type_name }));
																setActiveFeeTypeDropdown(null);
															}}
															onMouseEnter={() => setHighlightedIndices((prev) => ({ ...prev, [`feeType_${student.std_id}`]: index }))}
															className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
																index === feeTypeHighlighted ? 'bg-primary-50' : ''
															} ${feeData.fee_type_id === feeType.fee_type_id ? 'bg-primary-100 font-medium' : ''}`}
														>
															<div className="font-medium text-gray-900">{feeType.fee_type_name}</div>
															<div className="text-xs text-gray-500">${feeType.amount_to_pay.toFixed(2)}</div>
														</button>
													))}
												</div>
											)}
										</div>
									</td>
									<td className="px-3 py-2">
										<div className="relative">
											<input
												type="text"
												value={selectedAcademicYear?.academic_name || ''}
												readOnly
												disabled={!selectedAcademicYear}
												placeholder={selectedAcademicYear ? selectedAcademicYear.academic_name : "No current academic year"}
												className="w-full px-2 py-2 text-sm border border-gray-300 rounded-[3px] bg-gray-50 text-gray-700 cursor-not-allowed"
												required
											/>
											{!selectedAcademicYear && (
												<div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-[3px]">
													<span className="text-xs text-gray-500">No current year</span>
												</div>
											)}
										</div>
									</td>
									<td className="px-3 py-2">
										<div className="relative">
											<input
												type="text"
												value={termSearchQueries[student.std_id] !== undefined ? termSearchQueries[student.std_id] : (feeData.term || '')}
												onChange={(e) => {
													setTermSearchQueries((prev) => ({ ...prev, [student.std_id]: e.target.value }));
													setActiveTermDropdown(student.std_id);
													setHighlightedIndices((prev) => ({ ...prev, [`term_${student.std_id}`]: -1 }));
												}}
												onFocus={() => {
													setActiveTermDropdown(student.std_id);
													if (!termSearchQueries[student.std_id] && feeData.term) {
														setTermSearchQueries((prev) => ({ ...prev, [student.std_id]: feeData.term }));
													}
												}}
												onKeyDown={(e) => {
													if (e.key === 'ArrowDown') {
														e.preventDefault();
														setHighlightedIndices((prev) => ({
															...prev,
															[`term_${student.std_id}`]: Math.min(termHighlighted + 1, filteredTermsForStudent.length - 1),
														}));
													} else if (e.key === 'ArrowUp') {
														e.preventDefault();
														setHighlightedIndices((prev) => ({
															...prev,
															[`term_${student.std_id}`]: Math.max(termHighlighted - 1, -1),
														}));
													} else if (e.key === 'Enter' && termHighlighted >= 0) {
														e.preventDefault();
														const selected = filteredTermsForStudent[termHighlighted];
														if (selected) {
															handleStudentFeeChange(student.std_id, 'term', selected);
															setTermSearchQueries((prev) => ({ ...prev, [student.std_id]: selected }));
															setActiveTermDropdown(null);
														}
													} else if (e.key === 'Escape') {
														setActiveTermDropdown(null);
													}
												}}
												placeholder="Select term..."
												className="w-full px-2 py-2 text-sm border border-gray-300 rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500"
												required
											/>
											{activeTermDropdown === student.std_id && filteredTermsForStudent.length > 0 && (
												<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-40 overflow-auto">
													{filteredTermsForStudent.map((term, index) => (
														<button
															key={term}
															type="button"
															onClick={() => {
																handleStudentFeeChange(student.std_id, 'term', term);
																setTermSearchQueries((prev) => ({ ...prev, [student.std_id]: term }));
																setActiveTermDropdown(null);
															}}
															onMouseEnter={() => setHighlightedIndices((prev) => ({ ...prev, [`term_${student.std_id}`]: index }))}
															className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
																index === termHighlighted ? 'bg-primary-50' : ''
															} ${feeData.term === term ? 'bg-primary-100 font-medium' : ''}`}
														>
															<div className="font-medium text-gray-900">{term}</div>
														</button>
													))}
												</div>
											)}
										</div>
									</td>
									<td className="px-3 py-2">
										<input
											type="number"
											step="0.01"
											min="0"
											value={feeData.amount_paid || 0}
											onChange={(e) => handleStudentFeeChange(student.std_id, 'amount_paid', parseFloat(e.target.value) || 0)}
											className="w-full px-2 py-2 text-sm border border-gray-300 rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500"
											placeholder="Enter amount paid"
											required
										/>
									</td>
									<td className="px-3 py-2">
										<div className="relative">
											<input
												type="text"
												value={statusSearchQueries[student.std_id] !== undefined ? statusSearchQueries[student.std_id] : (feeData.status || '')}
												onChange={(e) => {
													setStatusSearchQueries((prev) => ({ ...prev, [student.std_id]: e.target.value }));
													setActiveStatusDropdown(student.std_id);
													setHighlightedIndices((prev) => ({ ...prev, [`status_${student.std_id}`]: -1 }));
												}}
												onFocus={() => {
													setActiveStatusDropdown(student.std_id);
													if (!statusSearchQueries[student.std_id] && feeData.status) {
														setStatusSearchQueries((prev) => ({ ...prev, [student.std_id]: feeData.status }));
													}
												}}
												onKeyDown={(e) => {
													if (e.key === 'ArrowDown') {
														e.preventDefault();
														setHighlightedIndices((prev) => ({
															...prev,
															[`status_${student.std_id}`]: Math.min(statusHighlighted + 1, filteredStatusesForStudent.length - 1),
														}));
													} else if (e.key === 'ArrowUp') {
														e.preventDefault();
														setHighlightedIndices((prev) => ({
															...prev,
															[`status_${student.std_id}`]: Math.max(statusHighlighted - 1, -1),
														}));
													} else if (e.key === 'Enter' && statusHighlighted >= 0) {
														e.preventDefault();
														const selected = filteredStatusesForStudent[statusHighlighted];
														if (selected) {
															handleStudentFeeChange(student.std_id, 'status', selected);
															setStatusSearchQueries((prev) => ({ ...prev, [student.std_id]: selected }));
															setActiveStatusDropdown(null);
														}
													} else if (e.key === 'Escape') {
														setActiveStatusDropdown(null);
													}
												}}
												placeholder="Select status..."
												className="w-full px-2 py-2 text-sm border border-gray-300 rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500"
												required
											/>
											{activeStatusDropdown === student.std_id && filteredStatusesForStudent.length > 0 && (
												<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-40 overflow-auto">
													{filteredStatusesForStudent.map((status, index) => (
														<button
															key={status}
															type="button"
															onClick={() => {
																handleStudentFeeChange(student.std_id, 'status', status);
																setStatusSearchQueries((prev) => ({ ...prev, [student.std_id]: status }));
																setActiveStatusDropdown(null);
															}}
															onMouseEnter={() => setHighlightedIndices((prev) => ({ ...prev, [`status_${student.std_id}`]: index }))}
															className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors capitalize ${
																index === statusHighlighted ? 'bg-primary-50' : ''
															} ${feeData.status === status ? 'bg-primary-100 font-medium' : ''}`}
														>
															<div className="font-medium text-gray-900">{status}</div>
														</button>
													))}
												</div>
											)}
										</div>
									</td>
									<td className="px-3 py-2">
										<div className="flex flex-col items-center gap-2">
											{invoicePreviews[student.std_id] ? (
												<div className="relative">
													<img
														src={invoicePreviews[student.std_id]}
														alt="Invoice preview"
														className="w-16 h-16 object-cover border border-gray-300 rounded-[3px]"
													/>
													<button
														type="button"
														onClick={() => handleInvoiceFileChange(student.std_id, null)}
														className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
													>
														×
													</button>
												</div>
											) : (
												<label className="cursor-pointer">
													<div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-[3px] flex flex-col items-center justify-center hover:border-primary-500 transition-colors">
														<PhotoIcon className="w-6 h-6 text-gray-400" />
														<span className="text-[10px] text-gray-500 mt-1">Invoice</span>
													</div>
													<input
														type="file"
														accept="image/*"
														onChange={(e) => {
															const file = e.target.files?.[0] || null;
															handleInvoiceFileChange(student.std_id, file);
														}}
														className="hidden"
													/>
												</label>
											)}
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
					disabled={loading || filteredStudents.length === 0}
					className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-[3px] hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Creating...' : `Create Fees (${filteredStudents.length} students)`}
				</button>
			</div>
		</form>
	);
}


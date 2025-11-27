import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../../services/api';
import { getArrayFromResponse } from '../../../utils/apiHelpers';

interface ExamMarkItem {
	exam_mark_id?: string;
	school_id: string;
	std_id: string;
	subj_id: string;
	cls_id: string;
	academic_id: string;
	term: string;
	exam_mark: number;
	exam_avg_mark?: number | null;
	status?: string | null;
	is_published?: boolean;
}

interface StudentOption {
	std_id: string;
	std_name: string;
	std_code?: string | null;
}

interface ExamMarkFormData {
	school_id: string;
	std_id: string;
	subj_id: string;
	cls_id: string;
	academic_id: string;
	term: string;
	exam_mark: number | string;
	exam_avg_mark?: number | string | null;
	status?: string | null;
	is_published?: boolean;
}

interface ExamMarksFormProps {
	testMark?: ExamMarkItem | null;
	onSubmit: (data: Partial<ExamMarkItem> | Partial<ExamMarkItem>[]) => void;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
	schoolId: string;
	preselectedClassId?: string;
	preselectedSubjectId?: string;
	preselectedAcademicYearId?: string;
	preselectedStudents?: any[];
}

const TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3', 'First Term', 'Second Term', 'Third Term'];
const STATUS_OPTIONS = ['Pass', 'Fail', 'Excellent', 'Good', 'Fair', 'Poor'];

export default function ExamMarksForm({
	testMark,
	onSubmit,
	onCancel,
	loading = false,
	mode,
	schoolId,
	preselectedClassId,
	preselectedSubjectId,
	preselectedAcademicYearId,
	preselectedStudents = [],
}: ExamMarksFormProps) {
	const isBulkMode = mode === 'create' && preselectedClassId && preselectedSubjectId && preselectedAcademicYearId && preselectedStudents.length > 0;
	
	// Bulk marks state
	const [bulkMarks, setBulkMarks] = useState<Record<string, { exam_mark: string; exam_avg_mark: string; status: string; term: string }>>({});
	const [formData, setFormData] = useState<Partial<ExamMarkFormData>>({
		school_id: schoolId,
		std_id: '',
		subj_id: '',
		cls_id: '',
		academic_id: '',
		term: '',
		exam_mark: '',
		exam_avg_mark: null,
		status: null,
		is_published: false,
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	// Available options
	const [availableClasses, setAvailableClasses] = useState<any[]>([]);
	const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
	const [availableAcademicYears, setAvailableAcademicYears] = useState<any[]>([]);

	// Autocomplete states for Term
	const [termSearchQuery, setTermSearchQuery] = useState('');
	const [showTermDropdown, setShowTermDropdown] = useState(false);
	const [termHighlightedIndex, setTermHighlightedIndex] = useState(-1);
	const termDropdownRef = useRef<HTMLDivElement>(null);
	const termInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for Status (bulk mode)
	const [statusSearchQueries, setStatusSearchQueries] = useState<Record<string, string>>({});
	const [showStatusDropdowns, setShowStatusDropdowns] = useState<Record<string, boolean>>({});
	const [statusHighlightedIndices, setStatusHighlightedIndices] = useState<Record<string, number>>({});
	const statusDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const statusInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

	// Autocomplete states for Term (single mode)
	const [singleTermSearchQuery, setSingleTermSearchQuery] = useState('');
	const [showSingleTermDropdown, setShowSingleTermDropdown] = useState(false);
	const [singleTermHighlightedIndex, setSingleTermHighlightedIndex] = useState(-1);
	const singleTermDropdownRef = useRef<HTMLDivElement>(null);
	const singleTermInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for Status (single mode)
	const [singleStatusSearchQuery, setSingleStatusSearchQuery] = useState('');
	const [showSingleStatusDropdown, setShowSingleStatusDropdown] = useState(false);
	const [singleStatusHighlightedIndex, setSingleStatusHighlightedIndex] = useState(-1);
	const singleStatusDropdownRef = useRef<HTMLDivElement>(null);
	const singleStatusInputRef = useRef<HTMLInputElement>(null);

	// Filter term options
	const filteredTermOptions = TERM_OPTIONS.filter((term) => {
		if (!singleTermSearchQuery.trim()) return true;
		return term.toLowerCase().includes(singleTermSearchQuery.toLowerCase());
	});

	// Filter status options
	const filteredStatusOptions = STATUS_OPTIONS.filter((status) => {
		if (!singleStatusSearchQuery.trim()) return true;
		return status.toLowerCase().includes(singleStatusSearchQuery.toLowerCase());
	});

	// Initialize bulk marks when preselected students are provided
	useEffect(() => {
		if (isBulkMode && preselectedStudents.length > 0) {
			const initialBulk: Record<string, { exam_mark: string; exam_avg_mark: string; status: string; term: string }> = {};
			preselectedStudents.forEach((student) => {
				initialBulk[student.std_id] = {
					exam_mark: '',
					exam_avg_mark: '',
					status: '',
					term: 'Term 1',
				};
			});
			setBulkMarks(initialBulk);
			
			// Set form data with preselected values
			setFormData({
				school_id: schoolId,
				std_id: '',
				subj_id: preselectedSubjectId || '',
				cls_id: preselectedClassId || '',
				academic_id: preselectedAcademicYearId || '',
				term: 'Term 1',
				exam_mark: '',
				exam_avg_mark: null,
				status: null,
				is_published: false,
			});
		}
	}, [isBulkMode, preselectedStudents, preselectedSubjectId, preselectedClassId, preselectedAcademicYearId, schoolId]);

	// Fetch options for display (both edit and bulk mode)
	useEffect(() => {
		const fetchOptions = async () => {
			if (!schoolId) return;

			try {
				const timestamp = new Date().getTime();

				// Fetch classes
				const classesResponse = await api.get(`/classes/?school_id=${schoolId}&_t=${timestamp}`);
				const classes = getArrayFromResponse(classesResponse.data).map((c: any) => ({
					cls_id: c.cls_id,
					cls_name: c.cls_name,
					cls_type: c.cls_type,
				}));
				setAvailableClasses(classes);

				// Fetch subjects
				const subjectsResponse = await api.get(`/subjects/?school_id=${schoolId}&_t=${timestamp}`);
				const subjects = getArrayFromResponse(subjectsResponse.data).map((s: any) => ({
					subj_id: s.subj_id,
					subj_name: s.subj_name,
				}));
				setAvailableSubjects(subjects);

				// Fetch academic years
				const academicYearsResponse = await api.get(`/academic-years/?school_id=${schoolId}&_t=${timestamp}`);
				const academicYears = getArrayFromResponse(academicYearsResponse.data).map((ay: any) => ({
					academic_id: ay.academic_id, // Keep original format
					academic_name: ay.academic_name,
				}));
				setAvailableAcademicYears(academicYears);
			} catch (error: any) {}
		};

		fetchOptions();
	}, [schoolId]);

	// Fetch academic years when preselectedAcademicYearId is provided (for bulk mode display)
	useEffect(() => {
		const fetchAcademicYears = async () => {
			if (!schoolId || !preselectedAcademicYearId || !isBulkMode) return;
			
			// Always fetch to ensure we have the latest data
			try {
				const timestamp = new Date().getTime();
				const academicYearsResponse = await api.get(`/academic-years/?school_id=${schoolId}&_t=${timestamp}`);
				const academicYears = getArrayFromResponse(academicYearsResponse.data).map((ay: any) => ({
					academic_id: ay.academic_id, // Keep original format
					academic_name: ay.academic_name,
				}));
				setAvailableAcademicYears(academicYears);
			} catch (error: any) {}
		};

		fetchAcademicYears();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [preselectedAcademicYearId, schoolId, isBulkMode]);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;

			// Term dropdown (bulk mode)
			if (
				termDropdownRef.current &&
				!termDropdownRef.current.contains(target) &&
				termInputRef.current &&
				!termInputRef.current.contains(target)
			) {
				setShowTermDropdown(false);
			}

			// Status and Term dropdowns for each student (bulk mode)
			Object.keys(showStatusDropdowns).forEach((key) => {
				const dropdownRef = statusDropdownRefs.current[key];
				const inputRef = statusInputRefs.current[key];
				if (
					dropdownRef &&
					!dropdownRef.contains(target) &&
					inputRef &&
					!inputRef.contains(target)
				) {
					setShowStatusDropdowns((prev) => ({ ...prev, [key]: false }));
				}
			});

			// Term dropdown (single mode)
			if (
				singleTermDropdownRef.current &&
				!singleTermDropdownRef.current.contains(target) &&
				singleTermInputRef.current &&
				!singleTermInputRef.current.contains(target)
			) {
				setShowSingleTermDropdown(false);
			}

			// Status dropdown (single mode)
			if (
				singleStatusDropdownRef.current &&
				!singleStatusDropdownRef.current.contains(target) &&
				singleStatusInputRef.current &&
				!singleStatusInputRef.current.contains(target)
			) {
				setShowSingleStatusDropdown(false);
			}
		};

		if (showTermDropdown || Object.values(showStatusDropdowns).some((v) => v) || showSingleTermDropdown || showSingleStatusDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showTermDropdown, showStatusDropdowns, showSingleTermDropdown, showSingleStatusDropdown]);

	// Set form data when editing
	useEffect(() => {
		if (isBulkMode) return;
		
		if (testMark && mode === 'edit') {
			setFormData({
				school_id: schoolId,
				std_id: testMark.std_id || '',
				subj_id: testMark.subj_id || '',
				cls_id: testMark.cls_id || '',
				academic_id: testMark.academic_id || '',
				term: testMark.term || '',
				exam_mark: testMark.exam_mark || '',
				exam_avg_mark: testMark.exam_avg_mark || null,
				status: testMark.status || null,
				is_published: testMark.is_published || false,
			});
			// Initialize search queries for autocomplete
			setSingleTermSearchQuery(testMark.term || '');
			setSingleStatusSearchQuery(testMark.status || '');
		} else if (!isBulkMode) {
			setFormData({
				school_id: schoolId,
				std_id: '',
				subj_id: '',
				cls_id: '',
				academic_id: '',
				term: '',
				exam_mark: '',
				exam_avg_mark: null,
				status: null,
				is_published: false,
			});
			setSingleTermSearchQuery('');
			setSingleStatusSearchQuery('');
		}
	}, [testMark, mode, schoolId, isBulkMode]);

	const handleBulkMarkChange = (studentId: string, field: 'exam_mark' | 'exam_avg_mark' | 'status' | 'term', value: string) => {
		setBulkMarks((prev) => ({
			...prev,
			[studentId]: {
				...prev[studentId],
				[field]: value,
			},
		}));
	};

	const handleBulkTermChangeAll = (term: string) => {
		const updated: Record<string, { exam_mark: string; exam_avg_mark: string; status: string; term: string }> = {};
		Object.keys(bulkMarks).forEach((studentId) => {
			updated[studentId] = {
				...bulkMarks[studentId],
				term,
			};
		});
		setBulkMarks(updated);
		setFormData((prev) => ({ ...prev, term }));
	};

	const handleChange = (field: keyof ExamMarkFormData, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	const validate = () => {
		const newErrors: Record<string, string> = {};

		if (!formData.std_id?.trim()) {
			newErrors.std_id = 'Student is required';
		}

		if (!formData.subj_id?.trim()) {
			newErrors.subj_id = 'Subject is required';
		}

		if (!formData.cls_id?.trim()) {
			newErrors.cls_id = 'Class is required';
		}

		if (!formData.academic_id?.trim()) {
			newErrors.academic_id = 'Academic Year is required';
		}

		if (!formData.term?.trim()) {
			newErrors.term = 'Term is required';
		}

		if (formData.exam_mark === '' || formData.exam_mark === null || formData.exam_mark === undefined) {
			newErrors.exam_mark = 'Exam Mark is required';
		} else if (Number(formData.exam_mark) < 0 || Number(formData.exam_mark) > 100) {
			newErrors.exam_mark = 'Exam Mark must be between 0 and 100';
		}

		if (formData.exam_avg_mark === '' || formData.exam_avg_mark === null || formData.exam_avg_mark === undefined) {
			newErrors.exam_avg_mark = 'Average Mark is required';
		} else if (Number(formData.exam_avg_mark) < 0 || Number(formData.exam_avg_mark) > 100) {
			newErrors.exam_avg_mark = 'Average Mark must be between 0 and 100';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (isBulkMode) {
			// Bulk submission
			const bulkData: Partial<ExamMarkItem>[] = preselectedStudents.map((student) => {
				const markData = bulkMarks[student.std_id];
				const testMark = markData?.exam_mark ? Number(markData.exam_mark) : 0;
				const testAvgMark = markData?.exam_avg_mark ? Number(markData.exam_avg_mark) : null;

				return {
					school_id: schoolId,
					std_id: student.std_id,
					subj_id: preselectedSubjectId || '',
					cls_id: preselectedClassId || '',
					academic_id: preselectedAcademicYearId || '',
					term: markData?.term || formData.term || 'Term 1',
					exam_mark: testMark,
					exam_avg_mark: testAvgMark,
					status: markData?.status || null,
					is_published: false,
				};
			}).filter((item) => item.exam_mark > 0 && item.exam_avg_mark !== null && item.exam_avg_mark !== undefined); // Only include records with marks and avg marks

			if (bulkData.length === 0) {
				setErrors({ bulk: 'Please enter at least one exam mark' });
				return;
			}

			onSubmit(bulkData);
		} else {
			// Single submission
			if (!validate()) {
				return;
			}

			const submitData: Partial<ExamMarkItem> = {
				school_id: schoolId,
				std_id: formData.std_id || '',
				subj_id: formData.subj_id || '',
				cls_id: formData.cls_id || '',
				academic_id: formData.academic_id || '',
				term: formData.term || '',
				exam_mark: Number(formData.exam_mark) || 0,
				exam_avg_mark: formData.exam_avg_mark ? Number(formData.exam_avg_mark) : null,
				status: formData.status || null,
				is_published: formData.is_published || false,
			};

			onSubmit(submitData);
		}
	};

	// Get selected options for display (use useMemo to recalculate when data changes)
	const selectedClassDisplay = useMemo(() => 
		availableClasses.find((c) => c.cls_id === preselectedClassId),
		[availableClasses, preselectedClassId]
	);
	
	const selectedSubjectDisplay = useMemo(() => 
		availableSubjects.find((s) => s.subj_id === preselectedSubjectId),
		[availableSubjects, preselectedSubjectId]
	);
	
	const selectedAcademicYearDisplay = useMemo(() => {
		if (!preselectedAcademicYearId || availableAcademicYears.length === 0) {
			return null;
		}
		return availableAcademicYears.find((ay) => {
			// Compare IDs as strings (handle UUID format differences)
			const ayId = String(ay.academic_id || '').trim();
			const preselectedId = String(preselectedAcademicYearId || '').trim();
			return ayId === preselectedId || ayId.toLowerCase() === preselectedId.toLowerCase();
		});
	}, [availableAcademicYears, preselectedAcademicYearId]);

	if (isBulkMode) {
		return (
			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Summary Info */}
				<div className="bg-gray-50 rounded-[3px] p-4 space-y-2">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
						<div>
							<span className="text-gray-600">Class:</span>
							<span className="ml-2 font-medium text-gray-900">{selectedClassDisplay?.cls_name || 'N/A'}</span>
						</div>
						<div>
							<span className="text-gray-600">Subject:</span>
							<span className="ml-2 font-medium text-gray-900">{selectedSubjectDisplay?.subj_name || 'N/A'}</span>
						</div>
						<div>
							<span className="text-gray-600">Academic Year:</span>
							<span className="ml-2 font-medium text-gray-900">
								{selectedAcademicYearDisplay?.academic_name || 
								 (preselectedAcademicYearId && availableAcademicYears.length === 0 ? 'Loading...' : 
								  preselectedAcademicYearId ? `Not found (${preselectedAcademicYearId.substring(0, 8)}...)` : 'N/A')}
							</span>
						</div>
						<div>
							<span className="text-gray-600">Students:</span>
							<span className="ml-2 font-medium text-gray-900">{preselectedStudents.length}</span>
						</div>
					</div>
				</div>

				{/* Set Term for All */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Set Term for All</label>
					<div className="relative">
						<input
							ref={termInputRef}
							type="text"
							value={formData.term || termSearchQuery}
							onChange={(e) => {
								setTermSearchQuery(e.target.value);
								setShowTermDropdown(true);
								setTermHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowTermDropdown(false);
									handleBulkTermChangeAll('');
								}
							}}
							onFocus={() => {
								if (TERM_OPTIONS.length > 0) {
									setShowTermDropdown(true);
								}
								setTermSearchQuery('');
							}}
							placeholder="Select term"
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
							disabled={loading}
						/>
						{showTermDropdown && TERM_OPTIONS.length > 0 && (
							<div
								ref={termDropdownRef}
								className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
								style={{ top: '100%' }}
							>
								<div className="flex flex-col">
									{TERM_OPTIONS.filter((term) => {
										if (!termSearchQuery.trim()) return true;
										return term.toLowerCase().includes(termSearchQuery.toLowerCase());
									}).map((term, index) => (
										<button
											key={term}
											type="button"
											onClick={() => {
												handleBulkTermChangeAll(term);
												setTermSearchQuery(term);
												setShowTermDropdown(false);
											}}
											onMouseEnter={() => setTermHighlightedIndex(index)}
											className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors block ${
												index === termHighlightedIndex ? 'bg-primary-50' : ''
											} ${formData.term === term ? 'bg-primary-100 font-medium' : ''}`}
										>
											<div className="text-sm font-medium text-gray-900">{term}</div>
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				</div>

				{errors.bulk && (
					<div className="bg-red-50 border border-red-200 rounded-[3px] p-3">
						<p className="text-sm text-red-600">{errors.bulk}</p>
					</div>
				)}

				{/* Students List */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-3">Enter Exam Marks for Students</label>
					<div className="border border-gray-300 rounded-[3px] overflow-hidden">
						<div className="max-h-96 overflow-y-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50 sticky top-0 z-10">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Mark</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Mark</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{preselectedStudents.map((student) => {
										const markData = bulkMarks[student.std_id] || { exam_mark: '', exam_avg_mark: '', status: '', term: formData.term || 'Term 1' };
										return (
											<tr key={student.std_id} className="hover:bg-gray-50">
												<td className="px-4 py-3 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">{student.std_name}</div>
													{student.std_code && (
														<div className="text-xs text-gray-500">Code: {student.std_code}</div>
													)}
												</td>
												<td className="px-4 py-3 whitespace-nowrap">
													<div className="relative">
														<input
															ref={(el) => {
																if (el) statusInputRefs.current[`term_${student.std_id}`] = el;
															}}
															type="text"
															value={markData.term || statusSearchQueries[`term_${student.std_id}`] || ''}
															onChange={(e) => {
																setStatusSearchQueries((prev) => ({ ...prev, [`term_${student.std_id}`]: e.target.value }));
																setShowStatusDropdowns((prev) => ({ ...prev, [`term_${student.std_id}`]: true }));
																if (!e.target.value.trim()) {
																	setShowStatusDropdowns((prev) => ({ ...prev, [`term_${student.std_id}`]: false }));
																	handleBulkMarkChange(student.std_id, 'term', '');
																}
															}}
															onFocus={() => {
																setShowStatusDropdowns((prev) => ({ ...prev, [`term_${student.std_id}`]: true }));
																setStatusSearchQueries((prev) => ({ ...prev, [`term_${student.std_id}`]: '' }));
															}}
															placeholder="Select term"
															className="px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none w-32"
															disabled={loading}
														/>
														{showStatusDropdowns[`term_${student.std_id}`] && (
															<div
																ref={(el) => {
																	if (el) statusDropdownRefs.current[`term_${student.std_id}`] = el;
																}}
																className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
																style={{ top: '100%' }}
															>
																<div className="flex flex-col">
																	{TERM_OPTIONS.filter((term) => {
																		const query = statusSearchQueries[`term_${student.std_id}`] || '';
																		if (!query.trim()) return true;
																		return term.toLowerCase().includes(query.toLowerCase());
																	}).map((term, index) => (
																		<button
																			key={term}
																			type="button"
																			onClick={() => {
																				handleBulkMarkChange(student.std_id, 'term', term);
																				setStatusSearchQueries((prev) => ({ ...prev, [`term_${student.std_id}`]: term }));
																				setShowStatusDropdowns((prev) => ({ ...prev, [`term_${student.std_id}`]: false }));
																			}}
																			onMouseEnter={() => setStatusHighlightedIndices((prev) => ({ ...prev, [`term_${student.std_id}`]: index }))}
																			className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors block ${
																				statusHighlightedIndices[`term_${student.std_id}`] === index ? 'bg-primary-50' : ''
																			} ${markData.term === term ? 'bg-primary-100 font-medium' : ''}`}
																		>
																			<div className="text-sm font-medium text-gray-900">{term}</div>
																		</button>
																	))}
																</div>
															</div>
														)}
													</div>
												</td>
												<td className="px-4 py-3 whitespace-nowrap">
													<input
														type="number"
														min="0"
														max="100"
														step="0.01"
														value={markData.exam_mark}
														onChange={(e) => handleBulkMarkChange(student.std_id, 'exam_mark', e.target.value)}
														placeholder="0-100"
														className="px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none w-24"
														disabled={loading}
													/>
												</td>
												<td className="px-4 py-3 whitespace-nowrap">
													<input
														type="number"
														min="0"
														max="100"
														step="0.01"
														value={markData.exam_avg_mark}
														onChange={(e) => handleBulkMarkChange(student.std_id, 'exam_avg_mark', e.target.value)}
														placeholder="Required"
														className="px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none w-24"
														disabled={loading}
														required
													/>
												</td>
												<td className="px-4 py-3 whitespace-nowrap">
													<div className="relative">
														<input
															ref={(el) => {
																if (el) statusInputRefs.current[`status_${student.std_id}`] = el;
															}}
															type="text"
															value={markData.status || statusSearchQueries[`status_${student.std_id}`] || ''}
															onChange={(e) => {
																setStatusSearchQueries((prev) => ({ ...prev, [`status_${student.std_id}`]: e.target.value }));
																setShowStatusDropdowns((prev) => ({ ...prev, [`status_${student.std_id}`]: true }));
																if (!e.target.value.trim()) {
																	setShowStatusDropdowns((prev) => ({ ...prev, [`status_${student.std_id}`]: false }));
																	handleBulkMarkChange(student.std_id, 'status', '');
																}
															}}
															onFocus={() => {
																setShowStatusDropdowns((prev) => ({ ...prev, [`status_${student.std_id}`]: true }));
																setStatusSearchQueries((prev) => ({ ...prev, [`status_${student.std_id}`]: '' }));
															}}
															placeholder="Select status"
															className="px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none w-32"
															disabled={loading}
														/>
														{showStatusDropdowns[`status_${student.std_id}`] && (
															<div
																ref={(el) => {
																	if (el) statusDropdownRefs.current[`status_${student.std_id}`] = el;
																}}
																className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
																style={{ top: '100%' }}
															>
																<div className="flex flex-col">
																	{STATUS_OPTIONS.filter((status) => {
																		const query = statusSearchQueries[`status_${student.std_id}`] || '';
																		if (!query.trim()) return true;
																		return status.toLowerCase().includes(query.toLowerCase());
																	}).map((status, index) => (
																		<button
																			key={status}
																			type="button"
																			onClick={() => {
																				handleBulkMarkChange(student.std_id, 'status', status);
																				setStatusSearchQueries((prev) => ({ ...prev, [`status_${student.std_id}`]: status }));
																				setShowStatusDropdowns((prev) => ({ ...prev, [`status_${student.std_id}`]: false }));
																			}}
																			onMouseEnter={() => setStatusHighlightedIndices((prev) => ({ ...prev, [`status_${student.std_id}`]: index }))}
																			className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors block ${
																				statusHighlightedIndices[`status_${student.std_id}`] === index ? 'bg-primary-50' : ''
																			} ${markData.status === status ? 'bg-primary-100 font-medium' : ''}`}
																		>
																			<div className="text-sm font-medium text-gray-900">{status}</div>
																		</button>
																	))}
																</div>
															</div>
														)}
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
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
						{loading ? 'Saving...' : 'Save Exam Marks'}
					</button>
				</div>
			</form>
		);
	}

	// Single mode form (for edit or manual create)
	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Exam Mark <span className="text-red-500">*</span>
					</label>
					<input
						type="number"
						min="0"
						max="100"
						step="0.01"
						value={formData.exam_mark || ''}
						onChange={(e) => handleChange('exam_mark', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.exam_mark ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter exam mark (0-100)"
						disabled={loading}
					/>
					{errors.exam_mark && <p className="mt-1 text-sm text-red-600">{errors.exam_mark}</p>}
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Average Mark <span className="text-red-500">*</span>
					</label>
					<input
						type="number"
						min="0"
						max="100"
						step="0.01"
						value={formData.exam_avg_mark || ''}
						onChange={(e) => handleChange('exam_avg_mark', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.exam_avg_mark ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter average mark (0-100)"
						disabled={loading}
						required
					/>
					{errors.exam_avg_mark && <p className="mt-1 text-sm text-red-600">{errors.exam_avg_mark}</p>}
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Term <span className="text-red-500">*</span>
					</label>
					<div className="relative">
						<input
							ref={singleTermInputRef}
							type="text"
							value={formData.term || singleTermSearchQuery}
							onChange={(e) => {
								setSingleTermSearchQuery(e.target.value);
								setShowSingleTermDropdown(true);
								setSingleTermHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowSingleTermDropdown(false);
									handleChange('term', '');
								}
							}}
							onFocus={() => {
								if (filteredTermOptions.length > 0) {
									setShowSingleTermDropdown(true);
								}
								setSingleTermSearchQuery('');
							}}
							className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
								errors.term ? 'border-red-500' : 'border-gray-300'
							}`}
							placeholder="Select term"
							disabled={loading}
						/>
						{showSingleTermDropdown && filteredTermOptions.length > 0 && (
							<div
								ref={singleTermDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								<div className="flex flex-col">
									{filteredTermOptions.map((term, index) => (
										<button
											key={term}
											type="button"
											onClick={() => {
												handleChange('term', term);
												setSingleTermSearchQuery(term);
												setShowSingleTermDropdown(false);
											}}
											onMouseEnter={() => setSingleTermHighlightedIndex(index)}
											className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm block ${
												index === singleTermHighlightedIndex ? 'bg-primary-50' : ''
											} ${formData.term === term ? 'bg-primary-100 font-medium' : ''}`}
										>
											{term}
										</button>
									))}
								</div>
							</div>
						)}
					</div>
					{errors.term && <p className="mt-1 text-sm text-red-600">{errors.term}</p>}
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
					<div className="relative">
						<input
							ref={singleStatusInputRef}
							type="text"
							value={formData.status || singleStatusSearchQuery}
							onChange={(e) => {
								setSingleStatusSearchQuery(e.target.value);
								setShowSingleStatusDropdown(true);
								setSingleStatusHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowSingleStatusDropdown(false);
									handleChange('status', '');
								}
							}}
							onFocus={() => {
								if (filteredStatusOptions.length > 0) {
									setShowSingleStatusDropdown(true);
								}
								setSingleStatusSearchQuery('');
							}}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
							placeholder="Select status"
							disabled={loading}
						/>
						{showSingleStatusDropdown && filteredStatusOptions.length > 0 && (
							<div
								ref={singleStatusDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								<div className="flex flex-col">
									{filteredStatusOptions.map((status, index) => (
										<button
											key={status}
											type="button"
											onClick={() => {
												handleChange('status', status);
												setSingleStatusSearchQuery(status);
												setShowSingleStatusDropdown(false);
											}}
											onMouseEnter={() => setSingleStatusHighlightedIndex(index)}
											className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm block ${
												index === singleStatusHighlightedIndex ? 'bg-primary-50' : ''
											} ${formData.status === status ? 'bg-primary-100 font-medium' : ''}`}
										>
											{status}
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

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


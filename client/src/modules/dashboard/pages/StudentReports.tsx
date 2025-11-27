import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import {
	DocumentTextIcon,
	MagnifyingGlassIcon,
	FunnelIcon,
	XMarkIcon,
	PrinterIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';

interface School {
	school_id: string;
	school_name: string;
	contact?: string;
	email?: string;
}

interface AcademicYear {
	academic_id: string;
	academic_name: string;
}

interface Class {
	cls_id: string;
	cls_name: string;
}

interface SubjectMark {
	subject_id: string;
	subject_name: string;
	terms: Array<{
		term: string;
		test_cat: number | null;
		test_ex: number | null;
		test_total: number | null;
		test_is_published: boolean;
		exam_cat: number | null;
		exam_ex: number | null;
		exam_total: number | null;
		exam_is_published: boolean;
	}>;
}

interface StudentReport {
	student_id: string;
	student_name: string;
	student_code: string | null;
	class_id: string | null;
	class_name: string | null;
	class_type: string | null;
	subjects: SubjectMark[];
	position?: number;
	term1Position?: number;
	term2Position?: number;
	term3Position?: number;
	percentage?: number;
	term1Percentage?: number;
	term2Percentage?: number;
	term3Percentage?: number;
	generalPercentage?: number;
	termPosition?: number;
	term1Total?: number;
	term2Total?: number;
	term3Total?: number;
	generalTotal?: number;
}

interface ReportData {
	academic_year: {
		id: string;
		name: string;
	};
	school_id: string;
	school_name: string | null;
	class_id: string | null;
	students: StudentReport[];
}

export default function StudentReports() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [reportData, setReportData] = useState<ReportData | null>(null);
	const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

	// Filter states
	const [filters, setFilters] = useState({
		school_id: searchParams.get('school_id') || '',
		academic_id: searchParams.get('academic_id') || '',
		cls_id: searchParams.get('cls_id') || '',
		student_name: '', // Optional student name filter
	});

	const [classes, setClasses] = useState<Class[]>([]);

	// Autocomplete states for academic year
	const [academicYearQuery, setAcademicYearQuery] = useState('');
	const [showAcademicYearDropdown, setShowAcademicYearDropdown] = useState(false);
	const [academicYearHighlightedIndex, setAcademicYearHighlightedIndex] = useState(-1);
	const academicYearDropdownRef = useRef<HTMLDivElement>(null);
	const academicYearInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for class
	const [classQuery, setClassQuery] = useState('');
	const [showClassDropdown, setShowClassDropdown] = useState(false);
	const [classHighlightedIndex, setClassHighlightedIndex] = useState(-1);
	const classDropdownRef = useRef<HTMLDivElement>(null);
	const classInputRef = useRef<HTMLInputElement>(null);

	// Get current school ID and name from logged in user
	const currentSchool = useMemo(() => {
		const staff = localStorage.getItem('staff');
		if (staff) {
			try {
				const staffData = JSON.parse(staff);
				return {
					school_id: staffData.school_id,
					school_name: staffData.school_name || 'Current School'
				};
			} catch {}
		}
		return null;
	}, []);

	// Initialize filters with current school ID if available
	useEffect(() => {
		if (currentSchool?.school_id && !filters.school_id) {
			setFilters(prev => ({ ...prev, school_id: currentSchool.school_id }));
		}
	}, [currentSchool]);


	// Fetch academic years based on selected school
	useEffect(() => {
		const fetchAcademicYears = async () => {
			const schoolId = filters.school_id || currentSchool?.school_id;
			if (!schoolId) {
				setAcademicYears([]);
				return;
			}

			try {
				const { data } = await api.get(`/academic-years/?school_id=${schoolId}`);
				setAcademicYears(getArrayFromResponse(data));
			} catch (err: any) {
				console.error('Failed to fetch academic years:', err);
				setAcademicYears([]);
			}
		};
		fetchAcademicYears();
	}, [filters.school_id, currentSchool]);

	// Fetch classes based on selected school
	useEffect(() => {
		const fetchClasses = async () => {
			const schoolId = filters.school_id || currentSchool?.school_id;
			if (!schoolId) {
				setClasses([]);
				return;
			}

			try {
				const { data } = await api.get(`/classes/?school_id=${schoolId}`);
				setClasses(getArrayFromResponse(data));
			} catch (err: any) {
				console.error('Failed to fetch classes:', err);
				setClasses([]);
			}
		};
		fetchClasses();
	}, [filters.school_id, currentSchool]);

	// Update URL params when filters change
	useEffect(() => {
		const params = new URLSearchParams();
		if (filters.school_id) params.set('school_id', filters.school_id);
		if (filters.academic_id) params.set('academic_id', filters.academic_id);
		setSearchParams(params, { replace: true });
	}, [filters.school_id, filters.academic_id]);

	const fetchReports = async () => {
		const schoolId = filters.school_id || currentSchool?.school_id;
		if (!schoolId || !filters.academic_id) {
			toast.error('Please select academic year');
			return;
		}

		try {
			setLoading(true);
			const params = new URLSearchParams();
			params.append('school_id', schoolId);
			params.append('academic_id', filters.academic_id);
			if (filters.cls_id) {
				params.append('cls_id', filters.cls_id);
			}

			const { data } = await api.get(`/student-reports/?${params.toString()}`);
			
			// Filter by student name on frontend if provided
			let filteredData = data;
			if (filters.student_name && data.students) {
				const searchTerm = filters.student_name.toLowerCase();
				filteredData = {
					...data,
					students: data.students.filter((student: StudentReport) =>
						student.student_name.toLowerCase().includes(searchTerm) ||
						(student.student_code && student.student_code.toLowerCase().includes(searchTerm))
					)
				};
			}
			
			setReportData(filteredData);
			toast.success('Reports generated successfully');
		} catch (err: any) {
			const errorMessage = err.response?.data?.detail || 'Failed to fetch student reports';
			toast.error(errorMessage);
			setReportData(null);
		} finally {
			setLoading(false);
		}
	};

	const handleFilterChange = (key: keyof typeof filters, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const resetFilters = () => {
		setFilters({
			school_id: currentSchool?.school_id || '',
			academic_id: '',
			cls_id: '',
			student_name: '',
		});
		setAcademicYearQuery('');
		setClassQuery('');
	};

	// Filter options for autocomplete
	const filteredAcademicYearOptions = useMemo(() => {
		return academicYears.filter((ay) => {
			if (!academicYearQuery.trim()) return true;
			return ay.academic_name.toLowerCase().includes(academicYearQuery.toLowerCase());
		});
	}, [academicYears, academicYearQuery]);

	const filteredClassOptions = useMemo(() => {
		return classes.filter((cls) => {
			if (!classQuery.trim()) return true;
			return cls.cls_name.toLowerCase().includes(classQuery.toLowerCase());
		});
	}, [classes, classQuery]);

	// Selection handlers
	const handleSelectAcademicYear = (ay: AcademicYear) => {
		setFilters((prev) => ({ ...prev, academic_id: ay.academic_id }));
		setAcademicYearQuery(ay.academic_name);
		setShowAcademicYearDropdown(false);
		setAcademicYearHighlightedIndex(-1);
	};

	const handleSelectClass = (cls: Class) => {
		setFilters((prev) => ({ ...prev, cls_id: cls.cls_id }));
		setClassQuery(cls.cls_name);
		setShowClassDropdown(false);
		setClassHighlightedIndex(-1);
	};

	// Helper functions
	const getAcademicYearName = (academicId: string) => {
		const ay = academicYears.find(a => a.academic_id === academicId);
		return ay?.academic_name || '';
	};

	const getClassName = (classId: string) => {
		const cls = classes.find(c => c.cls_id === classId);
		return cls?.cls_name || '';
	};

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				(academicYearDropdownRef.current && !academicYearDropdownRef.current.contains(target) && !academicYearInputRef.current?.contains(target)) ||
				(classDropdownRef.current && !classDropdownRef.current.contains(target) && !classInputRef.current?.contains(target))
			) {
				if (showAcademicYearDropdown) {
					setShowAcademicYearDropdown(false);
					setAcademicYearHighlightedIndex(-1);
				}
				if (showClassDropdown) {
					setShowClassDropdown(false);
					setClassHighlightedIndex(-1);
				}
			}
		};

		if (showAcademicYearDropdown || showClassDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showAcademicYearDropdown, showClassDropdown]);



	// Subject maximums mapping (based on image template)
	const getSubjectMaximums = (subjectName: string): { cat: number; ex: number; tot: number } => {
		const name = subjectName.toLowerCase();
		if (name.includes('mathematics') || name.includes('math')) {
			return { cat: 80, ex: 80, tot: 160 };
		} else if (name.includes('english')) {
			return { cat: 80, ex: 80, tot: 160 };
		} else if (name.includes('e.s.t') || name.includes('environmental') || name.includes('technology')) {
			return { cat: 70, ex: 70, tot: 140 };
		} else if (name.includes('kinyarwanda')) {
			return { cat: 60, ex: 60, tot: 120 };
		} else if (name.includes('social')) {
			return { cat: 50, ex: 50, tot: 100 };
		} else if (name.includes('french')) {
			return { cat: 30, ex: 30, tot: 60 };
		} else if (name.includes('creative') || name.includes('arts')) {
			return { cat: 20, ex: 20, tot: 40 };
		} else if (name.includes('physical') || name.includes('sport') || name.includes('pe')) {
			return { cat: 10, ex: 10, tot: 20 };
		} else if (name.includes('religion')) {
			return { cat: 10, ex: 10, tot: 20 };
		}
		// Default for other subjects
		return { cat: 80, ex: 80, tot: 160 };
	};

	// Calculate totals for a student
	const calculateStudentTotals = (student: StudentReport) => {
		const termTotals: Record<string, { cat: number; ex: number; total: number; max: number }> = {};
		let generalTotal = 0;
		let totalMaxCat = 0;
		let totalMaxEx = 0;
		let totalMaxTot = 0;
		let fallbackGeneralMax = 0;

		student.subjects.forEach((subject) => {
			// Find all terms for this subject
			const term1 = subject.terms.find(t => 
				t.term === '1st Term' || t.term === 'Term 1' || 
				t.term === 'First Term' || t.term.toLowerCase().includes('1st')
			);
			const term2 = subject.terms.find(t => 
				t.term === '2nd Term' || t.term === 'Term 2' || 
				t.term === 'Second Term' || t.term.toLowerCase().includes('2nd')
			);
			const term3 = subject.terms.find(t => 
				t.term === '3rd Term' || t.term === 'Term 3' || 
				t.term === 'Third Term' || t.term.toLowerCase().includes('3rd')
			);
			
			// Calculate maximums from actual marks in DB
			const allTerms = [term1, term2, term3].filter(Boolean);
			const testAvgMarks = allTerms.map(t => t?.test_cat || 0).filter(v => v > 0);
			const examAvgMarks = allTerms.map(t => t?.exam_cat || 0).filter(v => v > 0);
			const maxCat = testAvgMarks.length > 0 ? Math.max(...testAvgMarks) : 0;
			const maxEx = examAvgMarks.length > 0 ? Math.max(...examAvgMarks) : 0;
			const maxTot = maxCat + maxEx;
			
			// Fallback to hardcoded if no marks
			const fallbackMax = getSubjectMaximums(subject.subject_name);
			const subjectMaxCat = maxCat > 0 ? maxCat : fallbackMax.cat;
			const subjectMaxEx = maxEx > 0 ? maxEx : fallbackMax.ex;
			const subjectMaxTot = maxTot > 0 ? maxTot : fallbackMax.tot;
			
			totalMaxCat += subjectMaxCat;
			totalMaxEx += subjectMaxEx;
			totalMaxTot += subjectMaxTot;
			fallbackGeneralMax += fallbackMax.tot * 3; // For fallback calculation

			// Process each term
			[term1, term2, term3].forEach((termData) => {
				if (!termData) return;
				
				const term = termData.term;
				const normalizedTerm = term.toLowerCase().includes('1st') || term.toLowerCase().includes('first') || term === 'Term 1' 
					? '1st Term' 
					: term.toLowerCase().includes('2nd') || term.toLowerCase().includes('second') || term === 'Term 2'
					? '2nd Term'
					: term.toLowerCase().includes('3rd') || term.toLowerCase().includes('third') || term === 'Term 3'
					? '3rd Term'
					: term;
					
				if (!termTotals[normalizedTerm]) {
					termTotals[normalizedTerm] = { cat: 0, ex: 0, total: 0, max: 0 };
				}

				// CAT = test marks only (test_ex), EX = exam marks only (exam_ex)
				// TOT = CAT + EX (sum of test_ex and exam_ex)
				// Only count published marks - use actual values from database
				const cat = (termData.test_is_published && (termData.test_ex !== null && termData.test_ex !== undefined)) ? termData.test_ex : 0;
				const ex = (termData.exam_is_published && (termData.exam_ex !== null && termData.exam_ex !== undefined)) ? termData.exam_ex : 0;
				const totalTotal = cat + ex;

				termTotals[normalizedTerm].cat += cat;
				termTotals[normalizedTerm].ex += ex;
				termTotals[normalizedTerm].total += totalTotal;
				termTotals[normalizedTerm].max += subjectMaxTot;

				generalTotal += totalTotal;
			});
		});

		// Calculate generalMax from totalMaxTot (sum of all subject maximums) * 3 terms
		// This uses real data: the sum of all subject maximums from the database * 3 terms
		const calculatedGeneralMax = totalMaxTot * 3;
		const finalGeneralMax = calculatedGeneralMax > 0 ? calculatedGeneralMax : fallbackGeneralMax;

		return {
			termTotals,
			generalMax: finalGeneralMax,
			generalTotal,
			generalPercentage: finalGeneralMax > 0 ? ((generalTotal / finalGeneralMax) * 100).toFixed(1) : '0.0',
			totalMaxCat,
			totalMaxEx,
			totalMaxTot
		};
	};


	// Initialize filters from URL params
	useEffect(() => {
		const schoolId = searchParams.get('school_id') || currentSchool?.school_id || '';
		const academicId = searchParams.get('academic_id') || '';
		const clsId = searchParams.get('cls_id') || '';

		if (schoolId) {
			setFilters({
				school_id: schoolId,
				academic_id: academicId,
				cls_id: clsId,
				student_name: '',
			});
			
			// Set query strings for display
			if (academicId && academicYears.length > 0) {
				const ay = academicYears.find(a => a.academic_id === academicId);
				if (ay) setAcademicYearQuery(ay.academic_name);
			}
			if (clsId && classes.length > 0) {
				const cls = classes.find(c => c.cls_id === clsId);
				if (cls) setClassQuery(cls.cls_name);
			}
		}
	}, [searchParams, currentSchool, academicYears, classes]);

	const handlePrint = () => {
		window.print();
	};

	return (
		<>
			{/* Print-specific styles */}
			<style>{`
				@media print {
					@page {
						size: A4;
						margin: 0.5cm;
					}
					
					body * {
						visibility: hidden;
					}
					
					.print-report, .print-report * {
						visibility: visible;
					}
					
					.print-report {
						position: absolute;
						left: 0;
						top: 0;
						width: 100%;
					}
					
					.print-report-item {
						page-break-after: always;
						page-break-inside: avoid;
					}
					
					.print-report-item:last-child {
						page-break-after: auto;
					}
					
					.sidebar, .topbar, .no-print, header, nav, aside {
						display: none !important;
					}
					
					main {
						padding: 0 !important;
					}
					
					/* Ensure same font sizes as frontend */
					.print-report-item {
						font-size: inherit !important;
					}
					
					.print-report-item table {
						font-size: 10px !important;
					}
				}
			`}</style>
			<div className="flex bg-gray-50 min-h-screen">
				<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:ml-64">
					<Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
					<main className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Student Reports</h1>
							<p className="text-gray-600 mt-1">Generate academic reports for students</p>
						</div>
						{reportData && reportData.students.length > 0 && (
							<button
								onClick={handlePrint}
								className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-[3px] hover:bg-indigo-700 transition"
							>
								<PrinterIcon className="w-5 h-5" />
								<span>Print Reports</span>
							</button>
						)}
					</div>

					{/* Filters */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 print:hidden">
						<div className="flex flex-col gap-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{/* Academic Year Autocomplete */}
								<div className="relative">
									<label className="block text-sm font-medium text-gray-700 mb-2">Academic Year *</label>
									<input
										ref={academicYearInputRef}
										type="text"
										value={filters.academic_id ? getAcademicYearName(filters.academic_id) : academicYearQuery}
										onChange={(e) => {
											setAcademicYearQuery(e.target.value);
											setShowAcademicYearDropdown(true);
											setAcademicYearHighlightedIndex(-1);
											if (!e.target.value.trim()) {
												setShowAcademicYearDropdown(false);
												handleFilterChange('academic_id', '');
											}
										}}
										onFocus={() => {
											if (filteredAcademicYearOptions.length > 0) {
												setShowAcademicYearDropdown(true);
											}
										}}
										placeholder="Select academic year..."
										disabled={!filters.school_id && !currentSchool?.school_id}
										className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
									/>
									{showAcademicYearDropdown && (
										<div
											ref={academicYearDropdownRef}
											className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
										>
											{filteredAcademicYearOptions.length > 0 ? (
												filteredAcademicYearOptions.map((ay, index) => (
													<button
														key={ay.academic_id}
														type="button"
														onClick={(e) => {
															e.preventDefault();
															e.stopPropagation();
															handleSelectAcademicYear(ay);
														}}
														onMouseEnter={() => setAcademicYearHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors ${
															index === academicYearHighlightedIndex ? 'bg-indigo-50' : ''
														} ${filters.academic_id === ay.academic_id ? 'bg-indigo-100 font-medium' : ''}`}
													>
														{ay.academic_name}
													</button>
												))
											) : (
												<div className="px-4 py-2.5 text-gray-500 text-sm">
													No academic year found
												</div>
											)}
										</div>
									)}
								</div>

								{/* Class Autocomplete */}
								<div className="relative">
									<label className="block text-sm font-medium text-gray-700 mb-2">Class (Optional)</label>
									<input
										ref={classInputRef}
										type="text"
										value={filters.cls_id ? getClassName(filters.cls_id) : classQuery}
										onChange={(e) => {
											setClassQuery(e.target.value);
											setShowClassDropdown(true);
											setClassHighlightedIndex(-1);
											if (!e.target.value.trim()) {
												setShowClassDropdown(false);
												handleFilterChange('cls_id', '');
											}
										}}
										onFocus={() => {
											if (filteredClassOptions.length > 0) {
												setShowClassDropdown(true);
											}
										}}
										placeholder="Select class (optional)..."
										disabled={!filters.school_id && !currentSchool?.school_id}
										className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
									/>
									{showClassDropdown && (
										<div
											ref={classDropdownRef}
											className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
										>
											<button
												type="button"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													handleFilterChange('cls_id', '');
													setClassQuery('');
													setShowClassDropdown(false);
												}}
												className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
											>
												All Classes
											</button>
											{filteredClassOptions.length > 0 ? (
												filteredClassOptions.map((cls, index) => (
													<button
														key={cls.cls_id}
														type="button"
														onClick={(e) => {
															e.preventDefault();
															e.stopPropagation();
															handleSelectClass(cls);
														}}
														onMouseEnter={() => setClassHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors ${
															index === classHighlightedIndex ? 'bg-indigo-50' : ''
														} ${filters.cls_id === cls.cls_id ? 'bg-indigo-100 font-medium' : ''}`}
													>
														{cls.cls_name}
													</button>
												))
											) : (
												<div className="px-4 py-2.5 text-gray-500 text-sm">
													No class found
												</div>
											)}
										</div>
									)}
								</div>

								{/* Student Name Filter (Optional) */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Student Name (Optional)</label>
									<input
										type="text"
										value={filters.student_name}
										onChange={(e) => handleFilterChange('student_name', e.target.value)}
										placeholder="Filter by student name..."
										className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
									/>
								</div>
							</div>
							
							{/* Generate Report Button */}
							<div className="flex justify-end">
								<button
									onClick={fetchReports}
									disabled={!currentSchool?.school_id || !filters.academic_id || loading}
									className="px-6 py-2.5 bg-indigo-600 text-white rounded-[3px] hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
								>
									{loading ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											<span>Generating...</span>
										</>
									) : (
										<>
											<DocumentTextIcon className="w-5 h-5" />
											<span>Generate Reports</span>
										</>
									)}
								</button>
							</div>
						</div>
					</div>

					{/* Reports */}
					{loading && (
						<div className="flex items-center justify-center h-64">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
						</div>
					)}

					{!loading && reportData && reportData.students.length > 0 && (() => {
						const totalStudents = reportData.students.length;
						
						// Calculate totals and percentages for all students
						const studentsWithTotals = reportData.students.map(student => {
							const totals = calculateStudentTotals(student);
							
							// Calculate percentage for each term
							const term1Percentage = totals.termTotals['1st Term'] && totals.termTotals['1st Term'].max > 0
								? (totals.termTotals['1st Term'].total / totals.termTotals['1st Term'].max) * 100
								: 0;
							const term2Percentage = totals.termTotals['2nd Term'] && totals.termTotals['2nd Term'].max > 0
								? (totals.termTotals['2nd Term'].total / totals.termTotals['2nd Term'].max) * 100
								: 0;
							const term3Percentage = totals.termTotals['3rd Term'] && totals.termTotals['3rd Term'].max > 0
								? (totals.termTotals['3rd Term'].total / totals.termTotals['3rd Term'].max) * 100
								: 0;
							const generalPercentage = parseFloat(totals.generalPercentage) || 0;
							
							return {
								...student,
								totals,
								term1Percentage,
								term2Percentage,
								term3Percentage,
								generalPercentage
							};
						});
						
						// Function to calculate positions for a term
						const calculateTermPositions = (
							students: typeof studentsWithTotals, 
							getPercentage: (s: typeof studentsWithTotals[0]) => number,
							hasMarks: (s: typeof studentsWithTotals[0]) => boolean
						): Map<string, number> => {
							// Filter students who have marks for this term
							const studentsWithMarks = students.filter(hasMarks);
							
							// Create a copy and sort by percentage (descending - highest first)
							const sorted = [...studentsWithMarks].sort((a, b) => getPercentage(b) - getPercentage(a));
							
							// Create position map
							const positionMap = new Map<string, number>();
							
							// Assign positions (handle ties)
							sorted.forEach((student, index) => {
								if (index === 0) {
									positionMap.set(student.student_id, 1);
								} else {
									const prevStudent = sorted[index - 1];
									if (getPercentage(student) === getPercentage(prevStudent)) {
										// Same percentage = same position
										positionMap.set(student.student_id, positionMap.get(prevStudent.student_id) || index + 1);
									} else {
										// Different percentage = next position
										positionMap.set(student.student_id, index + 1);
									}
								}
							});
							
							return positionMap;
						};
						
						// Check if student has marks for each term
						const hasTerm1Marks = (s: typeof studentsWithTotals[0]) => s.totals.termTotals['1st Term'] && s.totals.termTotals['1st Term'].total > 0;
						const hasTerm2Marks = (s: typeof studentsWithTotals[0]) => s.totals.termTotals['2nd Term'] && s.totals.termTotals['2nd Term'].total > 0;
						const hasTerm3Marks = (s: typeof studentsWithTotals[0]) => s.totals.termTotals['3rd Term'] && s.totals.termTotals['3rd Term'].total > 0;
						const hasGeneralMarks = (s: typeof studentsWithTotals[0]) => s.generalPercentage > 0;
						
						// Calculate positions for each term
						const term1Positions = calculateTermPositions(studentsWithTotals, s => s.term1Percentage, hasTerm1Marks);
						const term2Positions = calculateTermPositions(studentsWithTotals, s => s.term2Percentage, hasTerm2Marks);
						const term3Positions = calculateTermPositions(studentsWithTotals, s => s.term3Percentage, hasTerm3Marks);
						const generalPositions = calculateTermPositions(studentsWithTotals, s => s.generalPercentage, hasGeneralMarks);
						
						// Get total students with marks for each term
						const term1Total = studentsWithTotals.filter(hasTerm1Marks).length;
						const term2Total = studentsWithTotals.filter(hasTerm2Marks).length;
						const term3Total = studentsWithTotals.filter(hasTerm3Marks).length;
						const generalTotal = studentsWithTotals.filter(hasGeneralMarks).length;
						
						// Assign positions to students
						studentsWithTotals.forEach(student => {
							student.term1Position = term1Positions.get(student.student_id) || 0;
							student.term2Position = term2Positions.get(student.student_id) || 0;
							student.term3Position = term3Positions.get(student.student_id) || 0;
							student.position = generalPositions.get(student.student_id) || 0;
							student.term1Total = term1Total;
							student.term2Total = term2Total;
							student.term3Total = term3Total;
							student.generalTotal = generalTotal;
						});
						
						// Sort by General Total percentage (descending - highest first)
						studentsWithTotals.sort((a, b) => b.generalPercentage - a.generalPercentage);
						
						return (
							<div className="print-report">
								{studentsWithTotals.map((student) => {
									const totals = student.totals;
									
									// Check if student has all 3 terms
									const hasTerm1 = student.subjects.some(s => 
										s.terms.some(t => {
											const termLower = t.term?.toLowerCase() || '';
											return termLower === '1st term' || termLower === 'term 1' || 
												termLower === 'first term' || termLower.includes('1st');
										})
									);
									const hasTerm2 = student.subjects.some(s => 
										s.terms.some(t => {
											const termLower = t.term?.toLowerCase() || '';
											return termLower === '2nd term' || termLower === 'term 2' || 
												termLower === 'second term' || termLower.includes('2nd');
										})
									);
									const hasTerm3 = student.subjects.some(s => 
										s.terms.some(t => {
											const termLower = t.term?.toLowerCase() || '';
											return termLower === '3rd term' || termLower === 'term 3' || 
												termLower === 'third term' || termLower.includes('3rd');
										})
									);
									const hasAllThreeTerms = hasTerm1 && hasTerm2 && hasTerm3;
									
									return (
									<div key={student.student_id} className="print-report-item bg-white rounded-[3px] shadow-sm border border-gray-200 p-8 print:shadow-none print:border-0 print:p-8 print:min-h-[calc(100vh-1cm)] print:max-h-[calc(100vh-1cm)] print:overflow-hidden print:flex print:flex-col print:box-border">
										{/* Report Header - Matching Image Design */}
										<div className="text-center mb-6 print:mb-6 print:flex-shrink-0">
											<div className="mb-1">
												<h2 className="text-lg font-bold uppercase tracking-wide">{reportData.school_name || currentSchool?.school_name || 'School Name'}</h2>
											</div>
											<div className="text-xs mb-1">
												<span>REPUBLIC OF RWANDA MINISTRY OF EDUCATION</span>
											</div>
											<div className="text-sm font-bold mb-3 uppercase tracking-wide">
												STUDENT ACADEMIC REPORT
											</div>
											<div className="grid grid-cols-2 gap-4 text-xs text-left max-w-2xl mx-auto border-t border-b border-gray-400 pt-2 pb-2">
												<div>
													<p><strong>Option:</strong> {student.class_type || 'N/A'}</p>
													<p><strong>Year:</strong> {reportData.academic_year.name}</p>
													<p><strong>Class:</strong> {student.class_name || 'N/A'}</p>
												</div>
												<div>
													<p><strong>Names:</strong> {student.student_name.toUpperCase()}</p>
													<p><strong>Reg No:</strong> {student.student_code || 'N/A'}</p>
												</div>
											</div>
										</div>

										{/* Academic Report Table */}
										<div className="overflow-x-auto mb-2 print:mb-0 print:flex-1 print:overflow-visible print:min-h-0">
											<table className="w-full border-collapse border-2 border-gray-900 text-[10px] print:table-auto">
												<thead>
													<tr className="bg-gray-200">
														<th rowSpan={2} className="border-2 border-gray-900 px-5 py-1 text-left font-bold align-middle">SUBJECTS</th>
														<th colSpan={3} className="border-2 border-gray-900 px-1 py-1 text-center font-bold">MAXIMUM</th>
														<th colSpan={3} className="border-2 border-gray-900 px-1 py-1 text-center font-bold">1st Term</th>
														<th colSpan={3} className="border-2 border-gray-900 px-1 py-1 text-center font-bold">2nd Term</th>
														<th colSpan={3} className="border-2 border-gray-900 px-1 py-1 text-center font-bold">3rd Term</th>
														{hasAllThreeTerms && (
															<th colSpan={4} className="border-2 border-gray-900 px-1 py-1 text-center font-bold">GENERAL TOTAL</th>
														)}
													</tr>
													<tr className="bg-gray-200">
														<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">CAT</th>
														<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">EX</th>
														<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">TOT</th>
														<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">CAT</th>
														<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">EX</th>
														<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">TOT</th>
														<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">CAT</th>
														<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">EX</th>
														<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">TOT</th>
														<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">CAT</th>
														<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">EX</th>
														<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">TOT</th>
														{hasAllThreeTerms && (
															<>
																<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">MAX</th>
																<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">TOT</th>
																<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">%</th>
																<th className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">2nd Sitting %</th>
															</>
														)}
													</tr>
												</thead>
												<tbody>
													{student.subjects.map((subject) => {
														// Find terms - backend normalizes to "1st Term", "2nd Term", "3rd Term"
														// But also check for variations like "Term 1", "First Term", etc.
														const term1 = subject.terms.find(t => {
															const termLower = t.term?.toLowerCase() || '';
															return termLower === '1st term' || termLower === 'term 1' || 
																termLower === 'first term' || termLower.includes('1st');
														});
														const term2 = subject.terms.find(t => {
															const termLower = t.term?.toLowerCase() || '';
															return termLower === '2nd term' || termLower === 'term 2' || 
																termLower === 'second term' || termLower.includes('2nd');
														});
														const term3 = subject.terms.find(t => {
															const termLower = t.term?.toLowerCase() || '';
															return termLower === '3rd term' || termLower === 'term 3' || 
																termLower === 'third term' || termLower.includes('3rd');
														});
														
														// Calculate maximums from actual marks in DB
														// CAT maximum = max test_avg_mark (test_cat) across all terms
														// EX maximum = max exam_avg_mark (exam_cat) across all terms
														const allTerms = [term1, term2, term3].filter(Boolean);
														const testAvgMarks = allTerms.map(t => t?.test_cat || 0).filter(v => v > 0);
														const examAvgMarks = allTerms.map(t => t?.exam_cat || 0).filter(v => v > 0);
														const maxCat = testAvgMarks.length > 0 ? Math.max(...testAvgMarks) : 0;
														const maxEx = examAvgMarks.length > 0 ? Math.max(...examAvgMarks) : 0;
														const maxTot = maxCat + maxEx;
														
														// Get subject-specific maximums for fallback
														const fallbackMax = getSubjectMaximums(subject.subject_name);
														const generalMax = (maxTot > 0 ? maxTot : fallbackMax.tot) * 3;
														
														// Helper function to format mark with published check
														const formatMark = (value: number | null | undefined, isPublished: boolean) => {
															if (!isPublished) return '-';
															if (value === null || value === undefined) return '';
															return value > 0 ? value.toFixed(1) : '';
														};
														
														// CAT column = test marks only (test_ex = Test Mark)
														// EX column = exam marks only (exam_ex = Exam Mark)
														// TOT column = CAT + EX (sum of test_ex and exam_ex)
														const term1Cat = (term1?.test_is_published && (term1?.test_ex !== null && term1?.test_ex !== undefined)) ? term1.test_ex : 0;
														const term1Ex = (term1?.exam_is_published && (term1?.exam_ex !== null && term1?.exam_ex !== undefined)) ? term1.exam_ex : 0;
														const term1TotTotal = term1Cat + term1Ex;
														
														// CAT column = test marks only (test_ex = Test Mark)
														// EX column = exam marks only (exam_ex = Exam Mark)
														// TOT column = CAT + EX (sum of test_ex and exam_ex)
														const term2Cat = (term2?.test_is_published && (term2?.test_ex !== null && term2?.test_ex !== undefined)) ? term2.test_ex : 0;
														const term2Ex = (term2?.exam_is_published && (term2?.exam_ex !== null && term2?.exam_ex !== undefined)) ? term2.exam_ex : 0;
														const term2TotTotal = term2Cat + term2Ex;
														
														const term3Cat = (term3?.test_is_published && (term3?.test_ex !== null && term3?.test_ex !== undefined)) ? term3.test_ex : 0;
														const term3Ex = (term3?.exam_is_published && (term3?.exam_ex !== null && term3?.exam_ex !== undefined)) ? term3.exam_ex : 0;
														const term3TotTotal = term3Cat + term3Ex;
														
														const generalTot = term1TotTotal + term2TotTotal + term3TotTotal;
														const generalPercentage = generalMax > 0 ? ((generalTot / generalMax) * 100).toFixed(1) : '0.0';
														
														return (
															<tr key={subject.subject_id} className="hover:bg-gray-50">
																<td className="border-2 border-gray-900 px-5 py-2 font-semibold text-left">{subject.subject_name.toUpperCase()}</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center">{maxCat > 0 ? maxCat.toFixed(1) : fallbackMax.cat}</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center">{maxEx > 0 ? maxEx.toFixed(1) : fallbackMax.ex}</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center">{maxTot > 0 ? maxTot.toFixed(1) : fallbackMax.tot}</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center">
																	{term1Cat > 0 
																		? term1Cat.toFixed(1) 
																		: (term1?.test_is_published ? '-' : '')}
																</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center">
																	{term1Ex > 0 
																		? term1Ex.toFixed(1) 
																		: (term1?.exam_is_published ? '-' : '')}
																</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center">
																	{term1TotTotal > 0 
																		? term1TotTotal.toFixed(1) 
																		: (term1?.test_is_published || term1?.exam_is_published ? '-' : '')}
																</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center">
																	{term2Cat > 0 
																		? term2Cat.toFixed(1) 
																		: (term2?.test_is_published ? '-' : '')}
																</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center">
																	{term2Ex > 0 
																		? term2Ex.toFixed(1) 
																		: (term2?.exam_is_published ? '-' : '')}
																</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center">
																	{term2TotTotal > 0 
																		? term2TotTotal.toFixed(1) 
																		: (term2?.test_is_published || term2?.exam_is_published ? '-' : '')}
																</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center">
																	{term3Cat > 0 
																		? term3Cat.toFixed(1) 
																		: (term3?.test_is_published ? '-' : '')}
																</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center">
																	{term3Ex > 0 
																		? term3Ex.toFixed(1) 
																		: (term3?.exam_is_published ? '-' : '')}
																</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center">
																	{term3TotTotal > 0 
																		? term3TotTotal.toFixed(1) 
																		: (term3?.test_is_published || term3?.exam_is_published ? '-' : '')}
																</td>
																{hasAllThreeTerms && (
																	<>
																		<td className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">{generalMax}</td>
																		<td className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">{generalTot > 0 ? generalTot.toFixed(1) : ''}</td>
																		<td className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">{generalPercentage}</td>
																		<td className="border-2 border-gray-900 px-1 py-1 text-center"></td>
																	</>
																)}
															</tr>
														);
													})}
													
													{/* Total Row */}
													<tr className="bg-gray-200 font-bold">
														<td className="border-2 border-gray-900 px-5 py-2">TOTAL</td>
														<td className="border-2 border-gray-900 px-1 py-1 text-center">
															{totals.totalMaxCat > 0 ? Math.round(totals.totalMaxCat) : student.subjects.reduce((sum, s) => {
																const fallback = getSubjectMaximums(s.subject_name);
																return sum + fallback.cat;
															}, 0)}
														</td>
														<td className="border-2 border-gray-900 px-1 py-1 text-center">
															{totals.totalMaxEx > 0 ? Math.round(totals.totalMaxEx) : student.subjects.reduce((sum, s) => {
																const fallback = getSubjectMaximums(s.subject_name);
																return sum + fallback.ex;
															}, 0)}
														</td>
														<td className="border-2 border-gray-900 px-1 py-1 text-center">
															{totals.totalMaxTot > 0 ? Math.round(totals.totalMaxTot) : student.subjects.reduce((sum, s) => {
																const fallback = getSubjectMaximums(s.subject_name);
																return sum + fallback.tot;
															}, 0)}
														</td>
														{['1st Term', '2nd Term', '3rd Term'].map((term) => {
															const termKey = term;
															const termData = totals.termTotals[termKey] || { cat: 0, ex: 0, total: 0, max: 0 };
															return (
																<>
																	<td className="border-2 border-gray-900 px-1 py-1 text-center">{termData.cat > 0 ? termData.cat.toFixed(1) : ''}</td>
																	<td className="border-2 border-gray-900 px-1 py-1 text-center">{termData.ex > 0 ? termData.ex.toFixed(1) : ''}</td>
																	<td className="border-2 border-gray-900 px-1 py-1 text-center">{termData.total > 0 ? termData.total.toFixed(1) : ''}</td>
																</>
															);
														})}
														{hasAllThreeTerms && (
															<>
																<td className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">{totals.generalMax > 0 ? Math.round(totals.generalMax) : ''}</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">{totals.generalTotal > 0 ? totals.generalTotal.toFixed(1) : ''}</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center font-semibold">{totals.generalPercentage}</td>
																<td className="border-2 border-gray-900 px-1 py-1 text-center"></td>
															</>
														)}
													</tr>
												</tbody>
											</table>
										</div>

										{/* Summary Section */}
										<div className="grid grid-cols-2 gap-8 mb-4 text-xs print:mb-2 print:flex-shrink-0">
											<div>
												<p className="font-bold mb-2 uppercase">PERCENTAGE:</p>
												<p>1st Term: {totals.termTotals['1st Term'] && totals.termTotals['1st Term'].max > 0 
													? ((totals.termTotals['1st Term'].total / totals.termTotals['1st Term'].max) * 100).toFixed(1) 
													: '0.0'}%</p>
												<p>2nd Term: {totals.termTotals['2nd Term'] && totals.termTotals['2nd Term'].max > 0 
													? ((totals.termTotals['2nd Term'].total / totals.termTotals['2nd Term'].max) * 100).toFixed(1) 
													: '0.0'}%</p>
												<p>3rd Term: {totals.termTotals['3rd Term'] && totals.termTotals['3rd Term'].max > 0 
													? ((totals.termTotals['3rd Term'].total / totals.termTotals['3rd Term'].max) * 100).toFixed(1) 
													: '0.0'}%</p>
												{hasAllThreeTerms && (
													<p>General Total: {totals.generalPercentage}%</p>
												)}
											</div>
											<div>
												<p className="font-bold mb-2 uppercase">POSITION:</p>
												<p>1st Term: {student.term1Position && student.term1Position > 0 && student.term1Total 
													? `${student.term1Position} out of ${student.term1Total} students` 
													: '—'}</p>
												<p>2nd Term: {student.term2Position && student.term2Position > 0 && student.term2Total 
													? `${student.term2Position} out of ${student.term2Total} students` 
													: '—'}</p>
												<p>3rd Term: {student.term3Position && student.term3Position > 0 && student.term3Total 
													? `${student.term3Position} out of ${student.term3Total} students` 
													: '—'}</p>
												{hasAllThreeTerms && (
													<p>General Total: {student.position && student.position > 0 && student.generalTotal 
														? `${student.position} out of ${student.generalTotal} students` 
														: '—'}</p>
												)}
											</div>
										</div>

										{/* Signatures Section */}
										<div className="grid grid-cols-2 gap-8 mt-8 text-xs border-t border-gray-400 pt-4 print:flex-shrink-0">
											<div>
												<p className="mb-3 font-semibold">Teacher's Remarks & Signature:</p>
												<div className="border-b-2 border-gray-600 h-20"></div>
											</div>
											<div>
												<p className="mb-3 font-semibold">Parents Signature:</p>
												<div className="border-b-2 border-gray-600 h-20"></div>
											</div>
										</div>

										{/* Decision Section */}
										<div className="mt-6 text-xs border-t border-gray-400 pt-4 print:flex-shrink-0">
											<p className="mb-3 font-bold uppercase">Decision Taken:</p>
											<div className="grid grid-cols-2 gap-6">
												<div>
													<p className="mb-2 font-semibold">1st SITTING:</p>
													<div className="space-y-1">
														<label className="flex items-center gap-2">
															<input type="checkbox" className="w-4 h-4 rounded border-gray-400" /> <span>PROMOTED</span>
														</label>
														<label className="flex items-center gap-2">
															<input type="checkbox" className="w-4 h-4 rounded border-gray-400" /> <span>PROMOTED ELSEWHERE</span>
														</label>
														<label className="flex items-center gap-2">
															<input type="checkbox" className="w-4 h-4 rounded border-gray-400" /> <span>REPEAT</span>
														</label>
														<label className="flex items-center gap-2">
															<input type="checkbox" className="w-4 h-4 rounded border-gray-400" /> <span>REPEAT ELSEWHERE</span>
														</label>
														<label className="flex items-center gap-2">
															<input type="checkbox" className="w-4 h-4 rounded border-gray-400" /> <span>EXCLUDED</span>
														</label>
													</div>
												</div>
												<div>
													<p className="mb-2 font-semibold">2nd SITTING:</p>
													<div className="space-y-1">
														<label className="flex items-center gap-2">
															<input type="checkbox" className="w-4 h-4 rounded border-gray-400" /> <span>PROMOTED</span>
														</label>
														<label className="flex items-center gap-2">
															<input type="checkbox" className="w-4 h-4 rounded border-gray-400" /> <span>REPEAT</span>
														</label>
													</div>
												</div>
											</div>
											<div className="mt-6">
												<p className="font-semibold mb-2">School Headteacher:</p>
												<p className="mb-2">Name: _________________________</p>
												<div className="mt-3 border-b-2 border-gray-600 w-56 inline-block"></div>
												<p className="mt-2 text-[9px]">Signature & Stamp</p>
											</div>
										</div>
									</div>
								);
							})}
							</div>
						);
					})()}

					{!loading && (!reportData || reportData.students.length === 0) && filters.school_id && filters.academic_id && (
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-12 text-center">
							<DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-500 text-lg font-medium">No student reports found</p>
							<p className="text-sm text-gray-400 mt-2">Try adjusting your filters or ensure students have marks entered</p>
						</div>
					)}

					{!loading && (!filters.school_id || !filters.academic_id) && (
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-12 text-center">
							<DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-500 text-lg font-medium">Select filters to generate reports</p>
							<p className="text-sm text-gray-400 mt-2">Please select a school and academic year to view student reports</p>
						</div>
					)}
				</main>
			</div>
		</div>
		</>
	);
}


import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import {
	MagnifyingGlassIcon,
	PlusIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
	AcademicCapIcon,
	ChartBarIcon,
	EyeSlashIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import TestMarksForm from '../components/TestMarksForm';
import TestMarksFilterModal from '../components/TestMarksFilterModal';
import TestMarksViewModal from '../components/TestMarksViewModal';

interface TestMarkItem {
	test_mark_id: string;
	school_id: string;
	std_id: string;
	subj_id: string;
	cls_id: string;
	academic_id: string;
	term: string;
	test_mark: number;
	test_avg_mark: number | null;
	status?: string | null;
	is_published: boolean;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
	// Joined fields
	school_name?: string | null;
	student_name?: string | null;
	subject_name?: string | null;
	class_name?: string | null;
	academic_year_name?: string | null;
}

interface FilterState {
	search: string;
	term: string;
	academicYear: string;
	status: string;
}

interface AcademicYearOption {
	academic_id: string;
	academic_name: string;
	start_date: string;
	end_date: string;
	is_current?: boolean;
}

const TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3', 'First Term', 'Second Term', 'Third Term'];
const STATUS_OPTIONS = ['Pass', 'Fail', 'Excellent', 'Good', 'Fair', 'Poor'];

export default function TestMarksManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [testMarks, setTestMarks] = useState<TestMarkItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		term: '',
		academicYear: '',
		status: '',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [showFilters, setShowFilters] = useState(false);

	// Autocomplete states for filter selects
	const [termFilterQuery, setTermFilterQuery] = useState('');
	const [showTermFilterDropdown, setShowTermFilterDropdown] = useState(false);
	const [termFilterHighlightedIndex, setTermFilterHighlightedIndex] = useState(-1);
	const termFilterDropdownRef = useRef<HTMLDivElement>(null);
	const termFilterInputRef = useRef<HTMLInputElement>(null);

	const [statusFilterQuery, setStatusFilterQuery] = useState('');
	const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
	const [statusFilterHighlightedIndex, setStatusFilterHighlightedIndex] = useState(-1);
	const statusFilterDropdownRef = useRef<HTMLDivElement>(null);
	const statusFilterInputRef = useRef<HTMLInputElement>(null);

	const [academicYearFilterQuery, setAcademicYearFilterQuery] = useState('');
	const [showAcademicYearFilterDropdown, setShowAcademicYearFilterDropdown] = useState(false);
	const [academicYearFilterHighlightedIndex, setAcademicYearFilterHighlightedIndex] = useState(-1);
	const academicYearFilterDropdownRef = useRef<HTMLDivElement>(null);
	const academicYearFilterInputRef = useRef<HTMLInputElement>(null);
	const [availableAcademicYears, setAvailableAcademicYears] = useState<AcademicYearOption[]>([]);

	// Modal states
	const [filterModalOpen, setFilterModalOpen] = useState(false);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [selectedTestMark, setSelectedTestMark] = useState<TestMarkItem | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<TestMarkItem> | Partial<TestMarkItem>[] | null>(null);
	const [formLoading, setFormLoading] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [publishLoading, setPublishLoading] = useState(false);
	
	// Selection state for bulk publish
	const [selectedTestMarkIds, setSelectedTestMarkIds] = useState<Set<string>>(new Set());
	
	// Filter modal data
	const [selectedClassId, setSelectedClassId] = useState<string>('');
	const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
	const [filteredStudents, setFilteredStudents] = useState<any[]>([]);

	// Get school ID and staff ID from logged-in user's staff data
	const schoolId = useMemo(() => {
		const staff = localStorage.getItem('staff');
		if (staff) {
			try {
				const staffData = JSON.parse(staff);
				if (staffData.school_id) {
					return staffData.school_id;
				}
			} catch {
				// Ignore parse errors
			}
		}
		return null;
	}, []);

	const staffId = useMemo(() => {
		const staff = localStorage.getItem('staff');
		if (staff) {
			try {
				const staffData = JSON.parse(staff);
				if (staffData.staff_id) {
					return staffData.staff_id;
				}
			} catch {
				// Ignore parse errors
			}
		}
		return null;
	}, []);

	// Get teacher_id from staff_id
	const [teacherId, setTeacherId] = useState<string | null>(null);
	useEffect(() => {
		const fetchTeacherId = async () => {
			if (!schoolId || !staffId) {
				setTeacherId(null);
				return;
			}

			try {
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/teachers/?school_id=${schoolId}&_t=${timestamp}`);
				const teacher = getArrayFromResponse(data).find((t: any) => t.staff_id === staffId);
				if (teacher) {
					setTeacherId(teacher.teacher_id);
				} else {
					setTeacherId(null);
				}
			} catch (error: any) {setTeacherId(null);
			}
		};

		fetchTeacherId();
	}, [schoolId, staffId]);

	// Fetch academic years for filter
	useEffect(() => {
		const fetchAcademicYears = async () => {
			if (!schoolId) return;

			try {
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/academic-years/?school_id=${schoolId}&_t=${timestamp}`);
				const academicYears: AcademicYearOption[] = getArrayFromResponse(data).map((ay: any) => ({
					academic_id: ay.academic_id,
					academic_name: ay.academic_name,
					start_date: ay.start_date,
					end_date: ay.end_date,
					is_current: ay.is_current || false,
				}));
				setAvailableAcademicYears(academicYears);
			} catch (error: any) {setAvailableAcademicYears([]);
			}
		};

		fetchAcademicYears();
	}, [schoolId]);

	// Filter options based on search queries
	const filteredTermOptions = TERM_OPTIONS.filter((term) => {
		if (!termFilterQuery.trim()) return true;
		return term.toLowerCase().includes(termFilterQuery.toLowerCase());
	});

	const filteredStatusOptions = STATUS_OPTIONS.filter((status) => {
		if (!statusFilterQuery.trim()) return true;
		return status.toLowerCase().includes(statusFilterQuery.toLowerCase());
	});

	const filteredAcademicYearOptions = availableAcademicYears.filter((ay) => {
		if (!academicYearFilterQuery.trim()) return true;
		return ay.academic_name.toLowerCase().includes(academicYearFilterQuery.toLowerCase());
	});

	// Close filter dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;

			if (
				termFilterDropdownRef.current &&
				!termFilterDropdownRef.current.contains(target) &&
				termFilterInputRef.current &&
				!termFilterInputRef.current.contains(target)
			) {
				setShowTermFilterDropdown(false);
			}

			if (
				statusFilterDropdownRef.current &&
				!statusFilterDropdownRef.current.contains(target) &&
				statusFilterInputRef.current &&
				!statusFilterInputRef.current.contains(target)
			) {
				setShowStatusFilterDropdown(false);
			}

			if (
				academicYearFilterDropdownRef.current &&
				!academicYearFilterDropdownRef.current.contains(target) &&
				academicYearFilterInputRef.current &&
				!academicYearFilterInputRef.current.contains(target)
			) {
				setShowAcademicYearFilterDropdown(false);
			}
		};

		if (showTermFilterDropdown || showStatusFilterDropdown || showAcademicYearFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showTermFilterDropdown, showStatusFilterDropdown, showAcademicYearFilterDropdown]);

	// Fetch test marks data
	const fetchTestMarks = async () => {
		if (!schoolId) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			const timestamp = new Date().getTime();
			// Fetch with pagination to get all marks
			const { data } = await api.get(`/test-marks/?school_id=${schoolId}&page=1&page_size=100&_t=${timestamp}`);
			
			// Handle paginated response
			const marksData = data?.items || data || [];
			const allMarks = Array.isArray(marksData) ? marksData : [];
			
			// Normalize data: map API field names to frontend expected field names
			const normalizedData = allMarks.map((record: any) => ({
				...record,
				// Ensure all fields are properly set
				test_mark_id: record.test_mark_id,
				test_mark: record.test_mark ?? 0,
				test_avg_mark: record.test_avg_mark ?? null,
				academic_year_name: record.academic_year_name || record.academic_name,
			}));
			
			// Force state update by creating a new array reference
			setTestMarks([...normalizedData]);
			
			console.log('Fetched test marks:', {
				total: normalizedData.length,
				sample: normalizedData[0],
			});
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || 'Failed to load test marks';
			toast.error(errorMessage);
			setTestMarks([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchTestMarks();
	}, [schoolId]);

	// Filter and paginate test marks
	const filteredTestMarks = useMemo(() => {
		let filtered = testMarks.filter((record) => !record.is_deleted);

		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			filtered = filtered.filter(
				(record) =>
					record.student_name?.toLowerCase().includes(searchLower) ||
					record.subject_name?.toLowerCase().includes(searchLower) ||
					record.class_name?.toLowerCase().includes(searchLower) ||
					record.academic_year_name?.toLowerCase().includes(searchLower)
			);
		}

		if (filters.term) {
			filtered = filtered.filter((record) => record.term === filters.term);
		}

		if (filters.academicYear) {
			filtered = filtered.filter((record) => record.academic_id === filters.academicYear);
		}

		if (filters.status) {
			filtered = filtered.filter((record) => record.status === filters.status);
		}

		return filtered;
	}, [testMarks, filters]);

	// Pagination
	const totalPages = Math.ceil(filteredTestMarks.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedTestMarks = useMemo(() => {
		return filteredTestMarks.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredTestMarks, startIndex, itemsPerPage]);

	// Analytics
	const analytics = useMemo(() => {
		const total = filteredTestMarks.length;
		const average = filteredTestMarks.length > 0
			? filteredTestMarks.reduce((sum, record) => {
				return sum + (record.test_mark || 0);
			}, 0) / filteredTestMarks.length
			: 0;
		const highest = filteredTestMarks.length > 0
			? Math.max(...filteredTestMarks.map((record) => record.test_mark || 0))
			: 0;
		const lowest = filteredTestMarks.length > 0
			? Math.min(...filteredTestMarks.map((record) => record.test_mark || 0))
			: 0;
		const published = filteredTestMarks.filter((record) => record.is_published).length;

		return {
			total,
			average: Math.round(average * 100) / 100,
			highest,
			lowest,
			published,
		};
	}, [filteredTestMarks]);

	// Filter handlers
	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const handleClearFilters = () => {
		setFilters({
			search: '',
			term: '',
			academicYear: '',
			status: '',
		});
		setTermFilterQuery('');
		setStatusFilterQuery('');
		setAcademicYearFilterQuery('');
		setCurrentPage(1);
	};

	// Modal handlers
	const handleCreate = () => {
		setSelectedTestMark(null);
		setFormDataToSubmit(null);
		setCreateConfirmOpen(false);
		setFilterModalOpen(true);
	};

	const handleFilterProceed = (classId: string, subjectId: string, academicYearId: string, students: any[]) => {
		setSelectedClassId(classId);
		setSelectedSubjectId(subjectId);
		setSelectedAcademicYearId(academicYearId);
		setFilteredStudents(students);
		setFilterModalOpen(false);
		setCreateModalOpen(true);
	};

	const handleEdit = async (record: TestMarkItem) => {
		if (!record.test_mark_id) {
			toast.error('Invalid record: Missing test_mark_id');return;
		}
		
		// Verify the record exists before opening edit modal
		try {
			const verifyResponse = await api.get(`/test-marks/${record.test_mark_id}?school_id=${schoolId}`);} catch (verifyError: any) {if (verifyError.response?.status === 404) {
				toast.error('Cannot edit: Record not found. It may have been deleted. Refreshing list...');
				fetchTestMarks();
				return;
			}
			toast.error('Failed to verify record. Please try again.');
			return;
		}
		
		setSelectedTestMark(record);
		setFormDataToSubmit(null);
		setUpdateConfirmOpen(false);
		setEditModalOpen(true);
	};

	const handleView = (record: TestMarkItem) => {
		setSelectedTestMark(record);
		setViewModalOpen(true);
	};

	const handleDelete = (record: TestMarkItem) => {
		setSelectedTestMark(record);
		setDeleteConfirmOpen(true);
	};

	// Selection handlers for bulk publish
	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			const allIds = new Set(paginatedTestMarks.map((mark) => mark.test_mark_id));
			setSelectedTestMarkIds(allIds);
		} else {
			setSelectedTestMarkIds(new Set());
		}
	};

	const handleSelectOne = (testMarkId: string, checked: boolean) => {
		const newSelected = new Set(selectedTestMarkIds);
		if (checked) {
			newSelected.add(testMarkId);
		} else {
			newSelected.delete(testMarkId);
		}
		setSelectedTestMarkIds(newSelected);
	};

	// Bulk publish handler
	const handleBulkPublish = async () => {
		if (selectedTestMarkIds.size === 0) {
			toast.error('Please select at least one test mark to publish');
			return;
		}

		if (!schoolId) {
			toast.error('School ID not found');
			return;
		}

		try {
			setPublishLoading(true);
			const response = await api.post(`/test-marks/bulk-publish?school_id=${schoolId}`, {
				test_mark_ids: Array.from(selectedTestMarkIds),
				is_published: true,
			});
			
			toast.success(response.data.message || `Successfully published ${selectedTestMarkIds.size} test mark(s)`);
			setSelectedTestMarkIds(new Set());
			fetchTestMarks();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to publish test marks';
			toast.error(errorMessage);
		} finally {
			setPublishLoading(false);
		}
	};

	// Unpublish single test mark handler
	const handleUnpublish = async (record: TestMarkItem) => {
		if (!record.test_mark_id || !schoolId) {
			toast.error('Missing required data');
			return;
		}

		try {
			setPublishLoading(true);
			const response = await api.post(`/test-marks/bulk-publish?school_id=${schoolId}`, {
				test_mark_ids: [record.test_mark_id],
				is_published: false,
			});
			
			toast.success(response.data.message || 'Test mark unpublished successfully');
			fetchTestMarks();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to unpublish test mark';
			toast.error(errorMessage);
		} finally {
			setPublishLoading(false);
		}
	};

	// Form submission handlers
	const handleCreateSubmit = async (data: Partial<TestMarkItem> | Partial<TestMarkItem>[]) => {
		setFormDataToSubmit(data);
		setCreateModalOpen(false);
		setCreateConfirmOpen(true);
	};

	const handleUpdateSubmit = async (data: Partial<TestMarkItem>) => {
		setFormDataToSubmit(data);
		setEditModalOpen(false);
		setUpdateConfirmOpen(true);
	};

	// Handle Create (after confirmation)
	const handleCreateConfirm = async () => {
		if (!formDataToSubmit || !schoolId) {
			toast.error('Missing required data. Please try again.');
			return;
		}

		try {
			setFormLoading(true);
			
			// Check if it's bulk submission (array)
			const isBulk = Array.isArray(formDataToSubmit);
			
			if (isBulk) {
				// Bulk submission - create multiple test mark records
				const promises = (formDataToSubmit as Partial<TestMarkItem>[]).map((item) => {
					// Convert test_mark and test_avg_mark to numbers
					const testMark = item.test_mark !== null && item.test_mark !== undefined 
						? Number(item.test_mark) 
						: 0;
					const testAvgMark = item.test_avg_mark !== null && item.test_avg_mark !== undefined 
						? Number(item.test_avg_mark) 
						: null;
					
					const payload: any = {
						school_id: schoolId,
						std_id: item.std_id || '',
						subj_id: item.subj_id || '',
						cls_id: item.cls_id || '',
						academic_id: item.academic_id || '',
						term: item.term || 'Term 1',
						test_mark: testMark,
						test_avg_mark: testAvgMark,
						status: item.status || null,
						is_published: item.is_published || false,
					};
					return api.post('/test-marks/', payload);
				});

				await Promise.all(promises);
				toast.success(`${formDataToSubmit.length} test mark(s) created successfully!`);
			} else {
				// Single submission
				const submitData = formDataToSubmit as Partial<TestMarkItem>;
				// Convert test_mark and test_avg_mark to numbers
				const testMark = submitData.test_mark !== null && submitData.test_mark !== undefined 
					? Number(submitData.test_mark) 
					: 0;
				const testAvgMark = submitData.test_avg_mark !== null && submitData.test_avg_mark !== undefined 
					? Number(submitData.test_avg_mark) 
					: null;
				
				const payload: any = {
					school_id: schoolId,
					std_id: submitData.std_id || '',
					subj_id: submitData.subj_id || '',
					cls_id: submitData.cls_id || '',
					academic_id: submitData.academic_id || '',
					term: submitData.term || '',
					test_mark: testMark,
					test_avg_mark: testAvgMark,
					status: submitData.status || null,
					is_published: submitData.is_published || false,
				};

				await api.post('/test-marks/', payload);
				toast.success('Test mark created successfully!');
			}

			setCreateConfirmOpen(false);
			setCreateModalOpen(false);
			setFormDataToSubmit(null);
			setSelectedClassId('');
			setSelectedSubjectId('');
			setSelectedAcademicYearId('');
			setFilteredStudents([]);

			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			// Refresh test marks
			await fetchTestMarks();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to create test mark';
			toast.error(errorMessage);
			// Even on error, refresh marks to show existing ones (especially for duplicate errors)
			await new Promise(resolve => setTimeout(resolve, 100));
			await fetchTestMarks();
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!formDataToSubmit || !selectedTestMark || !schoolId) {
			toast.error('Missing required data. Please try again.');
			return;
		}

		try {
			setFormLoading(true);
			const submitData = formDataToSubmit as Partial<TestMarkItem>;
			// Convert test_mark and test_avg_mark to numbers
			const testMark = submitData.test_mark !== null && submitData.test_mark !== undefined 
				? Number(submitData.test_mark) 
				: 0;
			const testAvgMark = submitData.test_avg_mark !== null && submitData.test_avg_mark !== undefined 
				? Number(submitData.test_avg_mark) 
				: null;
			
			// Ensure all fields are present and properly formatted
			const originalRecord = selectedTestMark;
			
			const payload: any = {
				school_id: submitData.school_id || originalRecord.school_id || schoolId,
				std_id: submitData.std_id || originalRecord.std_id,
				subj_id: submitData.subj_id || originalRecord.subj_id,
				cls_id: submitData.cls_id || originalRecord.cls_id,
				academic_id: submitData.academic_id || originalRecord.academic_id,
				term: submitData.term || originalRecord.term || '',
				test_mark: testMark,
				test_avg_mark: testAvgMark,
				status: submitData.status !== undefined && submitData.status !== null ? submitData.status : (originalRecord.status || null),
				is_published: submitData.is_published !== undefined ? submitData.is_published : (originalRecord.is_published ?? false),
			};
			
			// Remove any undefined values
			Object.keys(payload).forEach(key => {
				if (payload[key] === undefined) {
					delete payload[key];
				}
			});

			const markId = selectedTestMark.test_mark_id;
			if (!markId) {
				toast.error('Test mark ID not found. Cannot update record.');return;
			}

			// Validate UUID format
			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			if (!uuidRegex.test(markId)) {
				toast.error('Invalid test mark ID format');return;
			}

			// Verify the record exists in the current list
			const recordInList = testMarks.find((r) => r.test_mark_id === markId);
			
			if (!recordInList) {
				toast.error('Record not found in current list. Please refresh the page.');setFormLoading(false);
				return;
			}await api.put(`/test-marks/${markId}?school_id=${schoolId}`, payload);
			toast.success('Test mark updated successfully!');
			setUpdateConfirmOpen(false);
			setEditModalOpen(false);
			setFormDataToSubmit(null);
			setSelectedTestMark(null);

			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			// Refresh test marks
			await fetchTestMarks();
		} catch (error: any) {const errorMessage = error.response?.data?.detail || error.message || 'Failed to update test mark';
			toast.error(errorMessage);
			
			// Provide more specific error messages
			if (error.response?.status === 404) {
				toast.error('Test mark not found. It may have been deleted or the ID is incorrect.');} else if (error.response?.status === 400) {
				toast.error('Invalid data. Please check all fields are correct.');
			}
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDeleteConfirm = async () => {
		if (!selectedTestMark || !schoolId) return;

		try {
			setDeleteLoading(true);
			const markId = selectedTestMark.test_mark_id;
			if (!markId) {
				toast.error('Test mark ID not found. Cannot delete record.');return;
			}

			// Validate UUID format
			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			if (!uuidRegex.test(markId)) {
				toast.error('Invalid test mark ID format');return;
			}

			// Verify the record exists in the current list
			const recordInList = testMarks.find((r) => r.test_mark_id === markId);await api.delete(`/test-marks/${markId}?school_id=${schoolId}`);
			toast.success('Test mark deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedTestMark(null);

			// Refresh test marks
			const { data } = await api.get(`/test-marks/?school_id=${schoolId}`);
			// API now returns test_mark_id directly - no normalization needed
			const normalizedData = getArrayFromResponse(data).map((record: any) => ({
				...record,
				test_mark_id: record.test_mark_id,
				test_mark: record.test_mark ?? 0,
				test_avg_mark: record.test_avg_mark ?? null,
				academic_year_name: record.academic_year_name || record.academic_name,
			}));
			setTestMarks(normalizedData);
		} catch (error: any) {const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete test mark';
			toast.error(errorMessage);
			
			// Provide more specific error messages
			if (error.response?.status === 404) {
				toast.error('Test mark not found. It may have been deleted or the ID is incorrect.');// Refresh the list to remove deleted records
				toast.success('Refreshing list...');
				fetchTestMarks();
			}
		} finally {
			setDeleteLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex bg-gray-50 min-h-screen">
				<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:ml-64">
					<Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
					<main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
							<p className="mt-4 text-gray-600">Loading test marks...</p>
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
					<Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
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
				<Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
				<main className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Test Marks Management</h1>
							<p className="text-gray-600 mt-1">Track and manage student test marks</p>
						</div>
						<button
							onClick={handleCreate}
							className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors font-medium"
						>
							<PlusIcon className="w-5 h-5" />
							<span>Add Test Marks</span>
						</button>
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Records</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<AcademicCapIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-green-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Average Mark</p>
									<p className="text-3xl font-bold text-green-600 mt-2">{analytics.average.toFixed(1)}</p>
								</div>
								<div className="p-3 bg-green-100 rounded-[3px]">
									<ChartBarIcon className="w-6 h-6 text-green-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-purple-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Highest Mark</p>
									<p className="text-3xl font-bold text-purple-600 mt-2">{analytics.highest.toFixed(1)}</p>
								</div>
								<div className="p-3 bg-purple-100 rounded-[3px]">
									<ChartBarIcon className="w-6 h-6 text-purple-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-orange-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Lowest Mark</p>
									<p className="text-3xl font-bold text-orange-600 mt-2">{analytics.lowest.toFixed(1)}</p>
								</div>
								<div className="p-3 bg-orange-100 rounded-[3px]">
									<ChartBarIcon className="w-6 h-6 text-orange-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Published</p>
									<p className="text-3xl font-bold text-indigo-600 mt-2">{analytics.published}</p>
								</div>
								<div className="p-3 bg-indigo-100 rounded-[3px]">
									<AcademicCapIcon className="w-6 h-6 text-indigo-600" />
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
									placeholder="Search by student, subject, class, or academic year..."
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
								{selectedTestMarkIds.size > 0 && (
									<div className="flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-[3px] text-sm font-medium">
										{selectedTestMarkIds.size} selected
									</div>
								)}
								<button
									onClick={handleBulkPublish}
									disabled={selectedTestMarkIds.size === 0 || publishLoading}
									className={`px-4 py-2.5 rounded-[3px] font-medium transition-all duration-200 flex items-center gap-2 ${
										selectedTestMarkIds.size === 0 || publishLoading
											? 'bg-gray-300 text-gray-500 cursor-not-allowed'
											: 'bg-green-600 text-white hover:bg-green-700'
									}`}
								>
									{publishLoading ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											<span>Publishing...</span>
										</>
									) : (
										<span>Publish Selected</span>
									)}
								</button>
								{(filters.term || filters.academicYear || filters.status) && (
									<button
										onClick={handleClearFilters}
										className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[3px] font-medium transition-all duration-200"
									>
										Clear
									</button>
								)}
							</div>
						</div>

						{/* Advanced Filters */}
						{showFilters && (
							<div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{/* Term Filter */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
									<div className="relative">
										<input
											ref={termFilterInputRef}
											type="text"
											value={filters.term || termFilterQuery}
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
												if (filteredTermOptions.length > 0) {
													setShowTermFilterDropdown(true);
												}
												setTermFilterQuery('');
											}}
											placeholder="All Terms"
											className="w-full px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
										/>
										{showTermFilterDropdown && filteredTermOptions.length > 0 && (
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
												{filteredTermOptions.map((term, index) => (
													<button
														key={term}
														type="button"
														onClick={() => {
															handleFilterChange('term', term);
															setTermFilterQuery(term);
															setShowTermFilterDropdown(false);
														}}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															filters.term === term ? 'bg-primary-100 font-medium' : ''
														}`}
													>
														<div className="text-sm font-medium text-gray-900">{term}</div>
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
											value={
												filters.academicYear
													? availableAcademicYears.find((ay) => ay.academic_id === filters.academicYear)?.academic_name || academicYearFilterQuery
													: academicYearFilterQuery
											}
											onChange={(e) => {
												setAcademicYearFilterQuery(e.target.value);
												setShowAcademicYearFilterDropdown(true);
												setAcademicYearFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowAcademicYearFilterDropdown(false);
													handleFilterChange('academicYear', '');
												}
											}}
											onFocus={() => {
												if (filteredAcademicYearOptions.length > 0) {
													setShowAcademicYearFilterDropdown(true);
												}
												setAcademicYearFilterQuery('');
											}}
											placeholder="All Academic Years"
											className="w-full px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
										/>
										{showAcademicYearFilterDropdown && filteredAcademicYearOptions.length > 0 && (
											<div
												ref={academicYearFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('academicYear', '');
														setAcademicYearFilterQuery('');
														setShowAcademicYearFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Academic Years</div>
												</button>
												{filteredAcademicYearOptions.map((academicYear, index) => (
													<button
														key={academicYear.academic_id}
														type="button"
														onClick={() => {
															handleFilterChange('academicYear', academicYear.academic_id);
															setAcademicYearFilterQuery(academicYear.academic_name);
															setShowAcademicYearFilterDropdown(false);
														}}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															filters.academicYear === academicYear.academic_id ? 'bg-primary-100 font-medium' : ''
														}`}
													>
														<div className="text-sm font-medium text-gray-900">{academicYear.academic_name}</div>
														{academicYear.is_current && (
															<div className="text-xs text-primary-600">Current</div>
														)}
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
											value={filters.status || statusFilterQuery}
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
												setStatusFilterQuery('');
											}}
											placeholder="All Statuses"
											className="w-full px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
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
													<div className="text-sm font-medium text-gray-900">All Statuses</div>
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
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															filters.status === status ? 'bg-primary-100 font-medium' : ''
														}`}
													>
														<div className="text-sm font-medium text-gray-900">{status}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Test Marks Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
											<input
												type="checkbox"
												checked={paginatedTestMarks.length > 0 && paginatedTestMarks.every((mark) => selectedTestMarkIds.has(mark.test_mark_id))}
												onChange={(e) => handleSelectAll(e.target.checked)}
												className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
											/>
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Student
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Subject
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Class
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Academic Year
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Term
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Test Mark
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Avg Mark
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Status
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Published
										</th>
										<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{loading ? (
										<tr>
											<td colSpan={11} className="px-6 py-8 text-center">
												<div className="flex items-center justify-center">
													<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
												</div>
											</td>
										</tr>
									) : paginatedTestMarks.length === 0 ? (
										<tr>
											<td colSpan={11} className="px-6 py-8 text-center">
												<div className="flex flex-col items-center justify-center gap-3">
													<AcademicCapIcon className="w-12 h-12 text-gray-400" />
													<p className="text-gray-500 font-medium">No test marks found</p>
												</div>
											</td>
										</tr>
									) : (
										paginatedTestMarks.map((record) => (
											<tr key={record.test_mark_id || `row-${index}`} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap">
													<input
														type="checkbox"
														checked={selectedTestMarkIds.has(record.test_mark_id)}
														onChange={(e) => handleSelectOne(record.test_mark_id, e.target.checked)}
														className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
													/>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">{record.student_name || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">{record.subject_name || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">{record.class_name || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">
														{record.academic_year_name || 'N/A'}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">{record.term || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">
														{record.test_mark !== null && record.test_mark !== undefined 
															? Number(record.test_mark).toFixed(1) 
															: '0.0'}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">
														{record.test_avg_mark !== null && record.test_avg_mark !== undefined 
															? Number(record.test_avg_mark).toFixed(1) 
															: 'N/A'}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													{record.status ? (
														<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
															{record.status}
														</span>
													) : (
														<span className="text-sm text-gray-400">-</span>
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													{record.is_published ? (
														<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
															Published
														</span>
													) : (
														<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
															Unpublished
														</span>
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex items-center justify-end gap-2">
														<button
															onClick={() => handleView(record)}
															className="p-2 text-blue-600 hover:bg-blue-50 rounded-[3px] transition-colors"
															title="View"
														>
															<EyeIcon className="w-5 h-5" />
														</button>
														<button
															onClick={() => handleEdit(record)}
															className="p-2 text-green-600 hover:bg-green-50 rounded-[3px] transition-colors"
															title="Edit"
														>
															<PencilIcon className="w-5 h-5" />
														</button>
														<button
															onClick={() => handleUnpublish(record)}
															disabled={!record.is_published || publishLoading}
															className={`p-2 rounded-[3px] transition-colors ${
																record.is_published
																	? 'text-orange-600 hover:bg-orange-50'
																	: 'text-gray-400 cursor-not-allowed opacity-50'
															} disabled:opacity-50 disabled:cursor-not-allowed`}
															title={record.is_published ? 'Unpublish' : 'Not published'}
														>
															<EyeSlashIcon className="w-5 h-5" />
														</button>
														<button
															onClick={() => handleDelete(record)}
															className="p-2 text-red-600 hover:bg-red-50 rounded-[3px] transition-colors"
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
							<div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
								<div className="flex items-center gap-4">
									<span className="text-sm text-gray-700">
										Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTestMarks.length)} of{' '}
										{filteredTestMarks.length} records
									</span>
									<select
										value={itemsPerPage}
										onChange={(e) => {
											setItemsPerPage(Number(e.target.value));
											setCurrentPage(1);
										}}
										className="border border-gray-300 rounded-[3px] px-3 py-1 text-sm"
									>
										<option value={10}>10 per page</option>
										<option value={25}>25 per page</option>
										<option value={50}>50 per page</option>
										<option value={100}>100 per page</option>
									</select>
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
										disabled={currentPage === 1}
										className="px-3 py-1 border border-gray-300 rounded-[3px] text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
									>
										Previous
									</button>
									<span className="text-sm text-gray-700">
										Page {currentPage} of {totalPages}
									</span>
									<button
										onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
										disabled={currentPage === totalPages}
										className="px-3 py-1 border border-gray-300 rounded-[3px] text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
									>
										Next
									</button>
								</div>
							</div>
						)}
					</div>
				</main>
			</div>

			{/* Modals */}
			<TestMarksFilterModal
				isOpen={filterModalOpen}
				onClose={() => {
					setFilterModalOpen(false);
					setSelectedClassId('');
					setSelectedSubjectId('');
					setSelectedAcademicYearId('');
					setFilteredStudents([]);
				}}
				onProceed={handleFilterProceed}
				schoolId={schoolId || ''}
				teacherId={teacherId}
			/>

			<Modal isOpen={createModalOpen} onClose={() => {
				setCreateModalOpen(false);
				setFormDataToSubmit(null);
				setCreateConfirmOpen(false);
				setSelectedClassId('');
				setSelectedSubjectId('');
				setSelectedAcademicYearId('');
				setFilteredStudents([]);
			}} title="Enter Test Marks" size="2xl">
				<TestMarksForm
					testMark={null}
					onSubmit={handleCreateSubmit}
					onCancel={() => {
						setCreateModalOpen(false);
						setFormDataToSubmit(null);
						setCreateConfirmOpen(false);
						setSelectedClassId('');
						setSelectedSubjectId('');
						setSelectedAcademicYearId('');
						setFilteredStudents([]);
					}}
					loading={formLoading}
					mode="create"
					schoolId={schoolId || ''}
					preselectedClassId={selectedClassId}
					preselectedSubjectId={selectedSubjectId}
					preselectedAcademicYearId={selectedAcademicYearId}
					preselectedStudents={filteredStudents}
				/>
			</Modal>

			<Modal isOpen={editModalOpen} onClose={() => {
				setEditModalOpen(false);
				setFormDataToSubmit(null);
				setUpdateConfirmOpen(false);
			}} title="Edit Test Mark" size="xl">
				<TestMarksForm
					testMark={selectedTestMark}
					onSubmit={handleUpdateSubmit}
					onCancel={() => {
						setEditModalOpen(false);
						setFormDataToSubmit(null);
						setUpdateConfirmOpen(false);
					}}
					loading={formLoading}
					mode="edit"
					schoolId={schoolId || ''}
				/>
			</Modal>

			<TestMarksViewModal
				testMark={selectedTestMark}
				isOpen={viewModalOpen}
				onClose={() => setViewModalOpen(false)}
				onEdit={() => {
					setViewModalOpen(false);
					handleEdit(selectedTestMark!);
				}}
				onDelete={() => {
					setViewModalOpen(false);
					handleDelete(selectedTestMark!);
				}}
			/>

			<ConfirmModal
				isOpen={createConfirmOpen}
				onClose={() => {
					if (!formLoading) {
						setCreateConfirmOpen(false);
						setFormDataToSubmit(null);
						setCreateModalOpen(true);
					}
				}}
				onConfirm={handleCreateConfirm}
				title="Create Test Marks"
				message={
					Array.isArray(formDataToSubmit)
						? `Are you sure you want to create ${formDataToSubmit.length} test mark(s)?`
						: `Are you sure you want to create this test mark?`
				}
				confirmText="Create"
				cancelText="Cancel"
				type="info"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={updateConfirmOpen}
				onClose={() => {
					if (!formLoading) {
						setUpdateConfirmOpen(false);
						setFormDataToSubmit(null);
						setEditModalOpen(true);
					}
				}}
				onConfirm={handleUpdateConfirm}
				title="Update Test Mark"
				message={`Are you sure you want to update this test mark?`}
				confirmText="Update"
				cancelText="Cancel"
				type="warning"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={deleteConfirmOpen}
				onClose={() => {
					setDeleteConfirmOpen(false);
					setSelectedTestMark(null);
				}}
				onConfirm={handleDeleteConfirm}
				title="Delete Test Mark"
				message={`Are you sure you want to delete this test mark? This action cannot be undone.`}
				confirmText="Delete"
				cancelText="Cancel"
				type="danger"
				loading={deleteLoading}
			/>
		</div>
	);
}


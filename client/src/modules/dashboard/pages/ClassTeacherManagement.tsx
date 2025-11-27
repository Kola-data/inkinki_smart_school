import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import {
	AcademicCapIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
	SparklesIcon,
	CalendarIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import ClassTeacherForm from '../components/ClassTeacherForm';
import ClassTeacherViewModal from '../components/ClassTeacherViewModal';
import { isTeacher } from '../../../utils/rolePermissions';

interface ClassTeacherMember {
	id: string;
	teacher_id: string;
	subj_id: string;
	cls_id: string;
	start_date: string;
	end_date: string;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
	teacher_name: string | null;
	teacher_email: string | null;
	teacher_specialized: string | null;
	subject_name: string | null;
	class_name: string | null;
	class_type: string | null;
}

interface ClassOption {
	cls_id: string;
	cls_name: string;
	cls_type: string | null;
}

interface TeacherOption {
	teacher_id: string;
	staff_name: string | null;
	email: string | null;
	specialized: string | null;
}

interface SubjectOption {
	subj_id: string;
	subj_name: string;
}

interface FilterState {
	search: string;
	classFilter: string;
	teacherFilter: string;
	subjectFilter: string;
}

export default function ClassTeacherManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [assignments, setAssignments] = useState<ClassTeacherMember[]>([]);
	const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]);
	const [availableTeachers, setAvailableTeachers] = useState<TeacherOption[]>([]);
	const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		classFilter: '',
		teacherFilter: '',
		subjectFilter: '',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [showFilters, setShowFilters] = useState(false);

	// Autocomplete states for filter selects
	const [classFilterQuery, setClassFilterQuery] = useState('');
	const [showClassFilterDropdown, setShowClassFilterDropdown] = useState(false);
	const [classFilterHighlightedIndex, setClassFilterHighlightedIndex] = useState(-1);
	const classFilterDropdownRef = useRef<HTMLDivElement>(null);
	const classFilterInputRef = useRef<HTMLInputElement>(null);

	const [teacherFilterQuery, setTeacherFilterQuery] = useState('');
	const [showTeacherFilterDropdown, setShowTeacherFilterDropdown] = useState(false);
	const [teacherFilterHighlightedIndex, setTeacherFilterHighlightedIndex] = useState(-1);
	const teacherFilterDropdownRef = useRef<HTMLDivElement>(null);
	const teacherFilterInputRef = useRef<HTMLInputElement>(null);

	const [subjectFilterQuery, setSubjectFilterQuery] = useState('');
	const [showSubjectFilterDropdown, setShowSubjectFilterDropdown] = useState(false);
	const [subjectFilterHighlightedIndex, setSubjectFilterHighlightedIndex] = useState(-1);
	const subjectFilterDropdownRef = useRef<HTMLDivElement>(null);
	const subjectFilterInputRef = useRef<HTMLInputElement>(null);

	// Close filter dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				classFilterDropdownRef.current &&
				!classFilterDropdownRef.current.contains(event.target as Node) &&
				classFilterInputRef.current &&
				!classFilterInputRef.current.contains(event.target as Node)
			) {
				setShowClassFilterDropdown(false);
			}
			if (
				teacherFilterDropdownRef.current &&
				!teacherFilterDropdownRef.current.contains(event.target as Node) &&
				teacherFilterInputRef.current &&
				!teacherFilterInputRef.current.contains(event.target as Node)
			) {
				setShowTeacherFilterDropdown(false);
			}
			if (
				subjectFilterDropdownRef.current &&
				!subjectFilterDropdownRef.current.contains(event.target as Node) &&
				subjectFilterInputRef.current &&
				!subjectFilterInputRef.current.contains(event.target as Node)
			) {
				setShowSubjectFilterDropdown(false);
			}
		};

		if (showClassFilterDropdown || showTeacherFilterDropdown || showSubjectFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showClassFilterDropdown, showTeacherFilterDropdown, showSubjectFilterDropdown]);

	// Modal states
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [selectedAssignment, setSelectedAssignment] = useState<ClassTeacherMember | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<ClassTeacherMember> | null>(null);
	const [formLoading, setFormLoading] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

	// Get school ID from logged-in user's staff data
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

	// Fetch class teacher assignments
	useEffect(() => {
		const fetchAssignments = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/class-teachers/?school_id=${schoolId}&_t=${timestamp}`);
				setAssignments(getArrayFromResponse(data));
			} catch (error: any) {
				const errorMessage = error.response?.data?.detail || 'Failed to fetch teaching schedule';
				if (error.response?.status !== 403) {
					toast.error(errorMessage);
				}} finally {
				setLoading(false);
			}
		};

		fetchAssignments();
	}, [schoolId]);

	// Fetch available classes, teachers, and subjects
	useEffect(() => {
		const fetchOptions = async () => {
			if (!schoolId || !createModalOpen) return;

			try {
				const timestamp = new Date().getTime();

				// Fetch classes
				const classesResponse = await api.get(`/classes/?school_id=${schoolId}&_t=${timestamp}`);
				const classesData = classesResponse.data?.items || classesResponse.data || [];
				const classes: ClassOption[] = Array.isArray(classesData) ? classesData.map((c: any) => ({
					cls_id: c.cls_id,
					cls_name: c.cls_name,
					cls_type: c.cls_type,
				})) : [];
				setAvailableClasses(classes);

				// Fetch teachers
				const teachersResponse = await api.get(`/teachers/?school_id=${schoolId}&_t=${timestamp}`);
				const teachersData = teachersResponse.data?.items || teachersResponse.data || [];
				const teachers = Array.isArray(teachersData) ? teachersData.filter((t: any) => t.is_active) : [];
				const mappedTeachers: TeacherOption[] = teachers.map((t: any) => ({
					teacher_id: t.teacher_id,
					staff_name: t.staff_name,
					email: t.staff_email,
					specialized: t.specialized,
				}));
				setAvailableTeachers(mappedTeachers);

				// Fetch subjects
				const subjectsResponse = await api.get(`/subjects/?school_id=${schoolId}&_t=${timestamp}`);
				const subjectsData = subjectsResponse.data?.items || subjectsResponse.data || [];
				const subjects: SubjectOption[] = Array.isArray(subjectsData) ? subjectsData.map((s: any) => ({
					subj_id: s.subj_id,
					subj_name: s.subj_name,
				})) : [];
				setAvailableSubjects(subjects);
			} catch (error: any) {setAvailableClasses([]);
				setAvailableTeachers([]);
				setAvailableSubjects([]);
			}
		};

		if (createModalOpen && schoolId) {
			fetchOptions();
		}
	}, [createModalOpen, schoolId]);

	// Also fetch when edit modal opens
	useEffect(() => {
		const fetchOptions = async () => {
			if (!schoolId || !editModalOpen) return;

			try {
				const timestamp = new Date().getTime();

				const classesResponse = await api.get(`/classes/?school_id=${schoolId}&_t=${timestamp}`);
				const classesData = classesResponse.data?.items || classesResponse.data || [];
				const classes: ClassOption[] = Array.isArray(classesData) ? classesData.map((c: any) => ({
					cls_id: c.cls_id,
					cls_name: c.cls_name,
					cls_type: c.cls_type,
				})) : [];
				setAvailableClasses(classes);

				const teachersResponse = await api.get(`/teachers/?school_id=${schoolId}&_t=${timestamp}`);
				const teachersData = teachersResponse.data?.items || teachersResponse.data || [];
				const teachers = Array.isArray(teachersData) ? teachersData.filter((t: any) => t.is_active) : [];
				const mappedTeachers: TeacherOption[] = teachers.map((t: any) => ({
					teacher_id: t.teacher_id,
					staff_name: t.staff_name,
					email: t.staff_email,
					specialized: t.specialized,
				}));
				setAvailableTeachers(mappedTeachers);

				const subjectsResponse = await api.get(`/subjects/?school_id=${schoolId}&_t=${timestamp}`);
				const subjectsData = subjectsResponse.data?.items || subjectsResponse.data || [];
				const subjects: SubjectOption[] = Array.isArray(subjectsData) ? subjectsData.map((s: any) => ({
					subj_id: s.subj_id,
					subj_name: s.subj_name,
				})) : [];
				setAvailableSubjects(subjects);
			} catch (error: any) {}
		};

		if (editModalOpen && schoolId) {
			fetchOptions();
		}
	}, [editModalOpen, schoolId]);

	// Filtered assignments
	const filteredAssignments = useMemo(() => {
		return assignments.filter((assignment) => {
			const matchesSearch = !filters.search || 
				assignment.class_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				assignment.subject_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				assignment.teacher_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				assignment.teacher_email?.toLowerCase().includes(filters.search.toLowerCase());
			
			const matchesClass = !filters.classFilter || assignment.cls_id === filters.classFilter;
			const matchesTeacher = !filters.teacherFilter || assignment.teacher_id === filters.teacherFilter;
			const matchesSubject = !filters.subjectFilter || assignment.subj_id === filters.subjectFilter;
			
			return matchesSearch && matchesClass && matchesTeacher && matchesSubject;
		});
	}, [assignments, filters]);

	// Pagination
	const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedAssignments = useMemo(() => {
		return filteredAssignments.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredAssignments, startIndex, itemsPerPage]);

	// Analytics
	const analytics = useMemo(() => {
		return {
			total: filteredAssignments.length,
		};
	}, [filteredAssignments]);

	// Unique values for filters
	const uniqueClasses = useMemo(() => {
		return Array.from(new Set(assignments.map(a => ({ cls_id: a.cls_id, cls_name: a.class_name }))))
			.filter(c => c.cls_id && c.cls_name)
			.sort((a, b) => (a.cls_name || '').localeCompare(b.cls_name || ''));
	}, [assignments]);

	const uniqueTeachers = useMemo(() => {
		return Array.from(new Set(assignments.map(a => ({ teacher_id: a.teacher_id, teacher_name: a.teacher_name }))))
			.filter(t => t.teacher_id && t.teacher_name)
			.sort((a, b) => (a.teacher_name || '').localeCompare(b.teacher_name || ''));
	}, [assignments]);

	const uniqueSubjects = useMemo(() => {
		return Array.from(new Set(assignments.map(a => ({ subj_id: a.subj_id, subj_name: a.subject_name }))))
			.filter(s => s.subj_id && s.subj_name)
			.sort((a, b) => (a.subj_name || '').localeCompare(b.subj_name || ''));
	}, [assignments]);

	// Filter options based on search queries
	const filteredClassOptions = useMemo(() => {
		if (!classFilterQuery.trim()) return uniqueClasses;
		const query = classFilterQuery.toLowerCase();
		return uniqueClasses.filter((cls) => cls.cls_name?.toLowerCase().includes(query));
	}, [uniqueClasses, classFilterQuery]);

	const filteredTeacherOptions = useMemo(() => {
		if (!teacherFilterQuery.trim()) return uniqueTeachers;
		const query = teacherFilterQuery.toLowerCase();
		return uniqueTeachers.filter((teacher) => teacher.teacher_name?.toLowerCase().includes(query));
	}, [uniqueTeachers, teacherFilterQuery]);

	const filteredSubjectOptions = useMemo(() => {
		if (!subjectFilterQuery.trim()) return uniqueSubjects;
		const query = subjectFilterQuery.toLowerCase();
		return uniqueSubjects.filter((subject) => subject.subj_name?.toLowerCase().includes(query));
	}, [uniqueSubjects, subjectFilterQuery]);

	// Get selected filter values for display
	const selectedClassFilter = uniqueClasses.find((c) => c.cls_id === filters.classFilter);
	const selectedTeacherFilter = uniqueTeachers.find((t) => t.teacher_id === filters.teacherFilter);
	const selectedSubjectFilter = uniqueSubjects.find((s) => s.subj_id === filters.subjectFilter);

	// Handle filter changes
	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters(prev => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const resetFilters = () => {
		setFilters({ search: '', classFilter: '', teacherFilter: '', subjectFilter: '' });
		setClassFilterQuery('');
		setTeacherFilterQuery('');
		setSubjectFilterQuery('');
		setCurrentPage(1);
	};

	const handleClassFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showClassFilterDropdown || filteredClassOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setClassFilterHighlightedIndex((prev) => (prev < filteredClassOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setClassFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (classFilterHighlightedIndex >= 0 && classFilterHighlightedIndex < filteredClassOptions.length) {
					const selectedClass = filteredClassOptions[classFilterHighlightedIndex];
					handleFilterChange('classFilter', selectedClass.cls_id);
					setClassFilterQuery(selectedClass.cls_name || '');
					setShowClassFilterDropdown(false);
				} else if (classFilterHighlightedIndex === -1 && filteredClassOptions.length === 1) {
					const selectedClass = filteredClassOptions[0];
					handleFilterChange('classFilter', selectedClass.cls_id);
					setClassFilterQuery(selectedClass.cls_name || '');
					setShowClassFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowClassFilterDropdown(false);
				setClassFilterHighlightedIndex(-1);
				break;
		}
	};

	const handleTeacherFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showTeacherFilterDropdown || filteredTeacherOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setTeacherFilterHighlightedIndex((prev) => (prev < filteredTeacherOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setTeacherFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (teacherFilterHighlightedIndex >= 0 && teacherFilterHighlightedIndex < filteredTeacherOptions.length) {
					const selectedTeacher = filteredTeacherOptions[teacherFilterHighlightedIndex];
					handleFilterChange('teacherFilter', selectedTeacher.teacher_id);
					setTeacherFilterQuery(selectedTeacher.teacher_name || '');
					setShowTeacherFilterDropdown(false);
				} else if (teacherFilterHighlightedIndex === -1 && filteredTeacherOptions.length === 1) {
					const selectedTeacher = filteredTeacherOptions[0];
					handleFilterChange('teacherFilter', selectedTeacher.teacher_id);
					setTeacherFilterQuery(selectedTeacher.teacher_name || '');
					setShowTeacherFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowTeacherFilterDropdown(false);
				setTeacherFilterHighlightedIndex(-1);
				break;
		}
	};

	const handleSubjectFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showSubjectFilterDropdown || filteredSubjectOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setSubjectFilterHighlightedIndex((prev) => (prev < filteredSubjectOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setSubjectFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (subjectFilterHighlightedIndex >= 0 && subjectFilterHighlightedIndex < filteredSubjectOptions.length) {
					const selectedSubject = filteredSubjectOptions[subjectFilterHighlightedIndex];
					handleFilterChange('subjectFilter', selectedSubject.subj_id);
					setSubjectFilterQuery(selectedSubject.subj_name || '');
					setShowSubjectFilterDropdown(false);
				} else if (subjectFilterHighlightedIndex === -1 && filteredSubjectOptions.length === 1) {
					const selectedSubject = filteredSubjectOptions[0];
					handleFilterChange('subjectFilter', selectedSubject.subj_id);
					setSubjectFilterQuery(selectedSubject.subj_name || '');
					setShowSubjectFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowSubjectFilterDropdown(false);
				setSubjectFilterHighlightedIndex(-1);
				break;
		}
	};

	// Format date
	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	const toggleSidebar = () => {
		setSidebarOpen(!sidebarOpen);
	};

	// Refresh assignments data with cache busting
	const refreshAssignments = async () => {
		if (!schoolId) {
			console.warn('Cannot refresh assignments: schoolId is missing');
			return;
		}

		try {
			const timestamp = new Date().getTime();
			const { data } = await api.get(`/class-teachers/?school_id=${schoolId}&_t=${timestamp}`);
			
			// Handle paginated response
			let newAssignmentsData: ClassTeacherMember[] = [];
			if (data && Array.isArray(data.items)) {
				newAssignmentsData = data.items;
			} else if (Array.isArray(data)) {
				newAssignmentsData = data;
			} else {
				newAssignmentsData = getArrayFromResponse(data);
			}
			
			// Force state update by creating a new array reference
			setAssignments([...newAssignmentsData]);
			setCurrentPage(1);
		} catch (error: any) {
			console.error('Refresh assignments error:', error);
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to refresh assignments data';
			toast.error(errorMessage);
		}
	};

	// Handle Create (form submission - shows confirm)
	const handleCreateSubmit = async (formData: Partial<ClassTeacherMember>) => {
		setFormDataToSubmit(formData);
		setCreateModalOpen(false);
		setCreateConfirmOpen(true);
	};

	// Handle Create (after confirmation)
	const handleCreateConfirm = async () => {
		if (!schoolId || !formDataToSubmit) {
			toast.error('School information not found');
			return;
		}

		setFormLoading(true);
		try {
			await api.post(`/class-teachers/?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Teaching schedule entry created successfully!');
			setCreateConfirmOpen(false);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshAssignments();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to create schedule entry');
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Update (form submission - shows confirm)
	const handleUpdateSubmit = async (formData: Partial<ClassTeacherMember>) => {
		setFormDataToSubmit(formData);
		setEditModalOpen(false);
		setUpdateConfirmOpen(true);
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!selectedAssignment || !schoolId || !formDataToSubmit) return;

		setFormLoading(true);
		try {
			await api.put(`/class-teachers/${selectedAssignment.id}?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Teaching schedule entry updated successfully!');
			setUpdateConfirmOpen(false);
			setSelectedAssignment(null);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshAssignments();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to update schedule entry');
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDelete = async () => {
		if (!selectedAssignment || !schoolId) return;

		setDeleteLoading(true);
		try {
			await api.delete(`/class-teachers/${selectedAssignment.id}?school_id=${schoolId}`);
			toast.success('Teaching schedule entry deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedAssignment(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshAssignments();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to delete schedule entry');
		} finally {
			setDeleteLoading(false);
		}
	};

	// Open modals
	const openViewModal = (assignment: ClassTeacherMember) => {
		setSelectedAssignment(assignment);
		setViewModalOpen(true);
	};

	const openEditModal = (assignment: ClassTeacherMember) => {
		setSelectedAssignment(assignment);
		setViewModalOpen(false);
		setEditModalOpen(true);
	};

	const openDeleteConfirm = (assignment: ClassTeacherMember) => {
		setSelectedAssignment(assignment);
		setViewModalOpen(false);
		setDeleteConfirmOpen(true);
	};

	const openCreateModal = () => {
		setSelectedAssignment(null);
		setCreateModalOpen(true);
	};

	if (loading) {
		return (
			<div className="flex bg-gray-50 min-h-screen">
				<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:ml-64">
					<Topbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
					<main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
							<p className="mt-4 text-gray-600">Loading teaching schedule...</p>
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
					<Topbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
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
				<Topbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
				<main className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Teaching Schedule</h1>
							<p className="text-gray-600 mt-1">Assign teachers to subjects and classes</p>
						</div>
						{!isTeacher() && (
							<button
								onClick={openCreateModal}
								className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-[3px] shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
							>
								<PlusIcon className="w-5 h-5" />
								<span>Add Schedule</span>
							</button>
						)}
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Schedule Entries</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<AcademicCapIcon className="w-6 h-6 text-blue-600" />
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
									placeholder="Search by class, subject, or teacher..."
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
								{(filters.classFilter || filters.teacherFilter || filters.subjectFilter) && (
									<button
										onClick={resetFilters}
										className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[3px] font-medium transition-all duration-200"
									>
										Clear
									</button>
								)}
							</div>
						</div>

						{/* Advanced Filters */}
						{showFilters && (
							<div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
									<div className="relative">
										<input
											ref={classFilterInputRef}
											type="text"
											value={selectedClassFilter ? (selectedClassFilter.cls_name || '') : classFilterQuery}
											onChange={(e) => {
												setClassFilterQuery(e.target.value);
												setShowClassFilterDropdown(true);
												setClassFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowClassFilterDropdown(false);
													handleFilterChange('classFilter', '');
												}
											}}
											onFocus={() => {
												if (filteredClassOptions.length > 0) {
													setShowClassFilterDropdown(true);
												}
											}}
											onKeyDown={handleClassFilterKeyDown}
											placeholder="All Classes"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showClassFilterDropdown && filteredClassOptions.length > 0 && (
											<div
												ref={classFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('classFilter', '');
														setClassFilterQuery('');
														setShowClassFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Classes</div>
												</button>
												{filteredClassOptions.map((cls, index) => (
													<button
														key={cls.cls_id}
														type="button"
														onClick={() => {
															handleFilterChange('classFilter', cls.cls_id);
															setClassFilterQuery(cls.cls_name || '');
															setShowClassFilterDropdown(false);
														}}
														onMouseEnter={() => setClassFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === classFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.classFilter === cls.cls_id ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">{cls.cls_name}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Teacher</label>
									<div className="relative">
										<input
											ref={teacherFilterInputRef}
											type="text"
											value={selectedTeacherFilter ? (selectedTeacherFilter.teacher_name || '') : teacherFilterQuery}
											onChange={(e) => {
												setTeacherFilterQuery(e.target.value);
												setShowTeacherFilterDropdown(true);
												setTeacherFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowTeacherFilterDropdown(false);
													handleFilterChange('teacherFilter', '');
												}
											}}
											onFocus={() => {
												if (filteredTeacherOptions.length > 0) {
													setShowTeacherFilterDropdown(true);
												}
											}}
											onKeyDown={handleTeacherFilterKeyDown}
											placeholder="All Teachers"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showTeacherFilterDropdown && filteredTeacherOptions.length > 0 && (
											<div
												ref={teacherFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('teacherFilter', '');
														setTeacherFilterQuery('');
														setShowTeacherFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Teachers</div>
												</button>
												{filteredTeacherOptions.map((teacher, index) => (
													<button
														key={teacher.teacher_id}
														type="button"
														onClick={() => {
															handleFilterChange('teacherFilter', teacher.teacher_id);
															setTeacherFilterQuery(teacher.teacher_name || '');
															setShowTeacherFilterDropdown(false);
														}}
														onMouseEnter={() => setTeacherFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === teacherFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.teacherFilter === teacher.teacher_id ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">{teacher.teacher_name}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
									<div className="relative">
										<input
											ref={subjectFilterInputRef}
											type="text"
											value={selectedSubjectFilter ? (selectedSubjectFilter.subj_name || '') : subjectFilterQuery}
											onChange={(e) => {
												setSubjectFilterQuery(e.target.value);
												setShowSubjectFilterDropdown(true);
												setSubjectFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowSubjectFilterDropdown(false);
													handleFilterChange('subjectFilter', '');
												}
											}}
											onFocus={() => {
												if (filteredSubjectOptions.length > 0) {
													setShowSubjectFilterDropdown(true);
												}
											}}
											onKeyDown={handleSubjectFilterKeyDown}
											placeholder="All Subjects"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showSubjectFilterDropdown && filteredSubjectOptions.length > 0 && (
											<div
												ref={subjectFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('subjectFilter', '');
														setSubjectFilterQuery('');
														setShowSubjectFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Subjects</div>
												</button>
												{filteredSubjectOptions.map((subject, index) => (
													<button
														key={subject.subj_id}
														type="button"
														onClick={() => {
															handleFilterChange('subjectFilter', subject.subj_id);
															setSubjectFilterQuery(subject.subj_name || '');
															setShowSubjectFilterDropdown(false);
														}}
														onMouseEnter={() => setSubjectFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === subjectFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.subjectFilter === subject.subj_id ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">{subject.subj_name}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Assignments Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Class
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Subject
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Teacher
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Period
										</th>
										<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{paginatedAssignments.length === 0 ? (
										<tr>
											<td colSpan={5} className="px-6 py-12 text-center">
												<div className="flex flex-col items-center gap-3">
													<AcademicCapIcon className="w-12 h-12 text-gray-400" />
									<p className="text-gray-500 font-medium">No schedule entries found</p>
									<p className="text-sm text-gray-400">Try adjusting your filters or create a new schedule entry</p>
												</div>
											</td>
										</tr>
									) : (
										paginatedAssignments.map((assignment) => (
											<tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
												<td className="px-6 py-4 whitespace-nowrap">
													<div>
														<div className="text-sm font-semibold text-gray-900">{assignment.class_name || 'N/A'}</div>
														{assignment.class_type && (
															<span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-xs font-medium bg-blue-100 text-blue-800 mt-1">
																{assignment.class_type}
															</span>
														)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">{assignment.subject_name || 'N/A'}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div>
														<div className="text-sm font-medium text-gray-900">{assignment.teacher_name || 'N/A'}</div>
														{assignment.teacher_email && (
															<div className="text-xs text-gray-500">{assignment.teacher_email}</div>
														)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center gap-2 text-sm text-gray-600">
														<CalendarIcon className="w-4 h-4 text-gray-400" />
														<span>{formatDate(assignment.start_date)} - {formatDate(assignment.end_date)}</span>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex items-center justify-end gap-2">
														<button
															onClick={() => openViewModal(assignment)}
															className="p-2 text-blue-600 hover:bg-blue-50 rounded-[3px] transition-colors"
															title="View"
														>
															<EyeIcon className="w-5 h-5" />
														</button>
														{!isTeacher() && (
															<>
																<button
																	onClick={() => openEditModal(assignment)}
																	className="p-2 text-green-600 hover:bg-green-50 rounded-[3px] transition-colors"
																	title="Edit"
																>
																	<PencilIcon className="w-5 h-5" />
																</button>
																<button
																	onClick={() => openDeleteConfirm(assignment)}
																	className="p-2 text-red-600 hover:bg-red-50 rounded-[3px] transition-colors"
																	title="Delete"
																>
																	<TrashIcon className="w-5 h-5" />
																</button>
															</>
														)}
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
								<div className="text-sm text-gray-600">
									Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAssignments.length)} of {filteredAssignments.length} schedule entries
								</div>
							</div>
						)}
					</div>
				</main>
			</div>

			{/* Modals */}
			<Modal
				isOpen={createModalOpen}
				onClose={() => setCreateModalOpen(false)}
					title="Add to Teaching Schedule"
				size="xl"
			>
				<ClassTeacherForm
					availableClasses={availableClasses}
					availableTeachers={availableTeachers}
					availableSubjects={availableSubjects}
					onSubmit={handleCreateSubmit}
					onCancel={() => setCreateModalOpen(false)}
					loading={formLoading}
					mode="create"
				/>
			</Modal>

			<Modal
				isOpen={editModalOpen}
				onClose={() => {
					setEditModalOpen(false);
					setSelectedAssignment(null);
				}}
				title="Edit Schedule Entry"
				size="xl"
			>
				{selectedAssignment && (
					<ClassTeacherForm
						assignment={selectedAssignment}
						availableClasses={availableClasses}
						availableTeachers={availableTeachers}
						availableSubjects={availableSubjects}
						onSubmit={handleUpdateSubmit}
						onCancel={() => {
							setEditModalOpen(false);
							setSelectedAssignment(null);
						}}
						loading={formLoading}
						mode="edit"
					/>
				)}
			</Modal>

			{selectedAssignment && (
				<ClassTeacherViewModal
					assignment={selectedAssignment}
					isOpen={viewModalOpen}
					onClose={() => {
						setViewModalOpen(false);
						setSelectedAssignment(null);
					}}
					onEdit={() => openEditModal(selectedAssignment)}
					onDelete={() => openDeleteConfirm(selectedAssignment)}
				/>
			)}

			<ConfirmModal
				isOpen={createConfirmOpen}
				onClose={() => {
					setCreateConfirmOpen(false);
					setFormDataToSubmit(null);
				}}
				onConfirm={handleCreateConfirm}
				title="Create Schedule Entry"
				message="Are you sure you want to create this teaching schedule entry?"
				confirmText="Create"
				type="info"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={updateConfirmOpen}
				onClose={() => {
					setUpdateConfirmOpen(false);
					setFormDataToSubmit(null);
				}}
				onConfirm={handleUpdateConfirm}
				title="Update Schedule Entry"
				message="Are you sure you want to update this teaching schedule entry?"
				confirmText="Update"
				type="info"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={deleteConfirmOpen}
				onClose={() => {
					setDeleteConfirmOpen(false);
					setSelectedAssignment(null);
				}}
				onConfirm={handleDelete}
				title="Delete Schedule Entry"
				message="Are you sure you want to delete this teaching schedule entry? This action cannot be undone."
				confirmText="Delete"
				type="danger"
				loading={deleteLoading}
			/>
		</div>
	);
}


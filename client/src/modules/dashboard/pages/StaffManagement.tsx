import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
	UserGroupIcon,
	CheckCircleIcon,
	PauseCircleIcon,
	SparklesIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import StaffForm from '../components/StaffForm';
import StaffViewModal from '../components/StaffViewModal';
import { getArrayFromResponse } from '../../../utils/apiHelpers';

interface StaffMember {
	staff_id: string;
	staff_name: string;
	email: string;
	staff_title: string | null;
	staff_role: string | null;
	employment_type: string | null;
	staff_gender: string | null;
	staff_dob: string | null;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
	qualifications: string | null;
	experience: string | null;
	staff_profile: string | null;
	staff_nid_photo: string | null;
	phone: string | null;
}

interface FilterState {
	search: string;
	role: string;
	employmentType: string;
	status: string;
	gender: string;
}

const API_BASE_URL = 'http://localhost:8000';

export default function StaffManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [staff, setStaff] = useState<StaffMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		role: '',
		employmentType: '',
		status: '',
		gender: '',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [showFilters, setShowFilters] = useState(false);
	const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);
	const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);

	// Autocomplete states for filter selects
	const [roleFilterQuery, setRoleFilterQuery] = useState('');
	const [showRoleFilterDropdown, setShowRoleFilterDropdown] = useState(false);
	const [roleFilterHighlightedIndex, setRoleFilterHighlightedIndex] = useState(-1);
	const roleFilterDropdownRef = useRef<HTMLDivElement>(null);
	const roleFilterInputRef = useRef<HTMLInputElement>(null);

	const [employmentTypeFilterQuery, setEmploymentTypeFilterQuery] = useState('');
	const [showEmploymentTypeFilterDropdown, setShowEmploymentTypeFilterDropdown] = useState(false);
	const [employmentTypeFilterHighlightedIndex, setEmploymentTypeFilterHighlightedIndex] = useState(-1);
	const employmentTypeFilterDropdownRef = useRef<HTMLDivElement>(null);
	const employmentTypeFilterInputRef = useRef<HTMLInputElement>(null);

	const [statusFilterQuery, setStatusFilterQuery] = useState('');
	const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
	const [statusFilterHighlightedIndex, setStatusFilterHighlightedIndex] = useState(-1);
	const statusFilterDropdownRef = useRef<HTMLDivElement>(null);
	const statusFilterInputRef = useRef<HTMLInputElement>(null);

	const [genderFilterQuery, setGenderFilterQuery] = useState('');
	const [showGenderFilterDropdown, setShowGenderFilterDropdown] = useState(false);
	const [genderFilterHighlightedIndex, setGenderFilterHighlightedIndex] = useState(-1);
	const genderFilterDropdownRef = useRef<HTMLDivElement>(null);
	const genderFilterInputRef = useRef<HTMLInputElement>(null);

	const roleOptions = ['admin', 'teacher', 'accountant'];
	const employmentTypeOptions = ['Full-time', 'Part-time', 'Contract', 'Temporary'];
	const statusOptions = ['active', 'inactive'];
	const genderOptions = ['Male', 'Female'];

	// Modal states
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<StaffMember> | null>(null);
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

	// Filter options based on search queries
	const filteredRoleOptions = roleOptions.filter((role) => {
		if (!roleFilterQuery.trim()) return true;
		return role.toLowerCase().includes(roleFilterQuery.toLowerCase());
	});

	const filteredEmploymentTypeOptions = employmentTypeOptions.filter((type) => {
		if (!employmentTypeFilterQuery.trim()) return true;
		return type.toLowerCase().includes(employmentTypeFilterQuery.toLowerCase());
	});

	const filteredStatusOptions = statusOptions.filter((status) => {
		if (!statusFilterQuery.trim()) return true;
		return status.toLowerCase().includes(statusFilterQuery.toLowerCase());
	});

	const filteredGenderOptions = genderOptions.filter((gender) => {
		if (!genderFilterQuery.trim()) return true;
		return gender.toLowerCase().includes(genderFilterQuery.toLowerCase());
	});

	// Close filter dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				roleFilterDropdownRef.current &&
				!roleFilterDropdownRef.current.contains(event.target as Node) &&
				roleFilterInputRef.current &&
				!roleFilterInputRef.current.contains(event.target as Node)
			) {
				setShowRoleFilterDropdown(false);
			}
			if (
				employmentTypeFilterDropdownRef.current &&
				!employmentTypeFilterDropdownRef.current.contains(event.target as Node) &&
				employmentTypeFilterInputRef.current &&
				!employmentTypeFilterInputRef.current.contains(event.target as Node)
			) {
				setShowEmploymentTypeFilterDropdown(false);
			}
			if (
				statusFilterDropdownRef.current &&
				!statusFilterDropdownRef.current.contains(event.target as Node) &&
				statusFilterInputRef.current &&
				!statusFilterInputRef.current.contains(event.target as Node)
			) {
				setShowStatusFilterDropdown(false);
			}
			if (
				genderFilterDropdownRef.current &&
				!genderFilterDropdownRef.current.contains(event.target as Node) &&
				genderFilterInputRef.current &&
				!genderFilterInputRef.current.contains(event.target as Node)
			) {
				setShowGenderFilterDropdown(false);
			}
		};

		if (showRoleFilterDropdown || showEmploymentTypeFilterDropdown || showStatusFilterDropdown || showGenderFilterDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showRoleFilterDropdown, showEmploymentTypeFilterDropdown, showStatusFilterDropdown, showGenderFilterDropdown]);

	// Fetch staff data using school_id from logged-in user
	useEffect(() => {
		const fetchStaff = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				// Request with pagination to get all staff (page_size=100 should be enough)
				const { data } = await api.get(`/staff/?school_id=${schoolId}&page=1&page_size=100`);
				// Handle paginated response - data.items contains the array
				if (data && Array.isArray(data.items)) {
					setStaff(data.items);
				} else if (Array.isArray(data)) {
					// Fallback for non-paginated response
					setStaff(data);
				} else {
					// Use helper function as fallback
					setStaff(getArrayFromResponse(data));
				}
			} catch (error: any) {
				console.error('Fetch staff error:', error);
				const errorMessage = error.response?.data?.detail || error.message || 'Failed to load staff';
				toast.error(errorMessage);
				setStaff([]);
			} finally {
				setLoading(false);
			}
		};

		fetchStaff();
	}, [schoolId]);

	// Filter and paginate staff
	const filteredStaff = useMemo(() => {
		let filtered = staff.filter((member) => !member.is_deleted);

		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			filtered = filtered.filter(
				(member) =>
					member.staff_name?.toLowerCase().includes(searchLower) ||
					member.email?.toLowerCase().includes(searchLower) ||
					member.staff_title?.toLowerCase().includes(searchLower)
			);
		}

		if (filters.role) {
			filtered = filtered.filter((member) => member.staff_role === filters.role);
		}

		if (filters.employmentType) {
			filtered = filtered.filter((member) => member.employment_type === filters.employmentType);
		}

		if (filters.status) {
			if (filters.status === 'active') {
				filtered = filtered.filter((member) => member.is_active);
			} else if (filters.status === 'inactive') {
				filtered = filtered.filter((member) => !member.is_active);
			}
		}

		if (filters.gender) {
			filtered = filtered.filter((member) => member.staff_gender === filters.gender);
		}

		return filtered;
	}, [staff, filters]);

	// Pagination
	const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedStaff = filteredStaff.slice(startIndex, startIndex + itemsPerPage);

	// Analytics
	const analytics = useMemo(() => {
		const total = filteredStaff.length;
		const active = filteredStaff.filter((s) => s.is_active).length;
		const inactive = total - active;
		
		const roles = filteredStaff.reduce((acc, member) => {
			const role = member.staff_role || 'Not Assigned';
			acc[role] = (acc[role] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		const employmentTypes = filteredStaff.reduce((acc, member) => {
			const type = member.employment_type || 'Not Specified';
			acc[type] = (acc[type] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		return {
			total,
			active,
			inactive,
			roles,
			employmentTypes,
		};
	}, [filteredStaff]);

	// Reset filters
	const resetFilters = () => {
		setFilters({
			search: '',
			role: '',
			employmentType: '',
			status: '',
			gender: '',
		});
		setRoleFilterQuery('');
		setEmploymentTypeFilterQuery('');
		setStatusFilterQuery('');
		setGenderFilterQuery('');
		setCurrentPage(1);
	};

	// Keyboard navigation and selection handlers for filters
	const handleRoleFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showRoleFilterDropdown || filteredRoleOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setRoleFilterHighlightedIndex((prev) => (prev < filteredRoleOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setRoleFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (roleFilterHighlightedIndex >= 0 && roleFilterHighlightedIndex < filteredRoleOptions.length) {
					const selectedRole = filteredRoleOptions[roleFilterHighlightedIndex];
					handleFilterChange('role', selectedRole);
					setRoleFilterQuery(selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1));
					setShowRoleFilterDropdown(false);
				} else if (roleFilterHighlightedIndex === -1 && filteredRoleOptions.length === 1) {
					const selectedRole = filteredRoleOptions[0];
					handleFilterChange('role', selectedRole);
					setRoleFilterQuery(selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1));
					setShowRoleFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowRoleFilterDropdown(false);
				setRoleFilterHighlightedIndex(-1);
				break;
		}
	};

	const handleEmploymentTypeFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showEmploymentTypeFilterDropdown || filteredEmploymentTypeOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setEmploymentTypeFilterHighlightedIndex((prev) => (prev < filteredEmploymentTypeOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setEmploymentTypeFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (employmentTypeFilterHighlightedIndex >= 0 && employmentTypeFilterHighlightedIndex < filteredEmploymentTypeOptions.length) {
					const selectedType = filteredEmploymentTypeOptions[employmentTypeFilterHighlightedIndex];
					handleFilterChange('employmentType', selectedType);
					setEmploymentTypeFilterQuery(selectedType);
					setShowEmploymentTypeFilterDropdown(false);
				} else if (employmentTypeFilterHighlightedIndex === -1 && filteredEmploymentTypeOptions.length === 1) {
					const selectedType = filteredEmploymentTypeOptions[0];
					handleFilterChange('employmentType', selectedType);
					setEmploymentTypeFilterQuery(selectedType);
					setShowEmploymentTypeFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowEmploymentTypeFilterDropdown(false);
				setEmploymentTypeFilterHighlightedIndex(-1);
				break;
		}
	};

	const handleStatusFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showStatusFilterDropdown || filteredStatusOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setStatusFilterHighlightedIndex((prev) => (prev < filteredStatusOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setStatusFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (statusFilterHighlightedIndex >= 0 && statusFilterHighlightedIndex < filteredStatusOptions.length) {
					const selectedStatus = filteredStatusOptions[statusFilterHighlightedIndex];
					handleFilterChange('status', selectedStatus);
					setStatusFilterQuery(selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1));
					setShowStatusFilterDropdown(false);
				} else if (statusFilterHighlightedIndex === -1 && filteredStatusOptions.length === 1) {
					const selectedStatus = filteredStatusOptions[0];
					handleFilterChange('status', selectedStatus);
					setStatusFilterQuery(selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1));
					setShowStatusFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowStatusFilterDropdown(false);
				setStatusFilterHighlightedIndex(-1);
				break;
		}
	};

	const handleGenderFilterKeyDown = (e: React.KeyboardEvent) => {
		if (!showGenderFilterDropdown || filteredGenderOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setGenderFilterHighlightedIndex((prev) => (prev < filteredGenderOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setGenderFilterHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (genderFilterHighlightedIndex >= 0 && genderFilterHighlightedIndex < filteredGenderOptions.length) {
					const selectedGender = filteredGenderOptions[genderFilterHighlightedIndex];
					handleFilterChange('gender', selectedGender);
					setGenderFilterQuery(selectedGender);
					setShowGenderFilterDropdown(false);
				} else if (genderFilterHighlightedIndex === -1 && filteredGenderOptions.length === 1) {
					const selectedGender = filteredGenderOptions[0];
					handleFilterChange('gender', selectedGender);
					setGenderFilterQuery(selectedGender);
					setShowGenderFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowGenderFilterDropdown(false);
				setGenderFilterHighlightedIndex(-1);
				break;
		}
	};

	// Handle filter change
	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	// Get unique values for filter dropdowns
	const uniqueRoles = useMemo(() => {
		const roles = new Set(staff.map((s) => s.staff_role).filter(Boolean));
		return Array.from(roles);
	}, [staff]);

	const uniqueEmploymentTypes = useMemo(() => {
		const types = new Set(staff.map((s) => s.employment_type).filter(Boolean));
		return Array.from(types);
	}, [staff]);

	// Get profile image URL
	const getProfileImageUrl = (profilePath: string | null) => {
		if (!profilePath) return null;
		if (profilePath.startsWith('http://') || profilePath.startsWith('https://')) {
			return profilePath;
		}
		return `${API_BASE_URL}/${profilePath}`;
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

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	// Refresh staff data with cache busting
	const refreshStaff = async () => {
		if (!schoolId) {
			console.warn('Cannot refresh staff: schoolId is missing');
			return;
		}

		try {
			// Add timestamp to bust cache and ensure fresh data
			const timestamp = new Date().getTime();
			const { data } = await api.get(`/staff/?school_id=${schoolId}&page=1&page_size=100&_t=${timestamp}`);
			
			console.log('Refresh staff response:', { 
				hasData: !!data, 
				hasItems: !!(data?.items), 
				itemsCount: data?.items?.length || 0,
				isArray: Array.isArray(data)
			});
			
			// Handle paginated response - same logic as fetchStaff
			let newStaffData: StaffMember[] = [];
			if (data && Array.isArray(data.items)) {
				newStaffData = data.items;
			} else if (Array.isArray(data)) {
				// Fallback for non-paginated response
				newStaffData = data;
			} else {
				// Use helper function as fallback
				newStaffData = getArrayFromResponse(data);
			}
			
			console.log('Setting staff data:', { count: newStaffData.length });
			// Force state update by creating a new array reference
			setStaff([...newStaffData]);
			
			// Reset to first page after refresh to show new items
			setCurrentPage(1);
		} catch (error: any) {
			console.error('Refresh staff error:', error);
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to refresh staff data';
			toast.error(errorMessage);
		}
	};

	// Handle Create (form submission - shows confirm)
	const handleCreateSubmit = async (formData: Partial<StaffMember>) => {
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
			const response = await api.post('/staff/', {
				...formDataToSubmit,
				school_id: schoolId,
			});
			toast.success('Staff member created successfully!');
			setCreateConfirmOpen(false);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			// Refresh data immediately after successful creation
			await refreshStaff();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to create staff member');
			}
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Update (form submission - shows confirm)
	const handleUpdateSubmit = async (formData: Partial<StaffMember>) => {
		setFormDataToSubmit(formData);
		setEditModalOpen(false);
		setUpdateConfirmOpen(true);
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!selectedStaff || !schoolId || !formDataToSubmit) return;

		setFormLoading(true);
		try {
			await api.put(`/staff/${selectedStaff.staff_id}?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Staff member updated successfully!');
			setUpdateConfirmOpen(false);
			setSelectedStaff(null);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			// Refresh data immediately after successful update
			await refreshStaff();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to update staff member');
			}
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDelete = async () => {
		if (!selectedStaff || !schoolId) return;

		setDeleteLoading(true);
		try {
			await api.delete(`/staff/${selectedStaff.staff_id}?school_id=${schoolId}`);
			toast.success('Staff member deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedStaff(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			// Refresh data immediately after successful deletion
			await refreshStaff();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to delete staff member');
			}
		} finally {
			setDeleteLoading(false);
		}
	};

	// Handle Status Update
	const handleStatusUpdate = async (staffId: string, newStatus: boolean) => {
		if (!schoolId) return;

		setStatusUpdateLoading(staffId);
		setStatusDropdownOpen(null);
		try {
			await api.put(`/staff/${staffId}?school_id=${schoolId}`, {
				is_active: newStatus,
			});
			toast.success(`Staff member ${newStatus ? 'activated' : 'deactivated'} successfully!`);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			// Refresh data immediately after successful update
			await refreshStaff();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to update staff status');
			}
		} finally {
			setStatusUpdateLoading(null);
		}
	};

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			// Check if click is outside any status dropdown
			if (statusDropdownOpen && !target.closest('[data-status-dropdown]')) {
				setStatusDropdownOpen(null);
			}
		};

		if (statusDropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [statusDropdownOpen]);

	// Open modals
	const openViewModal = (member: StaffMember) => {
		setSelectedStaff(member);
		setViewModalOpen(true);
	};

	const openEditModal = (member: StaffMember) => {
		setSelectedStaff(member);
		setViewModalOpen(false);
		setEditModalOpen(true);
	};

	const openDeleteConfirm = (member: StaffMember) => {
		setSelectedStaff(member);
		setViewModalOpen(false);
		setDeleteConfirmOpen(true);
	};

	const openCreateModal = () => {
		setSelectedStaff(null);
		setCreateModalOpen(true);
	};

	if (loading) {
		return (
			<div className="flex bg-gray-50 min-h-screen h-screen overflow-hidden">
				<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<div className="flex-1 flex flex-col h-screen overflow-hidden">
					<Topbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
					<main className="flex-1 overflow-y-auto p-8">
						<div className="flex items-center justify-center h-64">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
						</div>
					</main>
				</div>
			</div>
		);
	}

	return (
		<div className="flex bg-gray-50 min-h-screen h-screen overflow-hidden">
			<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
			<div className="flex-1 flex flex-col h-screen overflow-hidden">
				<Topbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
				<main className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
							<p className="text-gray-600 mt-1">Manage your school staff members</p>
						</div>
						<button
							onClick={openCreateModal}
							className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-[3px] shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
						>
							<PlusIcon className="w-5 h-5" />
							<span>Add Staff</span>
						</button>
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Staff</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<UserGroupIcon className="w-6 h-6 text-blue-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-green-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Active</p>
									<p className="text-3xl font-bold text-green-600 mt-2">{analytics.active}</p>
								</div>
								<div className="p-3 bg-green-100 rounded-[3px]">
									<CheckCircleIcon className="w-6 h-6 text-green-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Inactive</p>
									<p className="text-3xl font-bold text-red-600 mt-2">{analytics.inactive}</p>
								</div>
								<div className="p-3 bg-red-100 rounded-[3px]">
									<PauseCircleIcon className="w-6 h-6 text-red-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-purple-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Unique Roles</p>
									<p className="text-3xl font-bold text-purple-600 mt-2">{Object.keys(analytics.roles).length}</p>
								</div>
								<div className="p-3 bg-purple-100 rounded-[3px]">
									<SparklesIcon className="w-6 h-6 text-purple-600" />
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
									placeholder="Search by name, email, or title..."
									value={filters.search}
									onChange={(e) => handleFilterChange('search', e.target.value)}
									className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
								/>
							</div>
							<div className="flex items-center gap-3 flex-wrap">
								{/* Records per page selector */}
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
								{(filters.role || filters.employmentType || filters.status || filters.gender) && (
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
							<div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
									<div className="relative">
										<input
											ref={roleFilterInputRef}
											type="text"
											value={filters.role ? filters.role.charAt(0).toUpperCase() + filters.role.slice(1) : roleFilterQuery}
											onChange={(e) => {
												setRoleFilterQuery(e.target.value);
												setShowRoleFilterDropdown(true);
												setRoleFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowRoleFilterDropdown(false);
													handleFilterChange('role', '');
												}
											}}
											onFocus={() => {
												if (filteredRoleOptions.length > 0) {
													setShowRoleFilterDropdown(true);
												}
											}}
											onKeyDown={handleRoleFilterKeyDown}
											placeholder="All Roles"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showRoleFilterDropdown && filteredRoleOptions.length > 0 && (
											<div
												ref={roleFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('role', '');
														setRoleFilterQuery('');
														setShowRoleFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Roles</div>
												</button>
												{filteredRoleOptions.map((role, index) => (
													<button
														key={role}
														type="button"
														onClick={() => {
															handleFilterChange('role', role);
															setRoleFilterQuery(role.charAt(0).toUpperCase() + role.slice(1));
															setShowRoleFilterDropdown(false);
														}}
														onMouseEnter={() => setRoleFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === roleFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.role === role ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900 capitalize">{role}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
									<div className="relative">
										<input
											ref={employmentTypeFilterInputRef}
											type="text"
											value={filters.employmentType || employmentTypeFilterQuery}
											onChange={(e) => {
												setEmploymentTypeFilterQuery(e.target.value);
												setShowEmploymentTypeFilterDropdown(true);
												setEmploymentTypeFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowEmploymentTypeFilterDropdown(false);
													handleFilterChange('employmentType', '');
												}
											}}
											onFocus={() => {
												if (filteredEmploymentTypeOptions.length > 0) {
													setShowEmploymentTypeFilterDropdown(true);
												}
											}}
											onKeyDown={handleEmploymentTypeFilterKeyDown}
											placeholder="All Types"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showEmploymentTypeFilterDropdown && filteredEmploymentTypeOptions.length > 0 && (
											<div
												ref={employmentTypeFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('employmentType', '');
														setEmploymentTypeFilterQuery('');
														setShowEmploymentTypeFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All Types</div>
												</button>
												{filteredEmploymentTypeOptions.map((type, index) => (
													<button
														key={type}
														type="button"
														onClick={() => {
															handleFilterChange('employmentType', type);
															setEmploymentTypeFilterQuery(type);
															setShowEmploymentTypeFilterDropdown(false);
														}}
														onMouseEnter={() => setEmploymentTypeFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === employmentTypeFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.employmentType === type ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">{type}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
									<div className="relative">
										<input
											ref={statusFilterInputRef}
											type="text"
											value={filters.status ? filters.status.charAt(0).toUpperCase() + filters.status.slice(1) : statusFilterQuery}
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
											}}
											onKeyDown={handleStatusFilterKeyDown}
											placeholder="All Status"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
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
													<div className="text-sm font-medium text-gray-900">All Status</div>
												</button>
												{filteredStatusOptions.map((status, index) => (
													<button
														key={status}
														type="button"
														onClick={() => {
															handleFilterChange('status', status);
															setStatusFilterQuery(status.charAt(0).toUpperCase() + status.slice(1));
															setShowStatusFilterDropdown(false);
														}}
														onMouseEnter={() => setStatusFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === statusFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.status === status ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900 capitalize">{status}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
									<div className="relative">
										<input
											ref={genderFilterInputRef}
											type="text"
											value={filters.gender || genderFilterQuery}
											onChange={(e) => {
												setGenderFilterQuery(e.target.value);
												setShowGenderFilterDropdown(true);
												setGenderFilterHighlightedIndex(-1);
												if (!e.target.value.trim()) {
													setShowGenderFilterDropdown(false);
													handleFilterChange('gender', '');
												}
											}}
											onFocus={() => {
												if (filteredGenderOptions.length > 0) {
													setShowGenderFilterDropdown(true);
												}
											}}
											onKeyDown={handleGenderFilterKeyDown}
											placeholder="All"
											className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										/>
										{showGenderFilterDropdown && filteredGenderOptions.length > 0 && (
											<div
												ref={genderFilterDropdownRef}
												className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
											>
												<button
													type="button"
													onClick={() => {
														handleFilterChange('gender', '');
														setGenderFilterQuery('');
														setShowGenderFilterDropdown(false);
													}}
													className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
												>
													<div className="text-sm font-medium text-gray-900">All</div>
												</button>
												{filteredGenderOptions.map((gender, index) => (
													<button
														key={gender}
														type="button"
														onClick={() => {
															handleFilterChange('gender', gender);
															setGenderFilterQuery(gender);
															setShowGenderFilterDropdown(false);
														}}
														onMouseEnter={() => setGenderFilterHighlightedIndex(index)}
														className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
															index === genderFilterHighlightedIndex ? 'bg-primary-50' : ''
														} ${filters.gender === gender ? 'bg-primary-100 font-medium' : ''}`}
													>
														<div className="text-sm font-medium text-gray-900">{gender}</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

				{/* Staff Table */}
				<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Staff Member
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Contact
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Phone
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Role & Type
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Status
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Joined
										</th>
										<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{paginatedStaff.length === 0 ? (
										<tr>
											<td colSpan={7} className="px-6 py-12 text-center">
												<div className="flex flex-col items-center gap-3">
													<UserGroupIcon className="w-12 h-12 text-gray-400" />
													<p className="text-gray-500 font-medium">No staff members found</p>
													<p className="text-sm text-gray-400">Try adjusting your filters</p>
												</div>
											</td>
										</tr>
									) : (
										paginatedStaff.map((member) => {
											const profileUrl = getProfileImageUrl(member.staff_profile);
											return (
												<tr key={member.staff_id} className="hover:bg-gray-50 transition-colors">
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="flex items-center gap-3">
															<div className="flex-shrink-0">
																{profileUrl ? (
																	<img
																		src={profileUrl}
																		alt={member.staff_name}
																		className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
																		onError={(e) => {
																			const target = e.target as HTMLImageElement;
																			target.style.display = 'none';
																			if (target.nextElementSibling) {
																				(target.nextElementSibling as HTMLElement).style.display = 'flex';
																			}
																		}}
																	/>
																) : null}
																{!profileUrl && (
																	<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center text-white font-semibold text-sm">
																		{getInitials(member.staff_name)}
																	</div>
																)}
															</div>
															<div>
																<div className="text-sm font-semibold text-gray-900">{member.staff_name}</div>
																{member.staff_title && (
																	<div className="text-xs text-gray-500">{member.staff_title}</div>
																)}
															</div>
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm text-gray-900">{member.email}</div>
														{member.staff_gender && (
															<div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
																<span>{member.staff_gender === 'Male' ? '♂️' : member.staff_gender === 'Female' ? '♀️' : '⚧️'}</span>
																<span>{member.staff_gender}</span>
															</div>
														)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														{member.phone ? (
															<div className="text-sm text-gray-900">{member.phone}</div>
														) : (
															<>
																<div className="text-sm text-gray-900">—</div>
																<div className="text-xs text-gray-500">No phone</div>
															</>
														)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="flex flex-col gap-1.5">
															{member.staff_role && (
																<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium bg-purple-100 text-purple-800">
																	{member.staff_role}
																</span>
															)}
															{member.employment_type && (
																<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium bg-blue-100 text-blue-800">
																	{member.employment_type}
																</span>
															)}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="relative inline-block" data-status-dropdown>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	setStatusDropdownOpen(statusDropdownOpen === member.staff_id ? null : member.staff_id);
																}}
																disabled={statusUpdateLoading === member.staff_id}
																className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium cursor-pointer transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${
																	member.is_active
																		? 'bg-green-100 text-green-800'
																		: 'bg-red-100 text-red-800'
																}`}
															>
																{statusUpdateLoading === member.staff_id ? (
																	<>
																		<svg className="animate-spin -ml-1 mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
																			<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
																			<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
																		</svg>
																		Updating...
																	</>
																) : (
																	<>
																		<span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
																			member.is_active ? 'bg-green-500' : 'bg-red-500'
																		}`}></span>
																		{member.is_active ? 'Active' : 'Inactive'}
																		<svg className="ml-1.5 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
																		</svg>
																	</>
																)}
															</button>
															
															{statusDropdownOpen === member.staff_id && (
																<div className="absolute left-0 mt-1 w-32 bg-white rounded-[3px] shadow-lg border border-gray-200 z-50 py-1">
																	<button
																		onClick={(e) => {
																			e.stopPropagation();
																			handleStatusUpdate(member.staff_id, true);
																		}}
																		disabled={member.is_active || statusUpdateLoading === member.staff_id}
																		className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
																			member.is_active
																				? 'bg-green-50 text-green-700 font-medium cursor-default'
																				: 'text-gray-700 hover:bg-gray-50 cursor-pointer'
																		} disabled:opacity-50 disabled:cursor-not-allowed`}
																	>
																		<span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
																		Active
																	</button>
																	<button
																		onClick={(e) => {
																			e.stopPropagation();
																			handleStatusUpdate(member.staff_id, false);
																		}}
																		disabled={!member.is_active || statusUpdateLoading === member.staff_id}
																		className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
																			!member.is_active
																				? 'bg-red-50 text-red-700 font-medium cursor-default'
																				: 'text-gray-700 hover:bg-gray-50 cursor-pointer'
																		} disabled:opacity-50 disabled:cursor-not-allowed`}
																	>
																		<span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
																		Inactive
																	</button>
																</div>
															)}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{formatDate(member.created_at)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
														<div className="flex items-center justify-end gap-2">
															<button
																onClick={() => openViewModal(member)}
																className="p-2 text-blue-600 hover:bg-blue-50 rounded-[3px] transition-colors"
																title="View"
															>
																<EyeIcon className="w-5 h-5" />
															</button>
															<button
																onClick={() => openEditModal(member)}
																className="p-2 text-green-600 hover:bg-green-50 rounded-[3px] transition-colors"
																title="Edit"
															>
																<PencilIcon className="w-5 h-5" />
															</button>
															<button
																onClick={() => openDeleteConfirm(member)}
																className="p-2 text-red-600 hover:bg-red-50 rounded-[3px] transition-colors"
																title="Delete"
															>
																<TrashIcon className="w-5 h-5" />
															</button>
														</div>
													</td>
												</tr>
											);
										})
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
							</div>
						)}

						{/* Results count */}
						<div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
							<p className="text-sm text-gray-600">
								Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredStaff.length)} of{' '}
								{filteredStaff.length} results
							</p>
						</div>
					</div>

					{/* Create Staff Modal */}
					<Modal
						isOpen={createModalOpen}
						onClose={() => setCreateModalOpen(false)}
						title="Create New Staff Member"
						size="xl"
					>
						<StaffForm
							mode="create"
							onSubmit={handleCreateSubmit}
							onCancel={() => setCreateModalOpen(false)}
							loading={false}
						/>
					</Modal>

					{/* Edit Staff Modal */}
					<Modal
						isOpen={editModalOpen}
						onClose={() => {
							setEditModalOpen(false);
							setSelectedStaff(null);
						}}
						title="Edit Staff Member"
						size="xl"
					>
						<StaffForm
							mode="edit"
							staff={selectedStaff}
							onSubmit={handleUpdateSubmit}
							onCancel={() => {
								setEditModalOpen(false);
								setSelectedStaff(null);
							}}
							loading={false}
						/>
					</Modal>

					{/* Create Confirmation Modal */}
					<ConfirmModal
						isOpen={createConfirmOpen}
						onClose={() => {
							setCreateConfirmOpen(false);
							setFormDataToSubmit(null);
							setCreateModalOpen(true);
						}}
						onConfirm={handleCreateConfirm}
						title="Create Staff Member"
						message={`Are you sure you want to create a new staff member "${formDataToSubmit?.staff_name}"?`}
						confirmText="Create"
						cancelText="Cancel"
						type="info"
						loading={formLoading}
					/>

					{/* Update Confirmation Modal */}
					<ConfirmModal
						isOpen={updateConfirmOpen}
						onClose={() => {
							setUpdateConfirmOpen(false);
							setFormDataToSubmit(null);
							setEditModalOpen(true);
						}}
						onConfirm={handleUpdateConfirm}
						title="Update Staff Member"
						message={`Are you sure you want to update "${selectedStaff?.staff_name}"?`}
						confirmText="Update"
						cancelText="Cancel"
						type="warning"
						loading={formLoading}
					/>

					{/* View Staff Modal */}
					<StaffViewModal
						isOpen={viewModalOpen}
						staff={selectedStaff}
						onClose={() => {
							setViewModalOpen(false);
							setSelectedStaff(null);
						}}
						onEdit={selectedStaff ? () => openEditModal(selectedStaff) : undefined}
						onDelete={selectedStaff ? () => openDeleteConfirm(selectedStaff) : undefined}
					/>

					{/* Delete Confirmation Modal */}
					<ConfirmModal
						isOpen={deleteConfirmOpen}
						onClose={() => {
							setDeleteConfirmOpen(false);
							setSelectedStaff(null);
						}}
						onConfirm={handleDelete}
						title="Delete Staff Member"
						message={`Are you sure you want to delete ${selectedStaff?.staff_name}? This action cannot be undone.`}
						confirmText="Delete"
						cancelText="Cancel"
						type="danger"
						loading={deleteLoading}
					/>
				</main>
			</div>
		</div>
	);
}


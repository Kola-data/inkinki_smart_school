import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import {
	UserGroupIcon,
	PlusIcon,
	MagnifyingGlassIcon,
	FunnelIcon,
	XMarkIcon,
	PencilIcon,
	TrashIcon,
	CheckCircleIcon,
	XCircleIcon,
} from '@heroicons/react/24/outline';

interface SystemUser {
	user_id: string;
	full_name: string;
	username: string;
	email: string;
	phone_number?: string;
	role: string;
	account_status: string;
	created_at: string;
}

interface FilterState {
	search: string;
	role: string;
	status: string;
}

export default function SystemUserManagement() {
	const [users, setUsers] = useState<SystemUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
		role: '',
		status: '',
	});
	const [showFilters, setShowFilters] = useState(false);
	const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
	const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		full_name: '',
		username: '',
		email: '',
		phone_number: '',
		password: '',
		role: 'academic-admin',
		account_status: 'active'
	});

	// Autocomplete states for filters
	const [roleFilterQuery, setRoleFilterQuery] = useState('');
	const [showRoleFilterDropdown, setShowRoleFilterDropdown] = useState(false);
	const [roleFilterHighlightedIndex, setRoleFilterHighlightedIndex] = useState(-1);
	const roleFilterDropdownRef = useRef<HTMLDivElement>(null);
	const roleFilterInputRef = useRef<HTMLInputElement>(null);

	const [statusFilterQuery, setStatusFilterQuery] = useState('');
	const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
	const [statusFilterHighlightedIndex, setStatusFilterHighlightedIndex] = useState(-1);
	const statusFilterDropdownRef = useRef<HTMLDivElement>(null);
	const statusFilterInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for form
	const [formRoleQuery, setFormRoleQuery] = useState('');
	const [showFormRoleDropdown, setShowFormRoleDropdown] = useState(false);
	const [formRoleHighlightedIndex, setFormRoleHighlightedIndex] = useState(-1);
	const formRoleDropdownRef = useRef<HTMLDivElement>(null);
	const formRoleInputRef = useRef<HTMLInputElement>(null);

	const [formStatusQuery, setFormStatusQuery] = useState('');
	const [showFormStatusDropdown, setShowFormStatusDropdown] = useState(false);
	const [formStatusHighlightedIndex, setFormStatusHighlightedIndex] = useState(-1);
	const formStatusDropdownRef = useRef<HTMLDivElement>(null);
	const formStatusInputRef = useRef<HTMLInputElement>(null);

	const roleOptions = ['super-admin', 'finance-admin', 'academic-admin'];
	const statusOptions = ['active', 'inactive', 'suspended', 'archived'];

	useEffect(() => {
		fetchUsers();
	}, []);

	const fetchUsers = async () => {
		try {
			setLoading(true);
			const { data } = await api.get('/system-users/');
			setUsers(data);
		} catch (err: any) {
			toast.error('Failed to fetch users');
		} finally {
			setLoading(false);
		}
	};

	// Filter users
	const filteredUsers = useMemo(() => {
		let filtered = users;

		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			filtered = filtered.filter(
				(user) =>
					user.full_name?.toLowerCase().includes(searchLower) ||
					user.username?.toLowerCase().includes(searchLower) ||
					user.email?.toLowerCase().includes(searchLower)
			);
		}

		if (filters.role) {
			filtered = filtered.filter((user) => user.role === filters.role);
		}

		if (filters.status) {
			filtered = filtered.filter((user) => user.account_status === filters.status);
		}

		return filtered;
	}, [users, filters]);

	// Analytics
	const analytics = useMemo(() => {
		const total = filteredUsers.length;
		const active = filteredUsers.filter((u) => u.account_status === 'active').length;
		const inactive = total - active;
		
		const roles = filteredUsers.reduce((acc, user) => {
			const role = user.role || 'Not Assigned';
			acc[role] = (acc[role] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		return {
			total,
			active,
			inactive,
			roles,
		};
	}, [filteredUsers]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (editingUser) {
				await api.put(`/system-users/${editingUser.user_id}`, formData);
				toast.success('User updated successfully');
			} else {
				await api.post('/system-users/', formData);
				toast.success('User created successfully');
			}
			setShowForm(false);
			setEditingUser(null);
			resetForm();
			fetchUsers();
		} catch (err: any) {
			toast.error(err.response?.data?.detail || 'Operation failed');
		}
	};

	const handleEdit = (user: SystemUser) => {
		setEditingUser(user);
		setFormData({
			full_name: user.full_name,
			username: user.username,
			email: user.email,
			phone_number: user.phone_number || '',
			password: '',
			role: user.role,
			account_status: user.account_status
		});
		setFormRoleQuery(user.role ? user.role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '');
		setFormStatusQuery(user.account_status ? user.account_status.charAt(0).toUpperCase() + user.account_status.slice(1) : '');
		setShowForm(true);
	};

	const handleDelete = async (userId: string) => {
		if (!confirm('Are you sure you want to delete this user?')) return;
		try {
			await api.delete(`/system-users/${userId}`);
			toast.success('User deleted successfully');
			fetchUsers();
		} catch (err: any) {
			toast.error('Failed to delete user');
		}
	};

	const handleStatusUpdate = async (userId: string, newStatus: string) => {
		setStatusUpdateLoading(userId);
		setStatusDropdownOpen(null);
		try {
			await api.put(`/system-users/${userId}`, {
				account_status: newStatus
			});
			toast.success(`User status updated to ${newStatus} successfully!`);
			await fetchUsers();
		} catch (err: any) {
			toast.error(err.response?.data?.detail || 'Failed to update user status');
		} finally {
			setStatusUpdateLoading(null);
		}
	};

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
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

	const resetForm = () => {
		setFormData({
			full_name: '',
			username: '',
			email: '',
			phone_number: '',
			password: '',
			role: 'academic-admin',
			account_status: 'active'
		});
		setFormRoleQuery('Academic Admin');
		setFormStatusQuery('Active');
	};

	const resetFilters = () => {
		setFilters({
			search: '',
			role: '',
			status: '',
		});
		setRoleFilterQuery('');
		setStatusFilterQuery('');
	};

	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	// Get unique values for filters
	const uniqueRoles = useMemo(() => {
		const roles = new Set(users.map((u) => u.role).filter(Boolean));
		return Array.from(roles);
	}, [users]);

	// Filter options based on search queries
	const filteredRoleOptions = useMemo(() => {
		const options = uniqueRoles.length > 0 ? uniqueRoles : roleOptions;
		return options.filter((role) => {
			if (!roleFilterQuery.trim()) return true;
			return role.toLowerCase().includes(roleFilterQuery.toLowerCase());
		});
	}, [roleFilterQuery, uniqueRoles]);

	const filteredStatusOptions = statusOptions.filter((status) => {
		if (!statusFilterQuery.trim()) return true;
		return status.toLowerCase().includes(statusFilterQuery.toLowerCase());
	});

	const filteredFormRoleOptions = roleOptions.filter((role) => {
		if (!formRoleQuery.trim()) return true;
		return role.toLowerCase().includes(formRoleQuery.toLowerCase());
	});

	const filteredFormStatusOptions = statusOptions.filter((status) => {
		if (!formStatusQuery.trim()) return true;
		return status.toLowerCase().includes(formStatusQuery.toLowerCase());
	});

	// Keyboard navigation handlers for filters
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
					handleFilterChange('role', filteredRoleOptions[roleFilterHighlightedIndex]);
					setRoleFilterQuery(filteredRoleOptions[roleFilterHighlightedIndex].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()));
					setShowRoleFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowRoleFilterDropdown(false);
				setRoleFilterHighlightedIndex(-1);
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
					handleFilterChange('status', filteredStatusOptions[statusFilterHighlightedIndex]);
					setStatusFilterQuery(filteredStatusOptions[statusFilterHighlightedIndex].charAt(0).toUpperCase() + filteredStatusOptions[statusFilterHighlightedIndex].slice(1));
					setShowStatusFilterDropdown(false);
				}
				break;
			case 'Escape':
				setShowStatusFilterDropdown(false);
				setStatusFilterHighlightedIndex(-1);
				break;
		}
	};

	// Keyboard navigation handlers for form
	const handleFormRoleKeyDown = (e: React.KeyboardEvent) => {
		if (!showFormRoleDropdown || filteredFormRoleOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setFormRoleHighlightedIndex((prev) => (prev < filteredFormRoleOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setFormRoleHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (formRoleHighlightedIndex >= 0 && formRoleHighlightedIndex < filteredFormRoleOptions.length) {
					setFormData({ ...formData, role: filteredFormRoleOptions[formRoleHighlightedIndex] });
					setFormRoleQuery(filteredFormRoleOptions[formRoleHighlightedIndex].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()));
					setShowFormRoleDropdown(false);
				}
				break;
			case 'Escape':
				setShowFormRoleDropdown(false);
				setFormRoleHighlightedIndex(-1);
				break;
		}
	};

	const handleFormStatusKeyDown = (e: React.KeyboardEvent) => {
		if (!showFormStatusDropdown || filteredFormStatusOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setFormStatusHighlightedIndex((prev) => (prev < filteredFormStatusOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setFormStatusHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (formStatusHighlightedIndex >= 0 && formStatusHighlightedIndex < filteredFormStatusOptions.length) {
					setFormData({ ...formData, account_status: filteredFormStatusOptions[formStatusHighlightedIndex] });
					setFormStatusQuery(filteredFormStatusOptions[formStatusHighlightedIndex].charAt(0).toUpperCase() + filteredFormStatusOptions[formStatusHighlightedIndex].slice(1));
					setShowFormStatusDropdown(false);
				}
				break;
			case 'Escape':
				setShowFormStatusDropdown(false);
				setFormStatusHighlightedIndex(-1);
				break;
		}
	};

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				(roleFilterDropdownRef.current && !roleFilterDropdownRef.current.contains(target) && roleFilterInputRef.current && !roleFilterInputRef.current.contains(target)) ||
				(statusFilterDropdownRef.current && !statusFilterDropdownRef.current.contains(target) && statusFilterInputRef.current && !statusFilterInputRef.current.contains(target)) ||
				(formRoleDropdownRef.current && !formRoleDropdownRef.current.contains(target) && formRoleInputRef.current && !formRoleInputRef.current.contains(target)) ||
				(formStatusDropdownRef.current && !formStatusDropdownRef.current.contains(target) && formStatusInputRef.current && !formStatusInputRef.current.contains(target))
			) {
				if (showRoleFilterDropdown) setShowRoleFilterDropdown(false);
				if (showStatusFilterDropdown) setShowStatusFilterDropdown(false);
				if (showFormRoleDropdown) setShowFormRoleDropdown(false);
				if (showFormStatusDropdown) setShowFormStatusDropdown(false);
			}
		};

		if (showRoleFilterDropdown || showStatusFilterDropdown || showFormRoleDropdown || showFormStatusDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showRoleFilterDropdown, showStatusFilterDropdown, showFormRoleDropdown, showFormStatusDropdown]);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">System Users</h1>
					<p className="text-gray-600 mt-1">Manage system administrators and users</p>
				</div>
				<button
					onClick={() => {
						setShowForm(true);
						setEditingUser(null);
						resetForm();
					}}
					className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-[3px] shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
				>
					<PlusIcon className="w-5 h-5" />
					<span>Add User</span>
				</button>
			</div>

			{/* Analytics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden">
					<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Total Users</p>
							<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
						</div>
						<div className="p-3 bg-blue-100 rounded-[3px]">
							<UserGroupIcon className="w-6 h-6 text-blue-600" />
						</div>
					</div>
				</div>

				<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden">
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

				<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden">
					<div className="absolute top-0 left-0 right-0 h-1 bg-gray-600"></div>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Inactive</p>
							<p className="text-3xl font-bold text-gray-600 mt-2">{analytics.inactive}</p>
						</div>
						<div className="p-3 bg-gray-100 rounded-[3px]">
							<XCircleIcon className="w-6 h-6 text-gray-600" />
						</div>
					</div>
				</div>

				<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden">
					<div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600"></div>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Roles</p>
							<p className="text-3xl font-bold text-indigo-600 mt-2">{Object.keys(analytics.roles).length}</p>
						</div>
						<div className="p-3 bg-indigo-100 rounded-[3px]">
							<FunnelIcon className="w-6 h-6 text-indigo-600" />
						</div>
					</div>
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-[3px] shadow-card border border-gray-100 p-4">
				<div className="flex flex-col sm:flex-row gap-4">
					{/* Search */}
					<div className="flex-1 relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							placeholder="Search users..."
							value={filters.search}
							onChange={(e) => handleFilterChange('search', e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
						/>
					</div>
					
					{/* Role Filter */}
					<div className="relative">
						<input
							ref={roleFilterInputRef}
							type="text"
							value={filters.role ? filters.role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : roleFilterQuery}
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
							className="px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-full"
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
											setRoleFilterQuery(role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()));
											setShowRoleFilterDropdown(false);
										}}
										onMouseEnter={() => setRoleFilterHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === roleFilterHighlightedIndex ? 'bg-indigo-50' : ''
										} ${filters.role === role ? 'bg-indigo-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
									</button>
								))}
							</div>
						)}
					</div>

					{/* Status Filter */}
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
							className="px-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-full"
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
											index === statusFilterHighlightedIndex ? 'bg-indigo-50' : ''
										} ${filters.status === status ? 'bg-indigo-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{status.charAt(0).toUpperCase() + status.slice(1)}</div>
									</button>
								))}
							</div>
						)}
					</div>

					{(filters.search || filters.role || filters.status) && (
						<button
							onClick={resetFilters}
							className="px-4 py-2 border border-gray-300 rounded-[3px] hover:bg-gray-50 flex items-center gap-2"
						>
							<XMarkIcon className="w-4 h-4" />
							Clear
						</button>
					)}
				</div>
			</div>

			{/* Form Modal */}
			{showForm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-[3px] shadow-xl p-6 w-full max-w-md">
						<h3 className="text-xl font-bold mb-4">
							{editingUser ? 'Edit User' : 'Create User'}
						</h3>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1">Full Name</label>
								<input
									type="text"
									value={formData.full_name}
									onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Username</label>
								<input
									type="text"
									value={formData.username}
									onChange={(e) => setFormData({ ...formData, username: e.target.value })}
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Email</label>
								<input
									type="email"
									value={formData.email}
									onChange={(e) => setFormData({ ...formData, email: e.target.value })}
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Phone Number</label>
								<input
									type="tel"
									value={formData.phone_number}
									onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
								/>
							</div>
							{!editingUser && (
								<div>
									<label className="block text-sm font-medium mb-1">Password</label>
									<input
										type="password"
										value={formData.password}
										onChange={(e) => setFormData({ ...formData, password: e.target.value })}
										required={!editingUser}
										className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
									/>
								</div>
							)}
							<div>
								<label className="block text-sm font-medium mb-1">Role</label>
								<div className="relative">
									<input
										ref={formRoleInputRef}
										type="text"
										value={formData.role ? formData.role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : formRoleQuery}
										onChange={(e) => {
											setFormRoleQuery(e.target.value);
											setShowFormRoleDropdown(true);
											setFormRoleHighlightedIndex(-1);
											if (!e.target.value.trim()) {
												setShowFormRoleDropdown(false);
											}
										}}
										onFocus={() => {
											if (filteredFormRoleOptions.length > 0) {
												setShowFormRoleDropdown(true);
											}
										}}
										onKeyDown={handleFormRoleKeyDown}
										placeholder="Select role"
										className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
									/>
									{showFormRoleDropdown && filteredFormRoleOptions.length > 0 && (
										<div
											ref={formRoleDropdownRef}
											className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
										>
											{filteredFormRoleOptions.map((role, index) => (
												<button
													key={role}
													type="button"
													onClick={() => {
														setFormData({ ...formData, role });
														setFormRoleQuery(role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()));
														setShowFormRoleDropdown(false);
													}}
													onMouseEnter={() => setFormRoleHighlightedIndex(index)}
													className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
														index === formRoleHighlightedIndex ? 'bg-indigo-50' : ''
													} ${formData.role === role ? 'bg-indigo-100 font-medium' : ''}`}
												>
													<div className="text-sm font-medium text-gray-900">{role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
												</button>
											))}
										</div>
									)}
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Status</label>
								<div className="relative">
									<input
										ref={formStatusInputRef}
										type="text"
										value={formData.account_status ? formData.account_status.charAt(0).toUpperCase() + formData.account_status.slice(1) : formStatusQuery}
										onChange={(e) => {
											setFormStatusQuery(e.target.value);
											setShowFormStatusDropdown(true);
											setFormStatusHighlightedIndex(-1);
											if (!e.target.value.trim()) {
												setShowFormStatusDropdown(false);
											}
										}}
										onFocus={() => {
											if (filteredFormStatusOptions.length > 0) {
												setShowFormStatusDropdown(true);
											}
										}}
										onKeyDown={handleFormStatusKeyDown}
										placeholder="Select status"
										className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
									/>
									{showFormStatusDropdown && filteredFormStatusOptions.length > 0 && (
										<div
											ref={formStatusDropdownRef}
											className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
										>
											{filteredFormStatusOptions.map((status, index) => (
												<button
													key={status}
													type="button"
													onClick={() => {
														setFormData({ ...formData, account_status: status });
														setFormStatusQuery(status.charAt(0).toUpperCase() + status.slice(1));
														setShowFormStatusDropdown(false);
													}}
													onMouseEnter={() => setFormStatusHighlightedIndex(index)}
													className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
														index === formStatusHighlightedIndex ? 'bg-indigo-50' : ''
													} ${formData.account_status === status ? 'bg-indigo-100 font-medium' : ''}`}
												>
													<div className="text-sm font-medium text-gray-900">{status.charAt(0).toUpperCase() + status.slice(1)}</div>
												</button>
											))}
										</div>
									)}
								</div>
							</div>
							<div className="flex space-x-3 pt-4">
								<button
									type="submit"
									className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-[3px] hover:bg-indigo-700 transition"
								>
									{editingUser ? 'Update' : 'Create'}
								</button>
								<button
									type="button"
									onClick={() => {
										setShowForm(false);
										setEditingUser(null);
										resetForm();
									}}
									className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-[3px] hover:bg-gray-300 transition"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Users Table */}
			<div className="bg-white rounded-[3px] shadow-card border border-gray-100 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{filteredUsers.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-6 py-8 text-center text-gray-500">
										No users found
									</td>
								</tr>
							) : (
								filteredUsers.map((user) => (
									<tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{user.full_name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{user.username}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{user.email}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											<span className="px-2 py-1 text-xs font-medium rounded-[3px] bg-blue-100 text-blue-800">
												{user.role?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || user.role}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											<div className="relative" data-status-dropdown>
												{statusUpdateLoading === user.user_id ? (
													<div className="flex items-center gap-2">
														<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
														<span className="text-xs text-gray-500">Updating...</span>
													</div>
												) : (
													<>
														<button
															type="button"
															onClick={() => setStatusDropdownOpen(
																statusDropdownOpen === user.user_id ? null : user.user_id
															)}
															className={`px-3 py-1.5 text-xs font-medium rounded-[3px] flex items-center gap-2 transition-colors ${
																user.account_status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
																user.account_status === 'inactive' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
																'bg-red-100 text-red-800 hover:bg-red-200'
															}`}
														>
															{user.account_status?.charAt(0).toUpperCase() + user.account_status?.slice(1) || user.account_status}
															<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
															</svg>
														</button>
														{statusDropdownOpen === user.user_id && (
															<div className="absolute z-10 mt-1 w-32 bg-white rounded-[3px] shadow-lg border border-gray-200 py-1">
																<button
																	onClick={() => handleStatusUpdate(user.user_id, 'active')}
																	className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
																>
																	Active
																</button>
																<button
																	onClick={() => handleStatusUpdate(user.user_id, 'inactive')}
																	className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
																>
																	Inactive
																</button>
															</div>
														)}
													</>
												)}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<div className="flex items-center gap-2">
												<button
													onClick={() => handleEdit(user)}
													className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-[3px] transition-colors"
													title="Edit user"
												>
													<PencilIcon className="w-5 h-5" />
												</button>
												<button
													onClick={() => handleDelete(user.user_id)}
													className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-[3px] transition-colors"
													title="Delete user"
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
			</div>
		</div>
	);
}

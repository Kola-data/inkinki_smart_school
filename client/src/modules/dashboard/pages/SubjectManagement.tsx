import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import {
	BookOpenIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
	SparklesIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import Sidebar from '../partials/Sidebar';
import Topbar from '../partials/Topbar';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import SubjectForm from '../components/SubjectForm';
import SubjectViewModal from '../components/SubjectViewModal';
import { isTeacher } from '../../../utils/rolePermissions';

interface SubjectMember {
	subj_id: string;
	subj_name: string;
	subj_desc: string | null;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
}

interface FilterState {
	search: string;
}

export default function SubjectManagement() {
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [subjects, setSubjects] = useState<SubjectMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<FilterState>({
		search: '',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [showFilters, setShowFilters] = useState(false);

	// Modal states
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
	const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
	const [selectedSubject, setSelectedSubject] = useState<SubjectMember | null>(null);
	const [formDataToSubmit, setFormDataToSubmit] = useState<Partial<SubjectMember> | null>(null);
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

	// Fetch subjects data using school_id from logged-in user
	useEffect(() => {
		const fetchSubjects = async () => {
			if (!schoolId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/subjects/?school_id=${schoolId}&_t=${timestamp}`);
				setSubjects(getArrayFromResponse(data));
			} catch (error: any) {
				const errorMessage = error.response?.data?.detail || 'Failed to fetch subjects';
				if (error.response?.status !== 403) {
					toast.error(errorMessage);
				}} finally {
				setLoading(false);
			}
		};

		fetchSubjects();
	}, [schoolId]);

	// Filtered subjects
	const filteredSubjects = useMemo(() => {
		return subjects.filter((subject) => {
			const matchesSearch = !filters.search || 
				subject.subj_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
				subject.subj_desc?.toLowerCase().includes(filters.search.toLowerCase());
			
			return matchesSearch;
		});
	}, [subjects, filters]);

	// Pagination
	const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedSubjects = useMemo(() => {
		return filteredSubjects.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredSubjects, startIndex, itemsPerPage]);

	// Analytics
	const analytics = useMemo(() => {
		return {
			total: filteredSubjects.length,
		};
	}, [filteredSubjects]);

	// Handle filter changes
	const handleFilterChange = (key: keyof FilterState, value: string) => {
		setFilters(prev => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const resetFilters = () => {
		setFilters({ search: '' });
		setCurrentPage(1);
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

	// Refresh subjects data with cache busting
	const refreshSubjects = async () => {
		if (!schoolId) {
			console.warn('Cannot refresh subjects: schoolId is missing');
			return;
		}

		try {
			const timestamp = new Date().getTime();
			const { data } = await api.get(`/subjects/?school_id=${schoolId}&_t=${timestamp}`);
			
			// Handle paginated response
			let newSubjectsData: SubjectMember[] = [];
			if (data && Array.isArray(data.items)) {
				newSubjectsData = data.items;
			} else if (Array.isArray(data)) {
				newSubjectsData = data;
			} else {
				newSubjectsData = getArrayFromResponse(data);
			}
			
			// Force state update by creating a new array reference
			setSubjects([...newSubjectsData]);
			setCurrentPage(1);
		} catch (error: any) {
			console.error('Refresh subjects error:', error);
			const errorMessage = error.response?.data?.detail || error.message || 'Failed to refresh subjects data';
			toast.error(errorMessage);
		}
	};

	// Handle Create (form submission - shows confirm)
	const handleCreateSubmit = async (formData: Partial<SubjectMember>) => {
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
			await api.post(`/subjects/?school_id=${schoolId}`, {
				...formDataToSubmit,
				school_id: schoolId,
			});
			toast.success('Subject created successfully!');
			setCreateConfirmOpen(false);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshSubjects();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to create subject');
			}
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Update (form submission - shows confirm)
	const handleUpdateSubmit = async (formData: Partial<SubjectMember>) => {
		setFormDataToSubmit(formData);
		setEditModalOpen(false);
		setUpdateConfirmOpen(true);
	};

	// Handle Update (after confirmation)
	const handleUpdateConfirm = async () => {
		if (!selectedSubject || !schoolId || !formDataToSubmit) return;

		setFormLoading(true);
		try {
			await api.put(`/subjects/${selectedSubject.subj_id}?school_id=${schoolId}`, formDataToSubmit);
			toast.success('Subject updated successfully!');
			setUpdateConfirmOpen(false);
			setSelectedSubject(null);
			setFormDataToSubmit(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshSubjects();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to update subject');
			}
		} finally {
			setFormLoading(false);
		}
	};

	// Handle Delete
	const handleDelete = async () => {
		if (!selectedSubject || !schoolId) return;

		setDeleteLoading(true);
		try {
			await api.delete(`/subjects/${selectedSubject.subj_id}?school_id=${schoolId}`);
			toast.success('Subject deleted successfully!');
			setDeleteConfirmOpen(false);
			setSelectedSubject(null);
			// Small delay to ensure backend cache is cleared
			await new Promise(resolve => setTimeout(resolve, 100));
			await refreshSubjects();
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail;
			if (Array.isArray(errorMessage)) {
				const errorMessages = errorMessage.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
				toast.error(errorMessages || 'Validation error');
			} else {
				toast.error(errorMessage || error.message || 'Failed to delete subject');
			}
		} finally {
			setDeleteLoading(false);
		}
	};

	// Open modals
	const openViewModal = (subject: SubjectMember) => {
		setSelectedSubject(subject);
		setViewModalOpen(true);
	};

	const openEditModal = (subject: SubjectMember) => {
		setSelectedSubject(subject);
		setViewModalOpen(false);
		setEditModalOpen(true);
	};

	const openDeleteConfirm = (subject: SubjectMember) => {
		setSelectedSubject(subject);
		setViewModalOpen(false);
		setDeleteConfirmOpen(true);
	};

	const openCreateModal = () => {
		setSelectedSubject(null);
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
							<p className="mt-4 text-gray-600">Loading subjects...</p>
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
							<h1 className="text-3xl font-bold text-gray-900">Subject Management</h1>
							<p className="text-gray-600 mt-1">Manage your school subjects</p>
						</div>
						{!isTeacher() && (
							<button
								onClick={openCreateModal}
								className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-[3px] shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
							>
								<PlusIcon className="w-5 h-5" />
								<span>Add Subject</span>
							</button>
						)}
					</div>

					{/* Analytics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 p-6 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">Total Subjects</p>
									<p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total}</p>
								</div>
								<div className="p-3 bg-blue-100 rounded-[3px]">
									<BookOpenIcon className="w-6 h-6 text-blue-600" />
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
									placeholder="Search by name or description..."
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
								{filters.search && (
									<button
										onClick={resetFilters}
										className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[3px] font-medium transition-all duration-200"
									>
										Clear
									</button>
								)}
							</div>
						</div>
					</div>

					{/* Subjects Table */}
					<div className="bg-white rounded-[3px] shadow-sm border border-gray-200 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Subject
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Description
										</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Created
										</th>
										<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{paginatedSubjects.length === 0 ? (
										<tr>
											<td colSpan={4} className="px-6 py-12 text-center">
												<div className="flex flex-col items-center gap-3">
													<BookOpenIcon className="w-12 h-12 text-gray-400" />
													<p className="text-gray-500 font-medium">No subjects found</p>
													<p className="text-sm text-gray-400">Try adjusting your search or create a new subject</p>
												</div>
											</td>
										</tr>
									) : (
										paginatedSubjects.map((subject) => (
											<tr key={subject.subj_id} className="hover:bg-gray-50 transition-colors">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
															<BookOpenIcon className="w-5 h-5 text-white" />
														</div>
														<div>
															<div className="text-sm font-semibold text-gray-900">{subject.subj_name}</div>
														</div>
													</div>
												</td>
												<td className="px-6 py-4">
													{subject.subj_desc ? (
														<p className="text-sm text-gray-700 line-clamp-2 max-w-md">{subject.subj_desc}</p>
													) : (
														<span className="text-sm text-gray-400 italic">No description</span>
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{formatDate(subject.created_at)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex items-center justify-end gap-2">
														<button
															onClick={() => openViewModal(subject)}
															className="p-2 text-blue-600 hover:bg-blue-50 rounded-[3px] transition-colors"
															title="View"
														>
															<EyeIcon className="w-5 h-5" />
														</button>
														{!isTeacher() && (
															<>
																<button
																	onClick={() => openEditModal(subject)}
																	className="p-2 text-green-600 hover:bg-green-50 rounded-[3px] transition-colors"
																	title="Edit"
																>
																	<PencilIcon className="w-5 h-5" />
																</button>
																<button
																	onClick={() => openDeleteConfirm(subject)}
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
									Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredSubjects.length)} of {filteredSubjects.length} subjects
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
				title="Create Subject"
				size="xl"
			>
				<SubjectForm
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
					setSelectedSubject(null);
				}}
				title="Edit Subject"
				size="xl"
			>
				{selectedSubject && (
					<SubjectForm
						subject={selectedSubject}
						onSubmit={handleUpdateSubmit}
						onCancel={() => {
							setEditModalOpen(false);
							setSelectedSubject(null);
						}}
						loading={formLoading}
						mode="edit"
					/>
				)}
			</Modal>

			{selectedSubject && (
				<SubjectViewModal
					subject={selectedSubject}
					isOpen={viewModalOpen}
					onClose={() => {
						setViewModalOpen(false);
						setSelectedSubject(null);
					}}
					onEdit={() => openEditModal(selectedSubject)}
					onDelete={() => openDeleteConfirm(selectedSubject)}
				/>
			)}

			<ConfirmModal
				isOpen={createConfirmOpen}
				onClose={() => {
					setCreateConfirmOpen(false);
					setFormDataToSubmit(null);
				}}
				onConfirm={handleCreateConfirm}
				title="Create Subject"
				message={`Are you sure you want to create "${formDataToSubmit?.subj_name || 'this subject'}"?`}
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
				title="Update Subject"
				message={`Are you sure you want to update "${selectedSubject?.subj_name || 'this subject'}"?`}
				confirmText="Update"
				type="info"
				loading={formLoading}
			/>

			<ConfirmModal
				isOpen={deleteConfirmOpen}
				onClose={() => {
					setDeleteConfirmOpen(false);
					setSelectedSubject(null);
				}}
				onConfirm={handleDelete}
				title="Delete Subject"
				message={`Are you sure you want to delete "${selectedSubject?.subj_name || 'this subject'}"? This action cannot be undone.`}
				confirmText="Delete"
				type="danger"
				loading={deleteLoading}
			/>
		</div>
	);
}


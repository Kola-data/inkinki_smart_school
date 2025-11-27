import { useState, useEffect } from 'react';
import Modal from '../../../components/Modal';
import { PencilIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import ProfileEditForm from './ProfileEditForm';
import toast from 'react-hot-toast';

interface StaffProfile {
	staff_id: string;
	staff_name: string;
	email: string;
	staff_title: string | null;
	staff_role: string | null;
	employment_type: string | null;
	staff_gender: string | null;
	staff_dob: string | null;
	qualifications: string | null;
	experience: string | null;
	staff_profile: string | null;
	staff_nid_photo: string | null;
	phone: string | null;
	school_id: string;
}

interface ProfileViewModalProps {
	isOpen: boolean;
	onClose: () => void;
	staffId: string | null;
	schoolId: string | null;
}

const API_BASE_URL = 'http://localhost:8000';

export default function ProfileViewModal({ isOpen, onClose, staffId, schoolId }: ProfileViewModalProps) {
	const [profile, setProfile] = useState<StaffProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [editMode, setEditMode] = useState(false);
	const [imageError, setImageError] = useState(false);

	useEffect(() => {
		if (isOpen && staffId && schoolId) {
			fetchProfile();
		} else {
			setProfile(null);
			setEditMode(false);
		}
	}, [isOpen, staffId, schoolId]);

	const fetchProfile = async () => {
		if (!staffId || !schoolId) return;

		try {
			setLoading(true);
			const { data } = await api.get(`/staff/${staffId}?school_id=${schoolId}`);
			setProfile(data);
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to load profile');
			onClose();
		} finally {
			setLoading(false);
		}
	};

	const handleUpdate = async (updatedData: Partial<StaffProfile>) => {
		if (!staffId || !schoolId) return;

		try {
			await api.put(`/staff/${staffId}?school_id=${schoolId}`, updatedData);
			toast.success('Profile updated successfully');
			
			// Update localStorage if staff_name or staff_profile changed
			const storedStaff = localStorage.getItem('staff');
			if (storedStaff) {
				try {
					const staff = JSON.parse(storedStaff);
					if (updatedData.staff_name) {
						staff.staff_name = updatedData.staff_name;
					}
					if (updatedData.staff_profile !== undefined) {
						staff.staff_profile = updatedData.staff_profile;
					}
					// Normalize role if it was updated
					if (updatedData.staff_role) {
						staff.staff_role = updatedData.staff_role.toLowerCase().trim();
					}
					localStorage.setItem('staff', JSON.stringify(staff));
					// Trigger a custom event to notify Topbar and Sidebar to refresh
					window.dispatchEvent(new Event('staffUpdated'));
				} catch {
					// Ignore parse errors
				}
			}
			
			setEditMode(false);
			await fetchProfile();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to update profile');
		}
	};

	const getProfileImageUrl = () => {
		if (!profile?.staff_profile) {
			return null;
		}
		
		if (profile.staff_profile.startsWith('http://') || profile.staff_profile.startsWith('https://')) {
			return profile.staff_profile;
		}
		
		let imageUrl: string;
		if (profile.staff_profile.startsWith('uploads/')) {
			imageUrl = `${API_BASE_URL}/${profile.staff_profile}`;
		} else {
			imageUrl = `${API_BASE_URL}/uploads/${profile.staff_profile}`;
		}
		
		return imageUrl;
	};

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	if (editMode && profile) {
		return (
			<ProfileEditForm
				staff={profile}
				onSubmit={handleUpdate}
				onCancel={() => setEditMode(false)}
				loading={false}
				mode="edit"
			/>
		);
	}

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Profile" size="lg">
			{loading ? (
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
				</div>
			) : profile ? (
				<div className="space-y-6">
					{/* Header with profile image and edit button */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							{getProfileImageUrl() && !imageError ? (
								<img
									src={getProfileImageUrl() || ''}
									alt={profile.staff_name}
									className="w-20 h-20 rounded-full object-cover border-2 border-primary-200"
									onError={() => setImageError(true)}
								/>
							) : (
								<div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center text-white font-semibold text-2xl">
									{getInitials(profile.staff_name)}
								</div>
							)}
							<div>
								<h2 className="text-2xl font-bold text-gray-900">{profile.staff_name}</h2>
								{profile.staff_title && (
									<p className="text-gray-600">{profile.staff_title}</p>
								)}
							</div>
						</div>
						<button
							onClick={() => setEditMode(true)}
							className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors"
						>
							<PencilIcon className="w-4 h-4" />
							<span>Edit</span>
						</button>
					</div>

					{/* Profile Details */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
							<p className="text-gray-900">{profile.email || 'N/A'}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
							<p className="text-gray-900">{profile.phone || 'N/A'}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
							<p className="text-gray-900">{profile.staff_role || 'N/A'}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
							<p className="text-gray-900">{profile.employment_type || 'N/A'}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
							<p className="text-gray-900">{profile.staff_gender || 'N/A'}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
							<p className="text-gray-900">
								{profile.staff_dob ? new Date(profile.staff_dob).toLocaleDateString() : 'N/A'}
							</p>
						</div>
					</div>

					{/* Qualifications and Experience */}
					{profile.qualifications && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Qualifications</label>
							<p className="text-gray-900 whitespace-pre-wrap">{profile.qualifications}</p>
						</div>
					)}
					{profile.experience && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
							<p className="text-gray-900 whitespace-pre-wrap">{profile.experience}</p>
						</div>
					)}
				</div>
			) : (
				<div className="text-center py-12">
					<p className="text-gray-600">Failed to load profile</p>
				</div>
			)}
		</Modal>
	);
}


import Modal from '../../../components/Modal';

interface StaffMember {
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
	is_active: boolean;
	created_at: string | null;
	updated_at: string | null;
}

interface StaffViewModalProps {
	staff: StaffMember | null;
	isOpen: boolean;
	onClose: () => void;
	onEdit?: () => void;
	onDelete?: () => void;
}

const API_BASE_URL = 'http://localhost:8000';

export default function StaffViewModal({ staff, isOpen, onClose, onEdit, onDelete }: StaffViewModalProps) {
	if (!isOpen || !staff) return null;

	const getProfileImageUrl = (profilePath: string | null) => {
		if (!profilePath) return null;
		if (profilePath.startsWith('http://') || profilePath.startsWith('https://')) {
			return profilePath;
		}
		return `${API_BASE_URL}/${profilePath}`;
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	const profileUrl = getProfileImageUrl(staff.staff_profile);

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={staff.staff_name || 'Staff Details'} size="xl">
			<div className="flex flex-col">
				{/* Staff Profile Section */}
				<div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
					<div className="relative">
						{profileUrl ? (
							<>
								<img
									src={profileUrl}
									alt={staff.staff_name}
									className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
									onError={(e) => {
										const target = e.target as HTMLImageElement;
										target.style.display = 'none';
										const fallback = target.nextElementSibling as HTMLElement;
										if (fallback) {
											fallback.style.display = 'grid';
										}
									}}
								/>
								<div 
									className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center text-white font-bold text-xl absolute top-0 left-0"
									style={{ display: 'none' }}
								>
									{getInitials(staff.staff_name)}
								</div>
							</>
						) : (
							<div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center text-white font-bold text-xl">
								{getInitials(staff.staff_name)}
							</div>
						)}
					</div>
					<div>
						<h2 className="text-2xl font-bold text-gray-900">{staff.staff_name}</h2>
						{staff.staff_title && (
							<p className="text-gray-600 mt-1">{staff.staff_title}</p>
						)}
						<span
							className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium mt-2 ${
								staff.is_active
									? 'bg-green-100 text-green-800'
									: 'bg-red-100 text-red-800'
							}`}
						>
							<span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
								staff.is_active ? 'bg-green-500' : 'bg-red-500'
							}`}></span>
							{staff.is_active ? 'Active' : 'Inactive'}
						</span>
					</div>
				</div>

				{/* Details Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					{/* Email */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Email
						</label>
						<p className="text-gray-900 font-medium">{staff.email}</p>
					</div>

					{/* Phone */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Phone
						</label>
						<p className="text-gray-900 font-medium">{staff.phone || 'N/A'}</p>
					</div>

					{/* Title */}
					{staff.staff_title && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Title
							</label>
							<p className="text-gray-900 font-medium">{staff.staff_title}</p>
						</div>
					)}

					{/* Gender */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Gender
						</label>
						<p className="text-gray-900 font-medium flex items-center gap-2">
							<span>{staff.staff_gender === 'Male' ? '♂️' : staff.staff_gender === 'Female' ? '♀️' : ''}</span>
							{staff.staff_gender || 'N/A'}
						</p>
					</div>

					{/* Role */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Role
						</label>
						{staff.staff_role ? (
							<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium bg-purple-100 text-purple-800">
								{staff.staff_role}
							</span>
						) : (
							<p className="text-gray-500">N/A</p>
						)}
					</div>

					{/* Employment Type */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Employment Type
						</label>
						{staff.employment_type ? (
							<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium bg-blue-100 text-blue-800">
								{staff.employment_type}
							</span>
						) : (
							<p className="text-gray-500">N/A</p>
						)}
					</div>

					{/* Date of Birth */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Date of Birth
						</label>
						<p className="text-gray-900 font-medium">{formatDate(staff.staff_dob)}</p>
					</div>

					{/* Qualifications */}
					{staff.qualifications && (
						<div className="md:col-span-2">
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Qualifications
							</label>
							<p className="text-gray-900">{staff.qualifications}</p>
						</div>
					)}

					{/* Experience */}
					{staff.experience && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Experience
							</label>
							<p className="text-gray-900 font-medium">{staff.experience}</p>
						</div>
					)}

					{/* Created At */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Joined On
						</label>
						<p className="text-gray-900 font-medium">{formatDate(staff.created_at)}</p>
					</div>

					{/* Updated At */}
					{staff.updated_at && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Last Updated
							</label>
							<p className="text-gray-900 font-medium">{formatDate(staff.updated_at)}</p>
						</div>
					)}
				</div>

				{/* NID Photo */}
				{staff.staff_nid_photo && (
					<div className="mt-6 pt-6 border-t border-gray-200">
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
							NID Photo
						</label>
						<div className="relative inline-block">
							<img
								src={getProfileImageUrl(staff.staff_nid_photo) || ''}
								alt="NID Photo"
								className="max-w-full h-auto rounded-[3px] border-2 border-gray-200 shadow-sm"
								onError={(e) => {
									const target = e.target as HTMLImageElement;
									target.style.display = 'none';
								}}
							/>
						</div>
					</div>
				)}

				{/* Footer */}
				<div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
					<button
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 transition-colors"
					>
						Close
					</button>
					{onEdit && (
						<button
							onClick={onEdit}
							className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-[3px] hover:bg-green-700 transition-colors"
						>
							Edit
						</button>
					)}
					{onDelete && (
						<button
							onClick={onDelete}
							className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-[3px] hover:bg-red-700 transition-colors"
						>
							Delete
						</button>
					)}
				</div>
			</div>
		</Modal>
	);
}


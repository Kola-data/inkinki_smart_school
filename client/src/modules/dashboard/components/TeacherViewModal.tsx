import Modal from '../../../components/Modal';

interface TeacherMember {
	teacher_id: string;
	staff_id: string;
	specialized: string | null;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
	staff_name: string | null;
	staff_email: string | null;
	staff_role: string | null;
	staff_profile: string | null;
}

interface TeacherViewModalProps {
	teacher: TeacherMember;
	isOpen: boolean;
	onClose: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

export default function TeacherViewModal({ teacher, isOpen, onClose, onEdit, onDelete }: TeacherViewModalProps) {
	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const getInitials = (name: string | null) => {
		if (!name) return 'TE';
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={teacher.staff_name || 'Teacher Details'} size="xl">
			<div className="flex flex-col">
				{/* Teacher Profile Section */}
				<div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
					<div className="relative">
						{teacher.staff_profile ? (
							<>
								<img
									src={`http://localhost:8000/${teacher.staff_profile}`}
									alt={teacher.staff_name || 'Teacher'}
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
									{getInitials(teacher.staff_name)}
								</div>
							</>
						) : (
							<div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center text-white font-bold text-xl">
								{getInitials(teacher.staff_name)}
							</div>
						)}
					</div>
					<div>
						<h2 className="text-2xl font-bold text-gray-900">{teacher.staff_name || 'N/A'}</h2>
						{teacher.staff_role && (
							<p className="text-gray-600 mt-1">{teacher.staff_role}</p>
						)}
						<span
							className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium mt-2 ${
								teacher.is_active
									? 'bg-green-100 text-green-800'
									: 'bg-red-100 text-red-800'
							}`}
						>
							<span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
								teacher.is_active ? 'bg-green-500' : 'bg-red-500'
							}`}></span>
							{teacher.is_active ? 'Active' : 'Inactive'}
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
						<p className="text-gray-900 font-medium">{teacher.staff_email || 'N/A'}</p>
					</div>

					{/* Specialization */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Specialization
						</label>
						{teacher.specialized ? (
							<span className="inline-flex items-center px-3 py-1 rounded-[3px] text-sm font-medium bg-blue-100 text-blue-800">
								{teacher.specialized}
							</span>
						) : (
							<p className="text-gray-500 italic">Not specified</p>
						)}
					</div>

					{/* Created At */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Created At
						</label>
						<p className="text-gray-900 font-medium">{formatDate(teacher.created_at)}</p>
					</div>

					{/* Updated At */}
					{teacher.updated_at && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Last Updated
							</label>
							<p className="text-gray-900 font-medium">{formatDate(teacher.updated_at)}</p>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
					<button
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 transition-colors"
					>
						Close
					</button>
					<button
						onClick={onEdit}
						className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-[3px] hover:bg-green-700 transition-colors"
					>
						Edit
					</button>
					<button
						onClick={onDelete}
						className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-[3px] hover:bg-red-700 transition-colors"
					>
						Delete
					</button>
				</div>
			</div>
		</Modal>
	);
}



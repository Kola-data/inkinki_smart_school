import Modal from '../../../components/Modal';
import { UserIcon, AcademicCapIcon, BuildingOfficeIcon, CalendarIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

interface StudentMember {
	std_id: string;
	par_id: string;
	std_name: string;
	std_code: string | null;
	std_dob: string | null;
	std_gender: string | null;
	previous_school: string | null;
	started_class: string | null;
	current_class: string | null;
	status: string | null;
	parent?: {
		par_id: string;
		mother_name: string | null;
		father_name: string | null;
		mother_phone: string | null;
		father_phone: string | null;
		mother_email: string | null;
		father_email: string | null;
	};
	started_class_name?: string | null;
	current_class_name?: string | null;
	created_at: string | null;
	updated_at: string | null;
}

interface StudentViewModalProps {
	student: StudentMember;
	isOpen: boolean;
	onClose: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

export default function StudentViewModal({ student, isOpen, onClose, onEdit, onDelete }: StudentViewModalProps) {
	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	const formatDateShort = (dateString: string | null) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Student Details" size="xl">
			<div className="flex flex-col">
				{/* Student Header */}
				<div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
					<div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
						<UserIcon className="w-8 h-8 text-white" />
					</div>
					<div className="flex-1">
						<h2 className="text-2xl font-bold text-gray-900">{student.std_name}</h2>
						{student.std_code && (
							<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium mt-2 bg-blue-100 text-blue-800">
								{student.std_code}
							</span>
						)}
					</div>
				</div>

				{/* Details Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					{/* Student Code */}
					{student.std_code && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Student Code
							</label>
							<p className="text-gray-900 font-medium">{student.std_code}</p>
						</div>
					)}

					{/* Date of Birth */}
					{student.std_dob && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Date of Birth
							</label>
							<p className="text-gray-900 font-medium flex items-center gap-2">
								<CalendarIcon className="w-4 h-4 text-gray-400" />
								{formatDateShort(student.std_dob)}
							</p>
						</div>
					)}

					{/* Gender */}
					{student.std_gender && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Gender
							</label>
							<p className="text-gray-900 font-medium">{student.std_gender}</p>
						</div>
					)}

					{/* Status */}
					{student.status && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Status
							</label>
							<p className="text-gray-900 font-medium">{student.status}</p>
						</div>
					)}

					{/* Previous School */}
					{student.previous_school && (
						<div className="md:col-span-2">
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Previous School
							</label>
							<p className="text-gray-900 font-medium flex items-start gap-2">
								<BuildingOfficeIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
								<span>{student.previous_school}</span>
							</p>
						</div>
					)}

					{/* Started Class */}
					{student.started_class_name && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Started Class
							</label>
							<p className="text-gray-900 font-medium flex items-center gap-2">
								<AcademicCapIcon className="w-4 h-4 text-gray-400" />
								{student.started_class_name}
							</p>
						</div>
					)}

					{/* Current Class */}
					{student.current_class_name && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Current Class
							</label>
							<p className="text-gray-900 font-medium flex items-center gap-2">
								<AcademicCapIcon className="w-4 h-4 text-gray-400" />
								{student.current_class_name}
							</p>
						</div>
					)}

					{/* Parent Information */}
					{student.parent && (
						<div className="md:col-span-2 mt-4 pt-4 border-t border-gray-200">
							<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Parent Information</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{student.parent.mother_name && (
									<div>
										<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
											Mother Name
										</label>
										<p className="text-gray-900 font-medium">{student.parent.mother_name}</p>
									</div>
								)}
								{student.parent.father_name && (
									<div>
										<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
											Father Name
										</label>
										<p className="text-gray-900 font-medium">{student.parent.father_name}</p>
									</div>
								)}
								{student.parent.mother_phone && (
									<div>
										<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
											Mother Phone
										</label>
										<p className="text-gray-900 font-medium flex items-center gap-2">
											<PhoneIcon className="w-4 h-4 text-gray-400" />
											<a href={`tel:${student.parent.mother_phone}`} className="hover:text-primary-600 transition-colors">
												{student.parent.mother_phone}
											</a>
										</p>
									</div>
								)}
								{student.parent.father_phone && (
									<div>
										<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
											Father Phone
										</label>
										<p className="text-gray-900 font-medium flex items-center gap-2">
											<PhoneIcon className="w-4 h-4 text-gray-400" />
											<a href={`tel:${student.parent.father_phone}`} className="hover:text-primary-600 transition-colors">
												{student.parent.father_phone}
											</a>
										</p>
									</div>
								)}
								{student.parent.mother_email && (
									<div>
										<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
											Mother Email
										</label>
										<p className="text-gray-900 font-medium flex items-center gap-2">
											<EnvelopeIcon className="w-4 h-4 text-gray-400" />
											<a href={`mailto:${student.parent.mother_email}`} className="hover:text-primary-600 transition-colors break-all">
												{student.parent.mother_email}
											</a>
										</p>
									</div>
								)}
								{student.parent.father_email && (
									<div>
										<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
											Father Email
										</label>
										<p className="text-gray-900 font-medium flex items-center gap-2">
											<EnvelopeIcon className="w-4 h-4 text-gray-400" />
											<a href={`mailto:${student.parent.father_email}`} className="hover:text-primary-600 transition-colors break-all">
												{student.parent.father_email}
											</a>
										</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Created At */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Created At
						</label>
						<p className="text-gray-900 font-medium">{formatDate(student.created_at)}</p>
					</div>

					{/* Updated At */}
					{student.updated_at && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Last Updated
							</label>
							<p className="text-gray-900 font-medium">{formatDate(student.updated_at)}</p>
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


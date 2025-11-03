import Modal from '../../../components/Modal';
import { AcademicCapIcon, CalendarIcon } from '@heroicons/react/24/outline';

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

interface ClassTeacherViewModalProps {
	assignment: ClassTeacherMember;
	isOpen: boolean;
	onClose: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

export default function ClassTeacherViewModal({ assignment, isOpen, onClose, onEdit, onDelete }: ClassTeacherViewModalProps) {
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

	const calculateDuration = () => {
		if (!assignment.start_date || !assignment.end_date) return 'N/A';
		const start = new Date(assignment.start_date);
		const end = new Date(assignment.end_date);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		const months = Math.floor(diffDays / 30);
		const days = diffDays % 30;
		if (months > 0) {
			return `${months} month${months > 1 ? 's' : ''} ${days > 0 ? `${days} day${days > 1 ? 's' : ''}` : ''}`;
		}
		return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Teaching Schedule Details" size="xl">
			<div className="flex flex-col">
				{/* Header */}
				<div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
					<div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
						<AcademicCapIcon className="w-8 h-8 text-white" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-gray-900">
							{assignment.class_name || 'N/A'} - {assignment.subject_name || 'N/A'}
						</h2>
						<p className="text-gray-600 mt-1">{assignment.teacher_name || 'N/A'}</p>
					</div>
				</div>

				{/* Details Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					{/* Class */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Class
						</label>
						<div>
							<p className="text-gray-900 font-medium">{assignment.class_name || 'N/A'}</p>
							{assignment.class_type && (
								<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium bg-blue-100 text-blue-800 mt-1">
									{assignment.class_type}
								</span>
							)}
						</div>
					</div>

					{/* Subject */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Subject
						</label>
						<p className="text-gray-900 font-medium">{assignment.subject_name || 'N/A'}</p>
					</div>

					{/* Teacher Name */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Teacher
						</label>
						<p className="text-gray-900 font-medium">{assignment.teacher_name || 'N/A'}</p>
					</div>

					{/* Teacher Email */}
					{assignment.teacher_email && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Teacher Email
							</label>
							<p className="text-gray-900 font-medium">{assignment.teacher_email}</p>
						</div>
					)}

					{/* Teacher Specialization */}
					{assignment.teacher_specialized && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Specialization
							</label>
							<span className="inline-flex items-center px-3 py-1 rounded-[3px] text-sm font-medium bg-green-100 text-green-800">
								{assignment.teacher_specialized}
							</span>
						</div>
					)}

					{/* Start Date */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Start Date
						</label>
						<p className="text-gray-900 font-medium flex items-center gap-2">
							<CalendarIcon className="w-4 h-4 text-gray-400" />
							{formatDateShort(assignment.start_date)}
						</p>
					</div>

					{/* End Date */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							End Date
						</label>
						<p className="text-gray-900 font-medium flex items-center gap-2">
							<CalendarIcon className="w-4 h-4 text-gray-400" />
							{formatDateShort(assignment.end_date)}
						</p>
					</div>

					{/* Duration */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Duration
						</label>
						<p className="text-gray-900 font-medium">{calculateDuration()}</p>
					</div>

					{/* Created At */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Created At
						</label>
						<p className="text-gray-900 font-medium">{formatDate(assignment.created_at)}</p>
					</div>

					{/* Updated At */}
					{assignment.updated_at && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Last Updated
							</label>
							<p className="text-gray-900 font-medium">{formatDate(assignment.updated_at)}</p>
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


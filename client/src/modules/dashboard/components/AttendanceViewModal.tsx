import Modal from '../../../components/Modal';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface AttendanceItem {
	att_id: string;
	school_id: string;
	teacher_id: string;
	std_id: string;
	subj_id: string;
	cls_id: string | null;
	date: string;
	status: string;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
	// Joined fields
	school_name?: string | null;
	teacher_name?: string | null;
	student_name?: string | null;
	subject_name?: string | null;
	class_name?: string | null;
}

interface AttendanceViewModalProps {
	attendance: AttendanceItem | null;
	isOpen: boolean;
	onClose: () => void;
	onEdit?: () => void;
	onDelete?: () => void;
}

export default function AttendanceViewModal({ attendance, isOpen, onClose, onEdit, onDelete }: AttendanceViewModalProps) {
	if (!isOpen || !attendance) return null;

	const formatDateTime = (dateString: string | null) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const getStatusBadge = (status: string | null) => {
		if (!status) return null;

		const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
			present: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
			absent: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
			late: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
			excused: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircleIcon },
		};

		const config = statusConfig[status.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: ClockIcon };
		const Icon = config.icon;

		return (
			<span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
				<Icon className="w-4 h-4" />
				{status.charAt(0).toUpperCase() + status.slice(1)}
			</span>
		);
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Attendance Details" size="xl">
			<div className="space-y-6">
				{/* Header with Status */}
				<div className="flex items-center justify-between pb-4 border-b border-gray-200">
					<div>
						<h2 className="text-2xl font-bold text-gray-900">Attendance Record</h2>
						<p className="text-gray-600 mt-1">{attendance.student_name || 'N/A'}</p>
					</div>
					{getStatusBadge(attendance.status)}
				</div>

				{/* Main Details */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Student</label>
						<p className="text-lg font-semibold text-gray-900">{attendance.student_name || 'N/A'}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Teacher</label>
						<p className="text-lg text-gray-900">{attendance.teacher_name || 'N/A'}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Subject</label>
						<p className="text-lg text-gray-900">{attendance.subject_name || 'N/A'}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Class</label>
						<p className="text-lg text-gray-900">{attendance.class_name || 'N/A'}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Date & Time</label>
						<p className="text-lg text-gray-900">{formatDateTime(attendance.date)}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
						<div className="mt-1">{getStatusBadge(attendance.status)}</div>
					</div>
				</div>

				{/* Metadata */}
				<div className="pt-4 border-t border-gray-200">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
							<p className="text-gray-900">{formatDateTime(attendance.created_at)}</p>
						</div>
						{attendance.updated_at && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">Updated At</label>
								<p className="text-gray-900">{formatDateTime(attendance.updated_at)}</p>
							</div>
						)}
					</div>
				</div>

				{/* Actions */}
				{(onEdit || onDelete) && (
					<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
						{onEdit && (
							<button
								onClick={onEdit}
								className="px-4 py-2 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors"
							>
								Edit
							</button>
						)}
						{onDelete && (
							<button
								onClick={onDelete}
								className="px-4 py-2 bg-red-600 text-white rounded-[3px] hover:bg-red-700 transition-colors"
							>
								Delete
							</button>
						)}
					</div>
				)}
			</div>
		</Modal>
	);
}


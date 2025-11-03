import Modal from '../../../components/Modal';
import { CalendarIcon } from '@heroicons/react/24/outline';

interface AcademicYearMember {
	academic_id: string;
	academic_name: string;
	start_date: string;
	end_date: string;
	is_current: boolean;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
}

interface AcademicYearViewModalProps {
	academicYear: AcademicYearMember;
	isOpen: boolean;
	onClose: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

export default function AcademicYearViewModal({ academicYear, isOpen, onClose, onEdit, onDelete }: AcademicYearViewModalProps) {
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
		if (!academicYear.start_date || !academicYear.end_date) return 'N/A';
		const start = new Date(academicYear.start_date);
		const end = new Date(academicYear.end_date);
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
		<Modal isOpen={isOpen} onClose={onClose} title={academicYear.academic_name || 'Academic Year Details'} size="xl">
			<div className="flex flex-col">
				{/* Academic Year Header */}
				<div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
					<div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
						<CalendarIcon className="w-8 h-8 text-white" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-gray-900">{academicYear.academic_name || 'N/A'}</h2>
						<span
							className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium mt-2 ${
								academicYear.is_current
									? 'bg-green-100 text-green-800'
									: 'bg-gray-100 text-gray-800'
							}`}
						>
							<span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
								academicYear.is_current ? 'bg-green-500' : 'bg-gray-400'
							}`}></span>
							{academicYear.is_current ? 'Current Academic Year' : 'Previous Academic Year'}
						</span>
					</div>
				</div>

				{/* Details Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					{/* Start Date */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Start Date
						</label>
						<p className="text-gray-900 font-medium flex items-center gap-2">
							<CalendarIcon className="w-4 h-4 text-gray-400" />
							{formatDateShort(academicYear.start_date)}
						</p>
					</div>

					{/* End Date */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							End Date
						</label>
						<p className="text-gray-900 font-medium flex items-center gap-2">
							<CalendarIcon className="w-4 h-4 text-gray-400" />
							{formatDateShort(academicYear.end_date)}
						</p>
					</div>

					{/* Duration */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Duration
						</label>
						<p className="text-gray-900 font-medium">{calculateDuration()}</p>
					</div>

					{/* Status */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Status
						</label>
						<span
							className={`inline-flex items-center px-3 py-1 rounded-[3px] text-sm font-medium ${
								academicYear.is_current
									? 'bg-green-100 text-green-800'
									: 'bg-gray-100 text-gray-800'
							}`}
						>
							<span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
								academicYear.is_current ? 'bg-green-500' : 'bg-gray-400'
							}`}></span>
							{academicYear.is_current ? 'Current' : 'Inactive'}
						</span>
					</div>

					{/* Created At */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Created At
						</label>
						<p className="text-gray-900 font-medium">{formatDate(academicYear.created_at)}</p>
					</div>

					{/* Updated At */}
					{academicYear.updated_at && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Last Updated
							</label>
							<p className="text-gray-900 font-medium">{formatDate(academicYear.updated_at)}</p>
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



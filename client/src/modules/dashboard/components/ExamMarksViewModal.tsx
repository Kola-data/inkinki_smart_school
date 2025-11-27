import Modal from '../../../components/Modal';

interface ExamMarkItem {
	exam_mark_id: string;
	school_id: string;
	std_id: string;
	subj_id: string;
	cls_id: string;
	academic_id: string;
	term: string;
	exam_mark: number;
	exam_avg_mark?: number | null;
	status?: string | null;
	is_published: boolean;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
	// Joined fields
	school_name?: string | null;
	student_name?: string | null;
	subject_name?: string | null;
	class_name?: string | null;
	academic_year_name?: string | null;
}

interface ExamMarksViewModalProps {
	testMark: ExamMarkItem | null;
	isOpen: boolean;
	onClose: () => void;
	onEdit?: () => void;
	onDelete?: () => void;
}

export default function ExamMarksViewModal({ testMark, isOpen, onClose, onEdit, onDelete }: ExamMarksViewModalProps) {
	if (!isOpen || !testMark) return null;

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

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Exam Mark Details" size="xl">
			<div className="space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between pb-4 border-b border-gray-200">
					<div>
						<h2 className="text-2xl font-bold text-gray-900">Exam Mark Record</h2>
						<p className="text-gray-600 mt-1">{testMark.student_name || 'N/A'}</p>
					</div>
					{testMark.status && (
						<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
							{testMark.status}
						</span>
					)}
				</div>

				{/* Main Details */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Student</label>
						<p className="text-lg font-semibold text-gray-900">{testMark.student_name || 'N/A'}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Subject</label>
						<p className="text-lg text-gray-900">{testMark.subject_name || 'N/A'}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Class</label>
						<p className="text-lg text-gray-900">{testMark.class_name || 'N/A'}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Academic Year</label>
						<p className="text-lg text-gray-900">{testMark.academic_year_name || 'N/A'}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Term</label>
						<p className="text-lg text-gray-900">{testMark.term || 'N/A'}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Exam Mark</label>
						<p className="text-lg font-bold text-primary-600">
							{testMark.exam_mark !== null && testMark.exam_mark !== undefined 
								? Number(testMark.exam_mark).toFixed(1) 
								: '0.0'}
						</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Average Mark</label>
						<p className="text-lg text-gray-900">
							{testMark.exam_avg_mark !== null && testMark.exam_avg_mark !== undefined 
								? Number(testMark.exam_avg_mark).toFixed(1) 
								: 'N/A'}
						</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
						<div className="mt-1">
							{testMark.status ? (
								<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
									{testMark.status}
								</span>
							) : (
								<span className="text-gray-400">-</span>
							)}
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Published</label>
						<div className="mt-1">
							{testMark.is_published ? (
								<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
									Published
								</span>
							) : (
								<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
									Not Published
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Metadata */}
				<div className="pt-4 border-t border-gray-200">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
							<p className="text-gray-900">{formatDateTime(testMark.created_at)}</p>
						</div>
						{testMark.updated_at && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">Updated At</label>
								<p className="text-gray-900">{formatDateTime(testMark.updated_at)}</p>
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


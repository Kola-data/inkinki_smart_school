import Modal from '../../../components/Modal';
import { BookOpenIcon } from '@heroicons/react/24/outline';

interface SubjectMember {
	subj_id: string;
	subj_name: string;
	subj_desc: string | null;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
}

interface SubjectViewModalProps {
	subject: SubjectMember;
	isOpen: boolean;
	onClose: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

export default function SubjectViewModal({ subject, isOpen, onClose, onEdit, onDelete }: SubjectViewModalProps) {
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

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={subject.subj_name || 'Subject Details'} size="xl">
			<div className="flex flex-col">
				{/* Subject Header */}
				<div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
					<div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
						<BookOpenIcon className="w-8 h-8 text-white" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-gray-900">{subject.subj_name || 'N/A'}</h2>
					</div>
				</div>

				{/* Details Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					{/* Description */}
					<div className="md:col-span-2">
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Description
						</label>
						{subject.subj_desc ? (
							<p className="text-gray-900 font-medium whitespace-pre-wrap">{subject.subj_desc}</p>
						) : (
							<p className="text-gray-500 italic">No description provided</p>
						)}
					</div>

					{/* Created At */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Created At
						</label>
						<p className="text-gray-900 font-medium">{formatDate(subject.created_at)}</p>
					</div>

					{/* Updated At */}
					{subject.updated_at && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Last Updated
							</label>
							<p className="text-gray-900 font-medium">{formatDate(subject.updated_at)}</p>
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


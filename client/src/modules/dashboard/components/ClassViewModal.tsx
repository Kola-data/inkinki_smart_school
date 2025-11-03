import Modal from '../../../components/Modal';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface ClassMember {
	cls_id: string;
	cls_name: string;
	cls_type: string;
	cls_manager: string;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
	manager_name: string | null;
	manager_email: string | null;
	manager_specialized: string | null;
}

interface ClassViewModalProps {
	classItem: ClassMember;
	isOpen: boolean;
	onClose: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

export default function ClassViewModal({ classItem, isOpen, onClose, onEdit, onDelete }: ClassViewModalProps) {
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
		<Modal isOpen={isOpen} onClose={onClose} title={classItem.cls_name || 'Class Details'} size="xl">
			<div className="flex flex-col">
				{/* Class Header */}
				<div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
					<div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
						<BuildingOfficeIcon className="w-8 h-8 text-white" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-gray-900">{classItem.cls_name || 'N/A'}</h2>
						{classItem.cls_type && (
							<span className="inline-flex items-center px-3 py-1 rounded-[3px] text-sm font-medium bg-blue-100 text-blue-800 mt-2">
								{classItem.cls_type}
							</span>
						)}
					</div>
				</div>

				{/* Details Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					{/* Class Type */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Class Type
						</label>
						<p className="text-gray-900 font-medium">{classItem.cls_type || 'N/A'}</p>
					</div>

					{/* Manager Name */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Class Manager
						</label>
						<p className="text-gray-900 font-medium">{classItem.manager_name || 'N/A'}</p>
					</div>

					{/* Manager Email */}
					{classItem.manager_email && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Manager Email
							</label>
							<p className="text-gray-900 font-medium">{classItem.manager_email}</p>
						</div>
					)}

					{/* Manager Specialization */}
					{classItem.manager_specialized && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Specialization
							</label>
							<span className="inline-flex items-center px-3 py-1 rounded-[3px] text-sm font-medium bg-green-100 text-green-800">
								{classItem.manager_specialized}
							</span>
						</div>
					)}

					{/* Created At */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Created At
						</label>
						<p className="text-gray-900 font-medium">{formatDate(classItem.created_at)}</p>
					</div>

					{/* Updated At */}
					{classItem.updated_at && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Last Updated
							</label>
							<p className="text-gray-900 font-medium">{formatDate(classItem.updated_at)}</p>
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


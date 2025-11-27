import Modal from '../../../components/Modal';
import { UserGroupIcon, EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface ParentMember {
	par_id: string;
	mother_name: string | null;
	father_name: string | null;
	mother_phone: string | null;
	father_phone: string | null;
	mother_email: string | null;
	father_email: string | null;
	par_address: string | null;
	par_type: string | null;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
}

interface ParentViewModalProps {
	parent: ParentMember;
	isOpen: boolean;
	onClose: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

export default function ParentViewModal({ parent, isOpen, onClose, onEdit, onDelete }: ParentViewModalProps) {
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

	const getParentDisplayName = () => {
		if (parent.mother_name && parent.father_name) {
			return `${parent.mother_name} & ${parent.father_name}`;
		}
		return parent.mother_name || parent.father_name || 'N/A';
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Parent Details" size="xl">
			<div className="flex flex-col">
				{/* Parent Header */}
				<div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
					<div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
						<UserGroupIcon className="w-8 h-8 text-white" />
					</div>
					<div className="flex-1">
						<h2 className="text-2xl font-bold text-gray-900">{getParentDisplayName()}</h2>
						{parent.par_type && (
							<span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium mt-2 bg-blue-100 text-blue-800">
								{parent.par_type}
							</span>
						)}
					</div>
				</div>

				{/* Details Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					{/* Mother Name */}
					{parent.mother_name && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Mother Name
							</label>
							<p className="text-gray-900 font-medium">{parent.mother_name}</p>
						</div>
					)}

					{/* Father Name */}
					{parent.father_name && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Father Name
							</label>
							<p className="text-gray-900 font-medium">{parent.father_name}</p>
						</div>
					)}

					{/* Mother Phone */}
					{parent.mother_phone && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Mother Phone
							</label>
							<p className="text-gray-900 font-medium flex items-center gap-2">
								<PhoneIcon className="w-4 h-4 text-gray-400" />
								<a href={`tel:${parent.mother_phone}`} className="hover:text-primary-600 transition-colors">
									{parent.mother_phone}
								</a>
							</p>
						</div>
					)}

					{/* Father Phone */}
					{parent.father_phone && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Father Phone
							</label>
							<p className="text-gray-900 font-medium flex items-center gap-2">
								<PhoneIcon className="w-4 h-4 text-gray-400" />
								<a href={`tel:${parent.father_phone}`} className="hover:text-primary-600 transition-colors">
									{parent.father_phone}
								</a>
							</p>
						</div>
					)}

					{/* Mother Email */}
					{parent.mother_email && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Mother Email
							</label>
							<p className="text-gray-900 font-medium flex items-center gap-2">
								<EnvelopeIcon className="w-4 h-4 text-gray-400" />
								<a href={`mailto:${parent.mother_email}`} className="hover:text-primary-600 transition-colors break-all">
									{parent.mother_email}
								</a>
							</p>
						</div>
					)}

					{/* Father Email */}
					{parent.father_email && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Father Email
							</label>
							<p className="text-gray-900 font-medium flex items-center gap-2">
								<EnvelopeIcon className="w-4 h-4 text-gray-400" />
								<a href={`mailto:${parent.father_email}`} className="hover:text-primary-600 transition-colors break-all">
									{parent.father_email}
								</a>
							</p>
						</div>
					)}

					{/* Address */}
					{parent.par_address && (
						<div className="md:col-span-2">
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Address
							</label>
							<p className="text-gray-900 font-medium flex items-start gap-2">
								<MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
								<span className="break-words">{parent.par_address}</span>
							</p>
						</div>
					)}

					{/* Created At */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Created At
						</label>
						<p className="text-gray-900 font-medium">{formatDate(parent.created_at)}</p>
					</div>

					{/* Updated At */}
					{parent.updated_at && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Last Updated
							</label>
							<p className="text-gray-900 font-medium">{formatDate(parent.updated_at)}</p>
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

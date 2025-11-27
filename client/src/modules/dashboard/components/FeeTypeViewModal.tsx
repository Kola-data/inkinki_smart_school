import Modal from '../../../components/Modal';
import { BanknotesIcon } from '@heroicons/react/24/outline';

interface FeeTypeMember {
	fee_type_id: string;
	school_id: string;
	fee_type_name: string;
	description: string | null;
	amount_to_pay: number;
	is_active: string;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
}

interface FeeTypeViewModalProps {
	feeType: FeeTypeMember;
	isOpen: boolean;
	onClose: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

export default function FeeTypeViewModal({ feeType, isOpen, onClose, onEdit, onDelete }: FeeTypeViewModalProps) {
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

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
		}).format(amount);
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={feeType.fee_type_name || 'Fee Type Details'} size="xl">
			<div className="flex flex-col">
				{/* Fee Type Header */}
				<div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
					<div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center">
						<BanknotesIcon className="w-8 h-8 text-white" />
					</div>
					<div className="flex-1">
						<h2 className="text-2xl font-bold text-gray-900">{feeType.fee_type_name || 'N/A'}</h2>
						{feeType.is_active && (
							<span className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-xs font-medium mt-2 ${
								feeType.is_active === 'true' 
									? 'bg-green-100 text-green-800' 
									: 'bg-red-100 text-red-800'
							}`}>
								{feeType.is_active === 'true' ? 'Active' : 'Inactive'}
							</span>
						)}
					</div>
				</div>

				{/* Details Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					{/* Amount to Pay */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Amount to Pay
						</label>
						<p className="text-gray-900 font-medium text-lg">{formatCurrency(feeType.amount_to_pay || 0)}</p>
					</div>

					{/* Status */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Status
						</label>
						<p className="text-gray-900 font-medium">
							{feeType.is_active === 'true' ? 'Active' : 'Inactive'}
						</p>
					</div>

					{/* Description */}
					<div className="md:col-span-2">
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Description
						</label>
						{feeType.description ? (
							<p className="text-gray-900 font-medium whitespace-pre-wrap">{feeType.description}</p>
						) : (
							<p className="text-gray-500 italic">No description provided</p>
						)}
					</div>

					{/* Created At */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Created At
						</label>
						<p className="text-gray-900 font-medium">{formatDate(feeType.created_at)}</p>
					</div>

					{/* Updated At */}
					{feeType.updated_at && (
						<div>
							<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
								Last Updated
							</label>
							<p className="text-gray-900 font-medium">{formatDate(feeType.updated_at)}</p>
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


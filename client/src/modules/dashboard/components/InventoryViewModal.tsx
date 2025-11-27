import Modal from '../../../components/Modal';
import { PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface InventoryItem {
	inv_id: string;
	school_id: string;
	inv_name: string;
	inv_service: string | null;
	inv_desc: string | null;
	inv_date: string | null;
	inv_price: number | null;
	inv_status: string | null;
	created_at: string | null;
	updated_at: string | null;
}

interface InventoryViewModalProps {
	inventory: InventoryItem | null;
	isOpen: boolean;
	onClose: () => void;
	onEdit?: () => void;
	onDelete?: () => void;
}

export default function InventoryViewModal({
	inventory,
	isOpen,
	onClose,
	onEdit,
	onDelete,
}: InventoryViewModalProps) {
	if (!isOpen || !inventory) return null;

	const formatCurrency = (amount: number | null) => {
		if (amount === null || amount === undefined) return 'N/A';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
		}).format(amount);
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	const formatDateTime = (dateString: string | null) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const getStatusBadge = (status: string | null) => {
		if (!status) return null;

		const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
			Available: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
			'In Use': { bg: 'bg-blue-100', text: 'text-blue-800', icon: ClockIcon },
			Maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
			Disposed: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
			Reserved: { bg: 'bg-purple-100', text: 'text-purple-800', icon: ClockIcon },
		};

		const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: ClockIcon };
		const Icon = config.icon;

		return (
			<span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
				<Icon className="w-4 h-4" />
				{status}
			</span>
		);
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={inventory.inv_name || 'Inventory Details'} size="xl">
			<div className="flex flex-col">
				{/* Header Actions */}
				{(onEdit || onDelete) && (
					<div className="flex items-center justify-end gap-2 mb-6 pb-4 border-b border-gray-200">
						{onEdit && (
							<button
								onClick={onEdit}
								className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-[3px] hover:bg-blue-700 transition-colors"
							>
								<PencilIcon className="w-4 h-4" />
								Edit
							</button>
						)}
						{onDelete && (
							<button
								onClick={onDelete}
								className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-[3px] hover:bg-red-700 transition-colors"
							>
								<TrashIcon className="w-4 h-4" />
								Delete
							</button>
						)}
					</div>
				)}

				{/* Details */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Item Name */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
							Item Name
						</label>
						<div className="text-base font-medium text-gray-900">{inventory.inv_name || 'N/A'}</div>
					</div>

					{/* Status */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
							Status
						</label>
						<div>{getStatusBadge(inventory.inv_status)}</div>
					</div>

					{/* Service */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
							Service
						</label>
						<div className="text-base text-gray-900">{inventory.inv_service || 'N/A'}</div>
					</div>

					{/* Price */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
							Price
						</label>
						<div className="text-base font-medium text-gray-900">{formatCurrency(inventory.inv_price)}</div>
					</div>

					{/* Date */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
							Date
						</label>
						<div className="text-base text-gray-900">{formatDate(inventory.inv_date)}</div>
					</div>

					{/* Created At */}
					<div>
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
							Created At
						</label>
						<div className="text-base text-gray-900">{formatDateTime(inventory.created_at)}</div>
					</div>
				</div>

				{/* Description */}
				{inventory.inv_desc && (
					<div className="mt-6 pt-6 border-t border-gray-200">
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
							Description
						</label>
						<div className="text-base text-gray-900 whitespace-pre-wrap">{inventory.inv_desc}</div>
					</div>
				)}

				{/* Updated At */}
				{inventory.updated_at && (
					<div className="mt-6 pt-6 border-t border-gray-200">
						<label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
							Last Updated
						</label>
						<div className="text-base text-gray-900">{formatDateTime(inventory.updated_at)}</div>
					</div>
				)}
			</div>
		</Modal>
	);
}


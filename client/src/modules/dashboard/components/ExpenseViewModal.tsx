import Modal from '../../../components/Modal';
import { CheckCircleIcon, XCircleIcon, ClockIcon, BanknotesIcon } from '@heroicons/react/24/outline';

interface ExpenseItem {
	expense_id: string;
	school_id: string;
	category: string;
	title: string;
	description: string | null;
	amount: number;
	payment_method: string | null;
	status: string;
	expense_date: string | null;
	invoice_image: string[] | null;
	added_by: string | null;
	approved_by: string | null;
	is_deleted: boolean;
	created_at: string | null;
	updated_at: string | null;
}

interface ExpenseViewModalProps {
	expense: ExpenseItem | null;
	isOpen: boolean;
	onClose: () => void;
	onEdit?: () => void;
	onDelete?: () => void;
}

const API_BASE_URL = 'http://localhost:8000';

export default function ExpenseViewModal({ expense, isOpen, onClose, onEdit, onDelete }: ExpenseViewModalProps) {
	if (!isOpen || !expense) return null;

	const formatCurrency = (amount: number) => {
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
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const getStatusBadge = (status: string | null) => {
		if (!status) return null;

		const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
			PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
			APPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircleIcon },
			PAID: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
			REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
			ARCHIVED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: ClockIcon },
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

	const getImageUrl = (imagePath: string) => {
		if (!imagePath) return null;
		if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
			return imagePath;
		}
		return `${API_BASE_URL}/${imagePath}`;
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={expense.title || 'Expense Details'} size="xl">
			<div className="space-y-6">
				{/* Header with Status */}
				<div className="flex items-center justify-between pb-4 border-b border-gray-200">
					<div>
						<h2 className="text-2xl font-bold text-gray-900">{expense.title}</h2>
						<p className="text-gray-600 mt-1">{expense.category}</p>
					</div>
					{getStatusBadge(expense.status)}
				</div>

				{/* Main Details */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Amount</label>
						<p className="text-lg font-semibold text-gray-900">{formatCurrency(expense.amount || 0)}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Payment Method</label>
						<p className="text-lg text-gray-900">
							{expense.payment_method ? expense.payment_method.replace('_', ' ') : 'N/A'}
						</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Expense Date</label>
						<p className="text-lg text-gray-900">{formatDate(expense.expense_date)}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
						<p className="text-lg text-gray-900">{expense.category}</p>
					</div>
				</div>

				{/* Description */}
				{expense.description && (
					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
						<p className="text-gray-900 whitespace-pre-wrap">{expense.description}</p>
					</div>
				)}

				{/* Invoice Images */}
				{expense.invoice_image && expense.invoice_image.length > 0 && (
					<div>
						<label className="block text-sm font-medium text-gray-500 mb-2">Invoice Images</label>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
							{expense.invoice_image.map((img, index) => {
								const imageUrl = getImageUrl(img);
								if (!imageUrl) return null;
								return (
									<div key={index} className="relative">
										<img
											src={imageUrl}
											alt={`Invoice ${index + 1}`}
											className="w-full h-48 object-cover rounded-[3px] border border-gray-300 cursor-pointer hover:opacity-90 transition-opacity"
											onClick={() => window.open(imageUrl, '_blank')}
										/>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Metadata */}
				<div className="pt-4 border-t border-gray-200">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
							<p className="text-gray-900">{formatDateTime(expense.created_at)}</p>
						</div>
						{expense.updated_at && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">Updated At</label>
								<p className="text-gray-900">{formatDateTime(expense.updated_at)}</p>
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


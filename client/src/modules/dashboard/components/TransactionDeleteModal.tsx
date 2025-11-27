import { useState, useEffect } from 'react';
import Modal from '../../../components/Modal';
import { DocumentTextIcon, PhotoIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import toast from 'react-hot-toast';

interface Invoice {
	invoice_id: string;
	fee_id: string;
	school_id: string;
	amount: number;
	invoice_img: string | null;
	created_at: string | null;
	updated_at: string | null;
}

interface FeeManagementMember {
	fee_id: string;
	school_id: string;
	std_id: string;
	fee_type_id: string;
	academic_id: string;
	term: string;
	amount_paid: number;
	status: string;
}

interface TransactionDeleteModalProps {
	fee: FeeManagementMember;
	schoolId: string;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	onEditRequest?: (invoiceIds: string[]) => void;
}

interface SelectableTransaction {
	invoice: Invoice;
	selectedForDelete: boolean;
	selectedForEdit: boolean;
}

export default function TransactionDeleteModal({
	fee,
	schoolId,
	isOpen,
	onClose,
	onSuccess,
	onEditRequest,
}: TransactionDeleteModalProps) {
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [selectableTransactions, setSelectableTransactions] = useState<SelectableTransaction[]>([]);

	useEffect(() => {
		if (isOpen && fee.fee_id && schoolId) {
			fetchInvoices();
		}
	}, [isOpen, fee.fee_id, schoolId]);

	const fetchInvoices = async () => {
		try {
			setLoading(true);
			const { data } = await api.get(`/fee-invoices/?school_id=${schoolId}&fee_id=${fee.fee_id}`);
			const fetchedInvoices = data || [];
			setInvoices(fetchedInvoices);
			setSelectableTransactions(
				fetchedInvoices.map((inv: Invoice) => ({
					invoice: inv,
					selectedForDelete: false,
					selectedForEdit: false,
				}))
			);
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to fetch transactions');} finally {
			setLoading(false);
		}
	};

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
			month: 'short',
			day: 'numeric',
		});
	};

	const getImageUrl = (imagePath: string | null) => {
		if (!imagePath) return null;
		const baseURL = api.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:8000';
		let path = imagePath;
		if (!path.startsWith('uploads/')) {
			path = `uploads/${path}`;
		}
		return `${baseURL}${path.startsWith('/') ? path : `/${path}`}`;
	};

	const toggleDelete = (invoiceId: string) => {
		setSelectableTransactions((prev) =>
			prev.map((st) =>
				st.invoice.invoice_id === invoiceId
					? { ...st, selectedForDelete: !st.selectedForDelete, selectedForEdit: false }
					: st
			)
		);
	};

	const toggleEdit = (invoiceId: string) => {
		setSelectableTransactions((prev) =>
			prev.map((st) =>
				st.invoice.invoice_id === invoiceId
					? { ...st, selectedForEdit: !st.selectedForEdit, selectedForDelete: false }
					: st
			)
		);
	};

	const handleDelete = async () => {
		const selectedForDelete = selectableTransactions.filter((st) => st.selectedForDelete);
		
		if (selectedForDelete.length === 0) {
			const selectedForEdit = selectableTransactions.filter((st) => st.selectedForEdit);
			if (selectedForEdit.length > 0 && onEditRequest) {
				// If user selected transactions for editing, open edit modal
				const invoiceIds = selectedForEdit.map((st) => st.invoice.invoice_id);
				onEditRequest(invoiceIds);
				onClose();
				return;
			}
			toast.error('Please select at least one transaction to delete or edit');
			return;
		}

		setDeleting(true);
		try {
			// Delete selected transactions
			const deletePromises = selectedForDelete.map((st) =>
				api.delete(`/fee-invoices/${st.invoice.invoice_id}?school_id=${schoolId}`)
			);

			await Promise.all(deletePromises);

			// Fetch all remaining transactions after deletion
			const remainingInvoicesResponse = await api.get(`/fee-invoices/?school_id=${schoolId}&fee_id=${fee.fee_id}`);
			const remainingInvoices = getArrayFromResponse(remainingInvoicesResponse.data);

			// Sum all remaining transactions
			const newAmountPaid = remainingInvoices.reduce((sum: number, inv: Invoice) => {
				return sum + (inv.amount || 0);
			}, 0);

			// Update fee management record with sum of all remaining transactions
			// This replaces the existing amount, not adds to it
			await api.put(`/fee-management/${fee.fee_id}?school_id=${schoolId}`, {
				amount_paid: newAmountPaid,
				replace_amount: true, // Replace the amount instead of adding
			});

			toast.success(`${selectedForDelete.length} transaction(s) deleted successfully! New total: ${formatCurrency(newAmountPaid)}`);
			onSuccess();
			onClose();
		} catch (error: any) {
			toast.error(error.response?.data?.detail || 'Failed to delete transactions');} finally {
			setDeleting(false);
		}
	};

	const handleEditSelected = () => {
		const selectedForEdit = selectableTransactions.filter((st) => st.selectedForEdit);
		
		if (selectedForEdit.length === 0) {
			toast.error('Please select at least one transaction to edit');
			return;
		}

		if (onEditRequest) {
			const invoiceIds = selectedForEdit.map((st) => st.invoice.invoice_id);
			onEditRequest(invoiceIds);
			onClose();
		}
	};

	const selectedForDeleteCount = selectableTransactions.filter((st) => st.selectedForDelete).length;
	const selectedForEditCount = selectableTransactions.filter((st) => st.selectedForEdit).length;

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Delete/Edit Transactions" size="4xl">
			<div className="flex flex-col">
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					</div>
				) : invoices.length === 0 ? (
					<div className="text-center py-12">
						<DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-500 text-lg">No transactions found</p>
					</div>
				) : (
					<>
						<div className="mb-4 p-3 bg-red-50 rounded-[3px] border border-red-200">
							<p className="text-sm text-gray-700 mb-2">
								Select transactions to delete or edit. You can choose to either delete transactions or edit them.
							</p>
							<div className="flex items-center gap-4 text-sm">
								<span className="text-red-600 font-medium">
									{selectedForDeleteCount} selected for deletion
								</span>
								<span className="text-blue-600 font-medium">
									{selectedForEditCount} selected for editing
								</span>
							</div>
						</div>

						<div className="space-y-4 max-h-[500px] overflow-y-auto">
							{selectableTransactions.map((st) => {
								const imageUrl = getImageUrl(st.invoice.invoice_img);
								const isSelectedForDelete = st.selectedForDelete;
								const isSelectedForEdit = st.selectedForEdit;

								return (
									<div
										key={st.invoice.invoice_id}
										className={`border rounded-[3px] p-4 ${
											isSelectedForDelete
												? 'border-red-500 bg-red-50'
												: isSelectedForEdit
												? 'border-blue-500 bg-blue-50'
												: 'border-gray-200 bg-white'
										}`}
									>
										<div className="flex items-start gap-4">
											{/* Selection Buttons */}
											<div className="flex flex-col gap-2">
												<label className="flex items-center gap-2 cursor-pointer">
													<input
														type="checkbox"
														checked={isSelectedForDelete}
														onChange={() => toggleDelete(st.invoice.invoice_id)}
														className="h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
													/>
													<span className="text-xs text-red-600 font-medium">Delete</span>
												</label>
												<label className="flex items-center gap-2 cursor-pointer">
													<input
														type="checkbox"
														checked={isSelectedForEdit}
														onChange={() => toggleEdit(st.invoice.invoice_id)}
														className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
													/>
													<span className="text-xs text-blue-600 font-medium">Edit</span>
												</label>
											</div>

											{/* Transaction Info */}
											<div className="flex-1">
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
													{/* Amount */}
													<div>
														<label className="block text-xs font-medium text-gray-500 mb-1">
															Amount
														</label>
														<p className="text-sm font-bold text-gray-900">
															{formatCurrency(st.invoice.amount)}
														</p>
													</div>

													{/* Date */}
													<div>
														<label className="block text-xs font-medium text-gray-500 mb-1">
															Date
														</label>
														<p className="text-sm text-gray-700">
															{formatDate(st.invoice.created_at)}
														</p>
													</div>

													{/* Invoice Image */}
													<div>
														<label className="block text-xs font-medium text-gray-500 mb-1">
															Invoice Image
														</label>
														{imageUrl ? (
															<a
																href={imageUrl}
																target="_blank"
																rel="noopener noreferrer"
																className="block"
															>
																<img
																	src={imageUrl}
																	alt="Invoice"
																	className="w-20 h-20 object-contain border border-gray-300 rounded-[3px] hover:opacity-90 transition-opacity cursor-pointer"
																/>
															</a>
														) : (
															<div className="w-20 h-20 border border-gray-300 rounded-[3px] bg-gray-100 flex items-center justify-center">
																<PhotoIcon className="w-8 h-8 text-gray-400" />
															</div>
														)}
													</div>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{/* Footer */}
						<div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
							<div>
								{selectedForEditCount > 0 && (
									<button
										onClick={handleEditSelected}
										className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-[3px] hover:bg-blue-700 transition-colors flex items-center gap-2"
									>
										<PencilIcon className="w-4 h-4" />
										Edit Selected ({selectedForEditCount})
									</button>
								)}
							</div>
							<div className="flex items-center gap-3">
								<button
									onClick={onClose}
									className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 transition-colors"
									disabled={deleting}
								>
									Cancel
								</button>
								<button
									onClick={handleDelete}
									disabled={deleting || selectedForDeleteCount === 0}
									className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-[3px] hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									{deleting ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											Deleting...
										</>
									) : (
										<>
											<TrashIcon className="w-4 h-4" />
											Delete Selected ({selectedForDeleteCount})
										</>
									)}
								</button>
							</div>
						</div>
					</>
				)}
			</div>
		</Modal>
	);
}


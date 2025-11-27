import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import { getArrayFromResponse } from '../../../../utils/apiHelpers';
import {
	CurrencyDollarIcon,
	PlusIcon,
	MagnifyingGlassIcon,
	PencilIcon,
	TrashIcon,
	CalendarDaysIcon,
	SparklesIcon,
} from '@heroicons/react/24/outline';

interface PaymentSeason {
	pay_id: string;
	season_pay_name: string;
	from_date: string;
	end_date: string;
	amount: number;
	coupon_number?: string;
	status: string;
	is_deleted: boolean;
	created_at: string;
	updated_at?: string;
}

export default function PaymentSeasonsManagement() {
	const [seasons, setSeasons] = useState<PaymentSeason[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingSeason, setEditingSeason] = useState<PaymentSeason | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [formData, setFormData] = useState({
		season_pay_name: '',
		from_date: '',
		end_date: '',
		amount: '',
		coupon_number: '',
		status: 'active'
	});

	// Autocomplete states for status
	const [statusQuery, setStatusQuery] = useState('Active');
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const [statusHighlightedIndex, setStatusHighlightedIndex] = useState(-1);
	const statusDropdownRef = useRef<HTMLDivElement>(null);
	const statusInputRef = useRef<HTMLInputElement>(null);

	const statusOptions = ['active', 'inactive', 'completed'];

	useEffect(() => {
		fetchSeasons();
	}, []);

	const fetchSeasons = async () => {
		try {
			setLoading(true);
			const { data } = await api.get('/payment-seasons/');
			// Handle paginated response
			setSeasons(getArrayFromResponse(data));
		} catch (err: any) {
			const errorMessage = err.response?.data?.detail || 'Failed to fetch payment seasons';
			toast.error(errorMessage);
			setSeasons([]);
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const payload = {
				...formData,
				amount: parseFloat(formData.amount),
				coupon_number: formData.coupon_number || null,
			};

			if (editingSeason) {
				await api.put(`/payment-seasons/${editingSeason.pay_id}`, payload);
				toast.success('Payment season updated successfully');
			} else {
				await api.post('/payment-seasons/', payload);
				toast.success('Payment season created successfully');
			}

			setShowForm(false);
			setEditingSeason(null);
			resetForm();
			fetchSeasons();
		} catch (err: any) {
			const errorMessage = err.response?.data?.detail || 'Failed to save payment season';
			toast.error(errorMessage);
		}
	};

	const handleEdit = (season: PaymentSeason) => {
		setEditingSeason(season);
		setFormData({
			season_pay_name: season.season_pay_name,
			from_date: season.from_date,
			end_date: season.end_date,
			amount: season.amount.toString(),
			coupon_number: season.coupon_number || '',
			status: season.status
		});
		setStatusQuery(season.status.charAt(0).toUpperCase() + season.status.slice(1));
		setShowForm(true);
	};

	const handleDelete = async (payId: string) => {
		if (!window.confirm('Are you sure you want to delete this payment season?')) {
			return;
		}

		try {
			await api.delete(`/payment-seasons/${payId}`);
			toast.success('Payment season deleted successfully');
			fetchSeasons();
		} catch (err: any) {
			toast.error('Failed to delete payment season');
		}
	};

	// Generate 8-character coupon number (mixed numbers and letters)
	const generateCouponNumber = () => {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let result = '';
		for (let i = 0; i < 8; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	};

	const handleGenerateCoupon = () => {
		setFormData({ ...formData, coupon_number: generateCouponNumber() });
	};

	// Filter status options based on query
	const filteredStatusOptions = useMemo(() => {
		return statusOptions.filter((status) => {
			if (!statusQuery.trim()) return true;
			return status.toLowerCase().includes(statusQuery.toLowerCase());
		});
	}, [statusQuery]);

	// Keyboard navigation for status autocomplete
	const handleStatusKeyDown = (e: React.KeyboardEvent) => {
		if (!showStatusDropdown || filteredStatusOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setStatusHighlightedIndex((prev) => (prev < filteredStatusOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setStatusHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (statusHighlightedIndex >= 0 && statusHighlightedIndex < filteredStatusOptions.length) {
					setFormData({ ...formData, status: filteredStatusOptions[statusHighlightedIndex] });
					setStatusQuery(filteredStatusOptions[statusHighlightedIndex].charAt(0).toUpperCase() + filteredStatusOptions[statusHighlightedIndex].slice(1));
					setShowStatusDropdown(false);
				}
				break;
			case 'Escape':
				setShowStatusDropdown(false);
				setStatusHighlightedIndex(-1);
				break;
		}
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (statusDropdownRef.current && !statusDropdownRef.current.contains(target) && !statusInputRef.current?.contains(target)) {
				setShowStatusDropdown(false);
				setStatusHighlightedIndex(-1);
			}
		};

		if (showStatusDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showStatusDropdown]);

	// Update status query when formData.status changes
	useEffect(() => {
		if (formData.status) {
			setStatusQuery(formData.status.charAt(0).toUpperCase() + formData.status.slice(1));
		}
	}, [formData.status]);

	const resetForm = () => {
		setFormData({
			season_pay_name: '',
			from_date: '',
			end_date: '',
			amount: '',
			coupon_number: '',
			status: 'active'
		});
		setStatusQuery('Active');
		setEditingSeason(null);
	};

	const filteredSeasons = useMemo(() => {
		if (!searchQuery) return seasons;
		const query = searchQuery.toLowerCase();
		return seasons.filter(season =>
			season.season_pay_name.toLowerCase().includes(query) ||
			season.coupon_number?.toLowerCase().includes(query) ||
			season.status.toLowerCase().includes(query)
		);
	}, [seasons, searchQuery]);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-gray-500">Loading payment seasons...</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Payment Seasons</h1>
					<p className="text-gray-600 mt-1">Manage payment collection seasons</p>
				</div>
				<button
					onClick={() => {
						resetForm();
						setShowForm(true);
					}}
					className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-[3px] hover:bg-indigo-700 transition"
				>
					<PlusIcon className="w-5 h-5" />
					<span>Add Season</span>
				</button>
			</div>

			{/* Search */}
			<div className="bg-white rounded-[3px] shadow-card border border-gray-100 p-4">
				<div className="relative">
					<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
					<input
						type="text"
						placeholder="Search by name, coupon number, or status..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					/>
				</div>
			</div>

			{/* Form Modal */}
			{showForm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-[3px] shadow-xl w-full max-w-md mx-4">
						<div className="p-6 border-b border-gray-200">
							<h2 className="text-xl font-semibold">
								{editingSeason ? 'Edit Payment Season' : 'Create Payment Season'}
							</h2>
						</div>
						<form onSubmit={handleSubmit} className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Season Name *
								</label>
								<input
									type="text"
									required
									value={formData.season_pay_name}
									onChange={(e) => setFormData({ ...formData, season_pay_name: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									placeholder="e.g., First Term Payment"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										From Date *
									</label>
									<input
										type="date"
										required
										value={formData.from_date}
										onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
										className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										End Date *
									</label>
									<input
										type="date"
										required
										value={formData.end_date}
										onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
										className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Amount *
								</label>
								<input
									type="number"
									required
									step="0.01"
									min="0"
									value={formData.amount}
									onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									placeholder="0.00"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Coupon Number
								</label>
								<div className="flex gap-2">
									<input
										type="text"
										value={formData.coupon_number}
										onChange={(e) => setFormData({ ...formData, coupon_number: e.target.value })}
										className="flex-1 px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										placeholder="Optional"
										maxLength={8}
									/>
									<button
										type="button"
										onClick={handleGenerateCoupon}
										className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-[3px] hover:bg-indigo-200 transition flex items-center gap-2"
										title="Generate coupon number"
									>
										<SparklesIcon className="w-5 h-5" />
										<span className="text-sm">Generate</span>
									</button>
								</div>
							</div>

							<div className="relative" ref={statusDropdownRef}>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Status *
								</label>
								<input
									ref={statusInputRef}
									type="text"
									required
									value={statusQuery}
									onChange={(e) => {
										setStatusQuery(e.target.value);
										setShowStatusDropdown(true);
										setStatusHighlightedIndex(-1);
									}}
									onFocus={() => setShowStatusDropdown(true)}
									onKeyDown={handleStatusKeyDown}
									className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									placeholder="Type to search..."
								/>
								{showStatusDropdown && filteredStatusOptions.length > 0 && (
									<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto">
										{filteredStatusOptions.map((status, index) => (
											<div
												key={status}
												onClick={() => {
													setFormData({ ...formData, status });
													setStatusQuery(status.charAt(0).toUpperCase() + status.slice(1));
													setShowStatusDropdown(false);
													setStatusHighlightedIndex(-1);
												}}
												className={`px-4 py-2 cursor-pointer hover:bg-indigo-50 ${
													index === statusHighlightedIndex ? 'bg-indigo-50' : ''
												} ${
													formData.status === status ? 'bg-indigo-100 font-medium' : ''
												}`}
											>
												{status.charAt(0).toUpperCase() + status.slice(1)}
											</div>
										))}
									</div>
								)}
							</div>

							<div className="flex gap-3 pt-4">
								<button
									type="submit"
									className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-[3px] hover:bg-indigo-700 transition"
								>
									{editingSeason ? 'Update' : 'Create'}
								</button>
								<button
									type="button"
									onClick={() => {
										setShowForm(false);
										resetForm();
									}}
									className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-[3px] hover:bg-gray-300 transition"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="bg-white rounded-[3px] shadow-card border border-gray-100 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Season Name
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									From Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									End Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Amount
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Coupon Number
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{filteredSeasons.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-6 py-12 text-center">
										<CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
										<p className="text-gray-500 text-sm">No payment seasons found</p>
									</td>
								</tr>
							) : (
								filteredSeasons.map((season) => (
									<tr key={season.pay_id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{season.season_pay_name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{new Date(season.from_date).toLocaleDateString()}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{new Date(season.end_date).toLocaleDateString()}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{season.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{season.coupon_number || '-'}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`px-2 py-1 text-xs font-medium rounded-full ${
												season.status === 'active' ? 'bg-green-100 text-green-800' :
												season.status === 'completed' ? 'bg-blue-100 text-blue-800' :
												'bg-gray-100 text-gray-800'
											}`}>
												{season.status}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<div className="flex items-center gap-2">
												<button
													onClick={() => handleEdit(season)}
													className="text-indigo-600 hover:text-indigo-900"
													title="Edit"
												>
													<PencilIcon className="w-5 h-5" />
												</button>
												<button
													onClick={() => handleDelete(season.pay_id)}
													className="text-red-600 hover:text-red-900"
													title="Delete"
												>
													<TrashIcon className="w-5 h-5" />
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}


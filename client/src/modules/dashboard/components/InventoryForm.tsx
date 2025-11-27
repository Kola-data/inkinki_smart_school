import { useState, useEffect, useRef } from 'react';

interface InventoryItem {
	inv_id?: string;
	school_id: string;
	inv_name: string;
	inv_service: string | null;
	inv_desc: string | null;
	inv_date: string | null;
	inv_price: number | null;
	inv_status: string | null;
}

interface InventoryFormProps {
	inventory?: InventoryItem | null;
	onSubmit: (data: Partial<InventoryItem>) => void;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
	schoolId: string;
}

export default function InventoryForm({
	inventory,
	onSubmit,
	onCancel,
	loading = false,
	mode,
	schoolId,
}: InventoryFormProps) {
	const [formData, setFormData] = useState<Partial<InventoryItem>>({
		school_id: schoolId,
		inv_name: '',
		inv_service: '',
		inv_desc: '',
		inv_date: '',
		inv_price: '',
		inv_status: '',
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	// Autocomplete states for status
	const [statusSearchQuery, setStatusSearchQuery] = useState('');
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const [statusHighlightedIndex, setStatusHighlightedIndex] = useState(-1);
	const statusDropdownRef = useRef<HTMLDivElement>(null);
	const statusInputRef = useRef<HTMLInputElement>(null);

	const statusOptions = ['Available', 'In Use', 'Maintenance', 'Disposed', 'Reserved'];

	useEffect(() => {
		if (inventory && mode === 'edit') {
			setFormData({
				school_id: schoolId,
				inv_name: inventory.inv_name || '',
				inv_service: inventory.inv_service || '',
				inv_desc: inventory.inv_desc || '',
				inv_date: inventory.inv_date ? inventory.inv_date.split('T')[0] : '',
				inv_price: inventory.inv_price || '',
				inv_status: inventory.inv_status || '',
			});
			setStatusSearchQuery(inventory.inv_status || '');
			setErrors({});
		}
		if (mode === 'create') {
			setFormData({
				school_id: schoolId,
				inv_name: '',
				inv_service: '',
				inv_desc: '',
				inv_date: '',
				inv_price: '',
				inv_status: '',
			});
			setStatusSearchQuery('');
			setErrors({});
		}
	}, [inventory, mode, schoolId]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				statusDropdownRef.current &&
				!statusDropdownRef.current.contains(event.target as Node) &&
				statusInputRef.current &&
				!statusInputRef.current.contains(event.target as Node)
			) {
				setShowStatusDropdown(false);
			}
		};

		if (showStatusDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showStatusDropdown]);

	// Filter status options
	const filteredStatusOptions = statusOptions.filter((status) => {
		if (!statusSearchQuery.trim()) return true;
		return status.toLowerCase().includes(statusSearchQuery.toLowerCase());
	});

	// Handle keyboard navigation
	const handleStatusKeyDown = (e: React.KeyboardEvent) => {
		const filtered = filteredStatusOptions;
		const highlightedIndex = statusHighlightedIndex;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setStatusHighlightedIndex(Math.min(highlightedIndex + 1, filtered.length - 1));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setStatusHighlightedIndex(Math.max(highlightedIndex - 1, -1));
		} else if (e.key === 'Enter' && highlightedIndex >= 0 && filtered[highlightedIndex]) {
			e.preventDefault();
			handleChange('inv_status', filtered[highlightedIndex]);
			setStatusSearchQuery(filtered[highlightedIndex]);
			setShowStatusDropdown(false);
		} else if (e.key === 'Escape') {
			setShowStatusDropdown(false);
		}
	};

	const handleChange = (field: keyof InventoryItem, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	const validate = () => {
		const newErrors: Record<string, string> = {};

		if (!formData.inv_name?.trim()) {
			newErrors.inv_name = 'Item name is required';
		}

		if (formData.inv_price !== null && formData.inv_price !== '' && formData.inv_price < 0) {
			newErrors.inv_price = 'Price must be a positive number';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!validate()) {
			return;
		}

		const submitData: Partial<InventoryItem> = {
			school_id: schoolId,
			inv_name: formData.inv_name || '',
			inv_service: formData.inv_service || null,
			inv_desc: formData.inv_desc || null,
			inv_date: formData.inv_date || null,
			inv_price: formData.inv_price ? Number(formData.inv_price) : null,
			inv_status: formData.inv_status || null,
		};

		onSubmit(submitData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Item Name */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Item Name <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					value={formData.inv_name || ''}
					onChange={(e) => handleChange('inv_name', e.target.value)}
					className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
						errors.inv_name ? 'border-red-500' : 'border-gray-300'
					}`}
					placeholder="Enter item name"
					disabled={loading}
				/>
				{errors.inv_name && <p className="mt-1 text-sm text-red-600">{errors.inv_name}</p>}
			</div>

			{/* Service */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
				<input
					type="text"
					value={formData.inv_service || ''}
					onChange={(e) => handleChange('inv_service', e.target.value)}
					className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
					placeholder="Enter service type"
					disabled={loading}
				/>
			</div>

			{/* Description */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
				<textarea
					value={formData.inv_desc || ''}
					onChange={(e) => handleChange('inv_desc', e.target.value)}
					rows={3}
					className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
					placeholder="Enter item description"
					disabled={loading}
				/>
			</div>

			{/* Date */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
				<input
					type="date"
					value={formData.inv_date || ''}
					onChange={(e) => handleChange('inv_date', e.target.value)}
					className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
					disabled={loading}
				/>
			</div>

			{/* Price */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
				<input
					type="number"
					step="0.01"
					min="0"
					value={formData.inv_price || ''}
					onChange={(e) => handleChange('inv_price', e.target.value ? parseFloat(e.target.value) : '')}
					className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
						errors.inv_price ? 'border-red-500' : 'border-gray-300'
					}`}
					placeholder="0.00"
					disabled={loading}
				/>
				{errors.inv_price && <p className="mt-1 text-sm text-red-600">{errors.inv_price}</p>}
			</div>

			{/* Status */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
				<div className="relative">
					<input
						ref={statusInputRef}
						type="text"
						value={formData.inv_status || statusSearchQuery}
						onChange={(e) => {
							setStatusSearchQuery(e.target.value);
							setShowStatusDropdown(true);
							setStatusHighlightedIndex(-1);
							if (!e.target.value.trim()) {
								setShowStatusDropdown(false);
								handleChange('inv_status', '');
							}
						}}
						onFocus={() => {
							if (filteredStatusOptions.length > 0) {
								setShowStatusDropdown(true);
							}
						}}
						onKeyDown={handleStatusKeyDown}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
						placeholder="Select status"
						disabled={loading}
					/>
					{showStatusDropdown && filteredStatusOptions.length > 0 && (
						<div
							ref={statusDropdownRef}
							className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
						>
							{filteredStatusOptions.map((status, index) => (
								<button
									key={status}
									type="button"
									onClick={() => {
										handleChange('inv_status', status);
										setStatusSearchQuery(status);
										setShowStatusDropdown(false);
									}}
									onMouseEnter={() => setStatusHighlightedIndex(index)}
									className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
										index === statusHighlightedIndex ? 'bg-primary-50' : ''
									} ${formData.inv_status === status ? 'bg-primary-100 font-medium' : ''}`}
								>
									<div className="text-sm font-medium text-gray-900">{status}</div>
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Form Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					disabled={loading}
					className="px-4 py-2.5 border border-gray-300 rounded-[3px] text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-4 py-2.5 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
				</button>
			</div>
		</form>
	);
}


import { useState, useEffect, useRef } from 'react';

interface FeeTypeMember {
	fee_type_id?: string;
	school_id: string;
	fee_type_name: string;
	description?: string | null;
	amount_to_pay: number;
	is_active: string;
}

interface FeeTypeFormProps {
	feeType?: FeeTypeMember | null;
	onSubmit: (data: Partial<FeeTypeMember>) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
	schoolId: string;
}

export default function FeeTypeForm({ feeType, onSubmit, onCancel, loading = false, mode, schoolId }: FeeTypeFormProps) {
	const [formData, setFormData] = useState<Partial<FeeTypeMember>>({
		fee_type_name: '',
		description: '',
		amount_to_pay: 0,
		is_active: 'true',
		school_id: schoolId,
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	// Autocomplete states for is_active
	const [isActiveSearchQuery, setIsActiveSearchQuery] = useState('');
	const [showIsActiveDropdown, setShowIsActiveDropdown] = useState(false);
	const [isActiveHighlightedIndex, setIsActiveHighlightedIndex] = useState(-1);
	const isActiveDropdownRef = useRef<HTMLDivElement>(null);
	const isActiveInputRef = useRef<HTMLInputElement>(null);

	const isActiveOptions = ['true', 'false'];

	const filteredIsActiveOptions = isActiveOptions.filter((option) => {
		if (!isActiveSearchQuery.trim()) return true;
		return option.toLowerCase().includes(isActiveSearchQuery.toLowerCase());
	});

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				isActiveDropdownRef.current &&
				!isActiveDropdownRef.current.contains(event.target as Node) &&
				isActiveInputRef.current &&
				!isActiveInputRef.current.contains(event.target as Node)
			) {
				setShowIsActiveDropdown(false);
			}
		};

		if (showIsActiveDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showIsActiveDropdown]);

	useEffect(() => {
		if (feeType && mode === 'edit') {
			setFormData({
				fee_type_name: feeType.fee_type_name || '',
				description: feeType.description || '',
				amount_to_pay: feeType.amount_to_pay || 0,
				is_active: feeType.is_active || 'true',
				school_id: schoolId,
			});
			setErrors({});
			setIsActiveSearchQuery(feeType.is_active === 'true' ? 'Active' : 'Inactive');
		}
		if (mode === 'create') {
			setFormData({
				fee_type_name: '',
				description: '',
				amount_to_pay: 0,
				is_active: 'true',
				school_id: schoolId,
			});
			setErrors({});
			setIsActiveSearchQuery('Active');
		}
	}, [feeType, mode, schoolId]);

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.fee_type_name?.trim()) {
			newErrors.fee_type_name = 'Fee type name is required';
		}

		if (formData.amount_to_pay === undefined || formData.amount_to_pay === null) {
			newErrors.amount_to_pay = 'Amount to pay is required';
		} else if (formData.amount_to_pay < 0) {
			newErrors.amount_to_pay = 'Amount must be 0 or greater';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (validate()) {
			const submitData: any = { ...formData };
			// Convert empty string to null for description
			if (submitData.description === '') {
				submitData.description = null;
			}
			// Ensure amount_to_pay is a number
			if (typeof submitData.amount_to_pay === 'string') {
				submitData.amount_to_pay = parseFloat(submitData.amount_to_pay) || 0;
			}
			await onSubmit(submitData);
		}
	};

	const handleChange = (field: keyof FeeTypeMember, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	const handleIsActiveKeyDown = (e: React.KeyboardEvent) => {
		if (!showIsActiveDropdown || filteredIsActiveOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setIsActiveHighlightedIndex((prev) => (prev < filteredIsActiveOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setIsActiveHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (isActiveHighlightedIndex >= 0 && isActiveHighlightedIndex < filteredIsActiveOptions.length) {
					const selectedOption = filteredIsActiveOptions[isActiveHighlightedIndex];
					handleChange('is_active', selectedOption);
					setIsActiveSearchQuery(selectedOption === 'true' ? 'Active' : 'Inactive');
					setShowIsActiveDropdown(false);
				} else if (isActiveHighlightedIndex === -1 && filteredIsActiveOptions.length === 1) {
					const selectedOption = filteredIsActiveOptions[0];
					handleChange('is_active', selectedOption);
					setIsActiveSearchQuery(selectedOption === 'true' ? 'Active' : 'Inactive');
					setShowIsActiveDropdown(false);
				}
				break;
			case 'Escape':
				setShowIsActiveDropdown(false);
				setIsActiveHighlightedIndex(-1);
				break;
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Fee Type Name */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Fee Type Name <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					value={formData.fee_type_name || ''}
					onChange={(e) => handleChange('fee_type_name', e.target.value)}
					className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
						errors.fee_type_name ? 'border-red-500' : 'border-gray-300'
					}`}
					placeholder="e.g., Tuition Fee, Registration Fee, Library Fee"
				/>
				{errors.fee_type_name && (
					<p className="mt-1 text-sm text-red-600">{errors.fee_type_name}</p>
				)}
			</div>

			{/* Amount to Pay */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Amount to Pay <span className="text-red-500">*</span>
				</label>
				<input
					type="number"
					step="0.01"
					min="0"
					value={formData.amount_to_pay || ''}
					onChange={(e) => handleChange('amount_to_pay', parseFloat(e.target.value) || 0)}
					className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
						errors.amount_to_pay ? 'border-red-500' : 'border-gray-300'
					}`}
					placeholder="0.00"
				/>
				{errors.amount_to_pay && (
					<p className="mt-1 text-sm text-red-600">{errors.amount_to_pay}</p>
				)}
			</div>

			{/* Is Active */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Status <span className="text-red-500">*</span>
				</label>
				<div className="relative">
					<input
						ref={isActiveInputRef}
						type="text"
						value={isActiveSearchQuery}
											onChange={(e) => {
												const value = e.target.value;
												setIsActiveSearchQuery(value);
												setShowIsActiveDropdown(true);
												setIsActiveHighlightedIndex(-1);
												// Convert user input to actual value
												if (value.toLowerCase().includes('active') || value.toLowerCase().includes('true')) {
													handleChange('is_active', 'true');
												} else if (value.toLowerCase().includes('inactive') || value.toLowerCase().includes('false')) {
													handleChange('is_active', 'false');
												}
												if (!value.trim()) {
													setShowIsActiveDropdown(false);
													handleChange('is_active', 'true');
													setIsActiveSearchQuery('Active');
												}
											}}
						onFocus={() => {
							if (filteredIsActiveOptions.length > 0) {
								setShowIsActiveDropdown(true);
							}
						}}
						onKeyDown={handleIsActiveKeyDown}
						className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
							errors.is_active ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Select status"
					/>
					{showIsActiveDropdown && filteredIsActiveOptions.length > 0 && (
						<div
							ref={isActiveDropdownRef}
							className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
						>
							{filteredIsActiveOptions.map((option, index) => (
								<button
									key={option}
									type="button"
									onClick={() => {
										handleChange('is_active', option);
										setIsActiveSearchQuery(option === 'true' ? 'Active' : 'Inactive');
										setShowIsActiveDropdown(false);
									}}
									onMouseEnter={() => setIsActiveHighlightedIndex(index)}
									className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
										index === isActiveHighlightedIndex ? 'bg-primary-50' : ''
									} ${formData.is_active === option ? 'bg-primary-100 font-medium' : ''}`}
								>
									<div className="text-sm font-medium text-gray-900">
										{option === 'true' ? 'Active' : 'Inactive'}
									</div>
								</button>
							))}
						</div>
					)}
				</div>
				{errors.is_active && (
					<p className="mt-1 text-sm text-red-600">{errors.is_active}</p>
				)}
			</div>

			{/* Description */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Description
				</label>
				<textarea
					value={formData.description || ''}
					onChange={(e) => handleChange('description', e.target.value)}
					rows={4}
					className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500"
					placeholder="Enter fee type description (optional)"
				/>
			</div>

			{/* Form Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					disabled={loading}
					className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-[3px] hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{loading ? 'Saving...' : mode === 'create' ? 'Create Fee Type' : 'Update Fee Type'}
				</button>
			</div>
		</form>
	);
}


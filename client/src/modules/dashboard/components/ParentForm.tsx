import { useState, useEffect, useRef } from 'react';

interface ParentMember {
	par_id?: string;
	mother_name: string | null;
	father_name: string | null;
	mother_phone: string | null;
	father_phone: string | null;
	mother_email: string | null;
	father_email: string | null;
	par_address: string | null;
	par_type: string | null;
	school_id?: string;
}

interface ParentFormProps {
	parent?: ParentMember | null;
	onSubmit: (data: Partial<ParentMember>) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
	schoolId: string;
}

export default function ParentForm({ parent, onSubmit, onCancel, loading = false, mode, schoolId }: ParentFormProps) {
	const [formData, setFormData] = useState<Partial<ParentMember>>({
		mother_name: '',
		father_name: '',
		mother_phone: '',
		father_phone: '',
		mother_email: '',
		father_email: '',
		par_address: '',
		par_type: '',
		school_id: schoolId,
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	// Autocomplete state for parent type
	const [typeSearchQuery, setTypeSearchQuery] = useState('');
	const [showTypeDropdown, setShowTypeDropdown] = useState(false);
	const [typeHighlightedIndex, setTypeHighlightedIndex] = useState(-1);
	const typeDropdownRef = useRef<HTMLDivElement>(null);
	const typeInputRef = useRef<HTMLInputElement>(null);

	const parentTypes = ['Guardian', 'Parent', 'Relative', 'Other'];

	const filteredTypeOptions = parentTypes.filter((type) => {
		if (!typeSearchQuery.trim()) return true;
		return type.toLowerCase().includes(typeSearchQuery.toLowerCase());
	});

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				typeDropdownRef.current &&
				!typeDropdownRef.current.contains(event.target as Node) &&
				typeInputRef.current &&
				!typeInputRef.current.contains(event.target as Node)
			) {
				setShowTypeDropdown(false);
			}
		};

		if (showTypeDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showTypeDropdown]);

	useEffect(() => {
		if (parent && mode === 'edit') {
			setFormData({
				mother_name: parent.mother_name || '',
				father_name: parent.father_name || '',
				mother_phone: parent.mother_phone || '',
				father_phone: parent.father_phone || '',
				mother_email: parent.mother_email || '',
				father_email: parent.father_email || '',
				par_address: parent.par_address || '',
				par_type: parent.par_type || '',
				school_id: schoolId,
			});
			setTypeSearchQuery(parent.par_type || '');
			setErrors({});
		}
		if (mode === 'create') {
			setFormData({
				mother_name: '',
				father_name: '',
				mother_phone: '',
				father_phone: '',
				mother_email: '',
				father_email: '',
				par_address: '',
				par_type: '',
				school_id: schoolId,
			});
			setTypeSearchQuery('');
			setErrors({});
		}
	}, [parent, mode, schoolId]);

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		// At least one parent name should be provided
		if (!formData.mother_name?.trim() && !formData.father_name?.trim()) {
			newErrors.parent_name = 'At least one parent name (mother or father) is required';
		}

		// Email validation if provided
		if (formData.mother_email && formData.mother_email.trim()) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(formData.mother_email)) {
				newErrors.mother_email = 'Please enter a valid email address';
			}
		}

		if (formData.father_email && formData.father_email.trim()) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(formData.father_email)) {
				newErrors.father_email = 'Please enter a valid email address';
			}
		}

		// Phone validation if provided (basic - should contain only digits and optional +)
		if (formData.mother_phone && formData.mother_phone.trim()) {
			const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,20}$/;
			if (!phoneRegex.test(formData.mother_phone)) {
				newErrors.mother_phone = 'Please enter a valid phone number';
			}
		}

		if (formData.father_phone && formData.father_phone.trim()) {
			const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,20}$/;
			if (!phoneRegex.test(formData.father_phone)) {
				newErrors.father_phone = 'Please enter a valid phone number';
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (validate()) {
			// Clean up empty strings to null
			const cleanedData = {
				...formData,
				mother_name: formData.mother_name?.trim() || null,
				father_name: formData.father_name?.trim() || null,
				mother_phone: formData.mother_phone?.trim() || null,
				father_phone: formData.father_phone?.trim() || null,
				mother_email: formData.mother_email?.trim() || null,
				father_email: formData.father_email?.trim() || null,
				par_address: formData.par_address?.trim() || null,
				par_type: formData.par_type?.trim() || null,
			};
			await onSubmit(cleanedData);
		}
	};

	const handleChange = (field: keyof ParentMember, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field] || errors.parent_name) {
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[field];
				delete newErrors.parent_name;
				return newErrors;
			});
		}
	};

	const handleTypeKeyDown = (e: React.KeyboardEvent) => {
		if (!showTypeDropdown || filteredTypeOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setTypeHighlightedIndex((prev) => (prev < filteredTypeOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setTypeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (typeHighlightedIndex >= 0 && typeHighlightedIndex < filteredTypeOptions.length) {
					const selectedType = filteredTypeOptions[typeHighlightedIndex];
					handleChange('par_type', selectedType);
					setTypeSearchQuery(selectedType);
					setShowTypeDropdown(false);
				} else if (typeHighlightedIndex === -1 && filteredTypeOptions.length === 1) {
					const selectedType = filteredTypeOptions[0];
					handleChange('par_type', selectedType);
					setTypeSearchQuery(selectedType);
					setShowTypeDropdown(false);
				}
				break;
			case 'Escape':
				setShowTypeDropdown(false);
				setTypeHighlightedIndex(-1);
				break;
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Mother Name */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Mother Name
					</label>
					<input
						type="text"
						value={formData.mother_name || ''}
						onChange={(e) => handleChange('mother_name', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.parent_name ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter mother's name"
					/>
				</div>

				{/* Father Name */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Father Name
					</label>
					<input
						type="text"
						value={formData.father_name || ''}
						onChange={(e) => handleChange('father_name', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.parent_name ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter father's name"
					/>
				</div>

				{/* Mother Phone */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Mother Phone
					</label>
					<input
						type="text"
						value={formData.mother_phone || ''}
						onChange={(e) => handleChange('mother_phone', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.mother_phone ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter mother's phone number"
					/>
					{errors.mother_phone && (
						<p className="mt-1 text-sm text-red-600">{errors.mother_phone}</p>
					)}
				</div>

				{/* Father Phone */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Father Phone
					</label>
					<input
						type="text"
						value={formData.father_phone || ''}
						onChange={(e) => handleChange('father_phone', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.father_phone ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter father's phone number"
					/>
					{errors.father_phone && (
						<p className="mt-1 text-sm text-red-600">{errors.father_phone}</p>
					)}
				</div>

				{/* Mother Email */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Mother Email
					</label>
					<input
						type="email"
						value={formData.mother_email || ''}
						onChange={(e) => handleChange('mother_email', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.mother_email ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter mother's email address"
					/>
					{errors.mother_email && (
						<p className="mt-1 text-sm text-red-600">{errors.mother_email}</p>
					)}
				</div>

				{/* Father Email */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Father Email
					</label>
					<input
						type="email"
						value={formData.father_email || ''}
						onChange={(e) => handleChange('father_email', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.father_email ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter father's email address"
					/>
					{errors.father_email && (
						<p className="mt-1 text-sm text-red-600">{errors.father_email}</p>
					)}
				</div>

				{/* Parent Type */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Parent Type
					</label>
					<div className="relative">
						<input
							ref={typeInputRef}
							type="text"
							value={formData.par_type || typeSearchQuery}
							onChange={(e) => {
								setTypeSearchQuery(e.target.value);
								setShowTypeDropdown(true);
								setTypeHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowTypeDropdown(false);
									handleChange('par_type', '');
								}
							}}
							onFocus={() => {
								if (filteredTypeOptions.length > 0) {
									setShowTypeDropdown(true);
								}
							}}
							onKeyDown={handleTypeKeyDown}
							placeholder="Select parent type"
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
						/>
						{showTypeDropdown && filteredTypeOptions.length > 0 && (
							<div
								ref={typeDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredTypeOptions.map((type, index) => (
									<button
										key={type}
										type="button"
										onClick={() => {
											handleChange('par_type', type);
											setTypeSearchQuery(type);
											setShowTypeDropdown(false);
										}}
										onMouseEnter={() => setTypeHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === typeHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.par_type === type ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{type}</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{errors.parent_name && (
				<p className="text-sm text-red-600">{errors.parent_name}</p>
			)}

			{/* Address - Full Width */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Address
				</label>
				<textarea
					value={formData.par_address || ''}
					onChange={(e) => handleChange('par_address', e.target.value)}
					rows={3}
					className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
					placeholder="Enter parent's address"
				/>
			</div>

			{/* Form Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 transition-colors"
					disabled={loading}
				>
					Cancel
				</button>
				<button
					type="submit"
					className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-[3px] hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={loading}
				>
					{loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
				</button>
			</div>
		</form>
	);
}

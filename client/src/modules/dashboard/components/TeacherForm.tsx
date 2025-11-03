import { useState, useEffect, useRef } from 'react';

interface TeacherMember {
	teacher_id?: string;
	staff_id: string;
	specialized: string | null;
	is_active: boolean;
}

interface StaffMember {
	staff_id: string;
	staff_name: string;
	email: string;
	staff_role: string | null;
}

interface TeacherFormProps {
	teacher?: TeacherMember | null;
	availableStaff: StaffMember[];
	onSubmit: (data: Partial<TeacherMember>) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
}

export default function TeacherForm({ teacher, availableStaff, onSubmit, onCancel, loading = false, mode }: TeacherFormProps) {
	const [formData, setFormData] = useState<Partial<TeacherMember>>({
		staff_id: '',
		specialized: '',
		is_active: true,
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [searchQuery, setSearchQuery] = useState('');
	const [showDropdown, setShowDropdown] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (teacher && mode === 'edit') {
			setFormData({
				staff_id: teacher.staff_id || '',
				specialized: teacher.specialized || '',
				is_active: teacher.is_active ?? true,
			});
			// Clear any errors when editing
			setErrors({});
		}
		if (mode === 'create') {
			setSearchQuery('');
			setFormData({
				staff_id: '',
				specialized: '',
				is_active: true,
			});
			setErrors({});
		}
	}, [teacher, mode]);

	// Filter staff based on search query
	const filteredStaff = availableStaff.filter((staff) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		return (
			staff.staff_name.toLowerCase().includes(query) ||
			staff.email.toLowerCase().includes(query) ||
			(staff.staff_role && staff.staff_role.toLowerCase().includes(query))
		);
	});

	// Get selected staff details
	const selectedStaff = availableStaff.find((s) => s.staff_id === formData.staff_id);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(event.target as Node)
			) {
				setShowDropdown(false);
			}
		};

		if (showDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showDropdown]);

	// Handle keyboard navigation
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!showDropdown || filteredStaff.length === 0) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setHighlightedIndex((prev) => (prev < filteredStaff.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (highlightedIndex >= 0 && highlightedIndex < filteredStaff.length) {
					handleSelectStaff(filteredStaff[highlightedIndex]);
				}
				break;
			case 'Escape':
				setShowDropdown(false);
				setHighlightedIndex(-1);
				break;
		}
	};

	// Handle staff selection
	const handleSelectStaff = (staff: StaffMember) => {
		handleChange('staff_id', staff.staff_id);
		setSearchQuery(staff.staff_name);
		setShowDropdown(false);
		setHighlightedIndex(-1);
	};

	// Update search query and show dropdown
	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		setShowDropdown(true);
		setHighlightedIndex(-1);
		if (!value.trim()) {
			setShowDropdown(false);
		}
	};

	const handleChange = (field: keyof TeacherMember, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		// Only validate staff_id in create mode (in edit mode, staff_id cannot be changed)
		if (mode === 'create' && !formData.staff_id?.trim()) {
			newErrors.staff_id = 'Staff member is required';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		const submitData: any = { ...formData };
		
		// Convert empty string to null for specialized
		if (submitData.specialized === '') {
			submitData.specialized = null;
		}

		await onSubmit(submitData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Staff Member Selection */}
				<div className="md:col-span-2">
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Staff Member {mode === 'create' && <span className="text-red-500">*</span>}
					</label>
					{mode === 'create' ? (
						<div className="relative">
							<input
								ref={inputRef}
								type="text"
								value={selectedStaff ? selectedStaff.staff_name : searchQuery}
								onChange={(e) => {
									handleSearchChange(e.target.value);
									if (!e.target.value.trim()) {
										handleChange('staff_id', '');
									}
								}}
								onFocus={() => {
									if (filteredStaff.length > 0) {
										setShowDropdown(true);
									}
								}}
								onKeyDown={handleKeyDown}
								placeholder="Search staff member by name, email, or role..."
								disabled={loading || availableStaff.length === 0}
								className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
									errors.staff_id ? 'border-red-500' : 'border-gray-300'
								} disabled:bg-gray-100 disabled:cursor-not-allowed`}
							/>
							{showDropdown && filteredStaff.length > 0 && (
								<div
									ref={dropdownRef}
									className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
								>
									{filteredStaff.map((staff, index) => (
										<button
											key={staff.staff_id}
											type="button"
											onClick={() => handleSelectStaff(staff)}
											onMouseEnter={() => setHighlightedIndex(index)}
											className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
												index === highlightedIndex ? 'bg-primary-50' : ''
											} ${formData.staff_id === staff.staff_id ? 'bg-primary-100 font-medium' : ''}`}
										>
											<div className="flex items-center justify-between">
												<div>
													<div className="text-sm font-medium text-gray-900">{staff.staff_name}</div>
													<div className="text-xs text-gray-500">{staff.email}</div>
												</div>
												{staff.staff_role && (
													<span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-xs font-medium bg-gray-100 text-gray-800 capitalize ml-2">
														{staff.staff_role.toLowerCase()}
													</span>
												)}
											</div>
										</button>
									))}
								</div>
							)}
							{showDropdown && filteredStaff.length === 0 && searchQuery.trim() && (
								<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg">
									<div className="px-4 py-2.5 text-sm text-gray-500">No staff members found</div>
								</div>
							)}
						</div>
					) : (
						<input
							type="text"
							value={teacher?.staff_name || 'N/A'}
							disabled
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] bg-gray-100 text-gray-600 cursor-not-allowed"
						/>
					)}
					{errors.staff_id && mode === 'create' && <p className="mt-1 text-sm text-red-600">{errors.staff_id}</p>}
					{mode === 'create' && availableStaff.length === 0 && (
						<p className="mt-1 text-sm text-amber-600">
							No available staff members. All staff members already have teacher records.
						</p>
					)}
				</div>

				{/* Specialization */}
				<div className="md:col-span-2">
					<label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
					<input
						type="text"
						value={formData.specialized || ''}
						onChange={(e) => handleChange('specialized', e.target.value || null)}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
						placeholder="e.g., Mathematics, English, Science"
					/>
					<p className="mt-1 text-xs text-gray-500">Subject or area of specialization (optional)</p>
				</div>

				{/* Active Status */}
				<div className="md:col-span-2">
					<label className="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							checked={formData.is_active ?? true}
							onChange={(e) => handleChange('is_active', e.target.checked)}
							className="w-4 h-4 text-primary-600 border-gray-300 rounded-[3px] focus:ring-primary-500 cursor-pointer"
						/>
						<span className="text-sm font-medium text-gray-700">Active</span>
					</label>
					<p className="mt-1 text-xs text-gray-500 ml-7">Inactive teachers cannot access the system</p>
				</div>
			</div>

			{/* Form Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					disabled={loading}
					className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-[3px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading || (mode === 'create' && availableStaff.length === 0)}
					className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-[3px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					{loading ? (
						<>
							<svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							{mode === 'create' ? 'Creating...' : 'Updating...'}
						</>
					) : (
						<span>{mode === 'create' ? 'Create Teacher' : 'Update Teacher'}</span>
					)}
				</button>
			</div>
		</form>
	);
}



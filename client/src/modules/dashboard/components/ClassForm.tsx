import { useState, useEffect, useRef } from 'react';

interface ClassMember {
	cls_id?: string;
	cls_name: string;
	cls_type: string;
	cls_manager: string;
}

interface TeacherMember {
	teacher_id: string;
	staff_name: string | null;
	email: string | null;
	specialized: string | null;
}

interface ClassFormProps {
	classItem?: ClassMember | null;
	availableTeachers: TeacherMember[];
	onSubmit: (data: Partial<ClassMember>) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
}

export default function ClassForm({ classItem, availableTeachers, onSubmit, onCancel, loading = false, mode }: ClassFormProps) {
	const [formData, setFormData] = useState<Partial<ClassMember>>({
		cls_name: '',
		cls_type: '',
		cls_manager: '',
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [searchQuery, setSearchQuery] = useState('');
	const [showDropdown, setShowDropdown] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Class type autocomplete states
	const [classTypeSearchQuery, setClassTypeSearchQuery] = useState('');
	const [showClassTypeDropdown, setShowClassTypeDropdown] = useState(false);
	const [classTypeHighlightedIndex, setClassTypeHighlightedIndex] = useState(-1);
	const classTypeDropdownRef = useRef<HTMLDivElement>(null);
	const classTypeInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (classItem && mode === 'edit') {
			setFormData({
				cls_name: classItem.cls_name || '',
				cls_type: classItem.cls_type || '',
				cls_manager: classItem.cls_manager || '',
			});
			setErrors({});
		}
		if (mode === 'create') {
			setSearchQuery('');
			setClassTypeSearchQuery('');
			setFormData({
				cls_name: '',
				cls_type: '',
				cls_manager: '',
			});
			setErrors({});
		}
	}, [classItem, mode]);

	// Filter teachers based on search query
	const filteredTeachers = availableTeachers.filter((teacher) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		return (
			(teacher.staff_name && teacher.staff_name.toLowerCase().includes(query)) ||
			(teacher.email && teacher.email.toLowerCase().includes(query)) ||
			(teacher.specialized && teacher.specialized.toLowerCase().includes(query))
		);
	});

	// Get selected teacher details
	const selectedTeacher = availableTeachers.find((t) => t.teacher_id === formData.cls_manager);

	const classTypes = ['Primary', 'Nursery', 'Secondary', 'Kindergarten', 'Pre-kindergarten', 'Elementary', 'High School', 'Middle School'];
	
	// Filter class types based on search
	const filteredClassTypes = classTypes.filter((type) => {
		if (!classTypeSearchQuery.trim()) return true;
		return type.toLowerCase().includes(classTypeSearchQuery.toLowerCase());
	});

	// Close dropdowns when clicking outside
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
			if (
				classTypeDropdownRef.current &&
				!classTypeDropdownRef.current.contains(event.target as Node) &&
				classTypeInputRef.current &&
				!classTypeInputRef.current.contains(event.target as Node)
			) {
				setShowClassTypeDropdown(false);
			}
		};

		if (showDropdown || showClassTypeDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showDropdown, showClassTypeDropdown]);

	// Handle keyboard navigation for teacher
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!showDropdown || filteredTeachers.length === 0) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setHighlightedIndex((prev) => (prev < filteredTeachers.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (highlightedIndex >= 0 && highlightedIndex < filteredTeachers.length) {
					handleSelectTeacher(filteredTeachers[highlightedIndex]);
				}
				break;
			case 'Escape':
				setShowDropdown(false);
				setHighlightedIndex(-1);
				break;
		}
	};

	// Handle keyboard navigation for class type
	const handleClassTypeKeyDown = (e: React.KeyboardEvent) => {
		if (!showClassTypeDropdown || filteredClassTypes.length === 0) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setClassTypeHighlightedIndex((prev) => (prev < filteredClassTypes.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setClassTypeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (classTypeHighlightedIndex >= 0 && classTypeHighlightedIndex < filteredClassTypes.length) {
					handleSelectClassType(filteredClassTypes[classTypeHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowClassTypeDropdown(false);
				setClassTypeHighlightedIndex(-1);
				break;
		}
	};

	// Handle teacher selection
	const handleSelectTeacher = (teacher: TeacherMember) => {
		handleChange('cls_manager', teacher.teacher_id);
		setSearchQuery(teacher.staff_name || teacher.email || '');
		setShowDropdown(false);
		setHighlightedIndex(-1);
	};

	// Update search query and show dropdown for teacher
	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		setShowDropdown(true);
		setHighlightedIndex(-1);
		if (!value.trim()) {
			setShowDropdown(false);
		}
	};

	// Handle class type selection
	const handleSelectClassType = (type: string) => {
		handleChange('cls_type', type);
		setClassTypeSearchQuery(type);
		setShowClassTypeDropdown(false);
		setClassTypeHighlightedIndex(-1);
	};

	const handleChange = (field: keyof ClassMember, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.cls_name?.trim()) {
			newErrors.cls_name = 'Class name is required';
		}

		if (!formData.cls_type?.trim()) {
			newErrors.cls_type = 'Class type is required';
		}

		if (mode === 'create' && !formData.cls_manager?.trim()) {
			newErrors.cls_manager = 'Class manager (teacher) is required';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		await onSubmit(formData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Class Name */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Class Name <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					value={formData.cls_name || ''}
					onChange={(e) => handleChange('cls_name', e.target.value)}
					className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
						errors.cls_name ? 'border-red-500' : 'border-gray-300'
					}`}
					placeholder="e.g., Grade 1, Form 3, Standard 5"
				/>
				{errors.cls_name && (
					<p className="mt-1 text-sm text-red-600">{errors.cls_name}</p>
				)}
			</div>

			{/* Class Type */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Class Type <span className="text-red-500">*</span>
				</label>
				<div className="relative">
					<input
						ref={classTypeInputRef}
						type="text"
						value={formData.cls_type || classTypeSearchQuery}
						onChange={(e) => {
							setClassTypeSearchQuery(e.target.value);
							setShowClassTypeDropdown(true);
							setClassTypeHighlightedIndex(-1);
							if (!e.target.value.trim()) {
								setShowClassTypeDropdown(false);
								handleChange('cls_type', '');
							}
						}}
						onFocus={() => {
							if (filteredClassTypes.length > 0) {
								setShowClassTypeDropdown(true);
							}
						}}
						onKeyDown={handleClassTypeKeyDown}
						placeholder="Search class type..."
						disabled={loading}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.cls_type ? 'border-red-500' : 'border-gray-300'
						} disabled:bg-gray-100 disabled:cursor-not-allowed`}
					/>
					{showClassTypeDropdown && filteredClassTypes.length > 0 && (
						<div
							ref={classTypeDropdownRef}
							className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
						>
							{filteredClassTypes.map((type, index) => (
								<button
									key={type}
									type="button"
									onClick={() => handleSelectClassType(type)}
									onMouseEnter={() => setClassTypeHighlightedIndex(index)}
									className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
										index === classTypeHighlightedIndex ? 'bg-primary-50' : ''
									} ${formData.cls_type === type ? 'bg-primary-100 font-medium' : ''}`}
								>
									<div className="text-sm font-medium text-gray-900">{type}</div>
								</button>
							))}
						</div>
					)}
					{showClassTypeDropdown && filteredClassTypes.length === 0 && classTypeSearchQuery.trim() && (
						<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg">
							<div className="px-4 py-2.5 text-sm text-gray-500">No class types found</div>
						</div>
					)}
				</div>
				{errors.cls_type && (
					<p className="mt-1 text-sm text-red-600">{errors.cls_type}</p>
				)}
			</div>

			{/* Class Manager (Teacher) */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Class Manager (Teacher) {mode === 'create' && <span className="text-red-500">*</span>}
				</label>
				{mode === 'create' ? (
					<div className="relative">
						<input
							ref={inputRef}
							type="text"
							value={selectedTeacher ? (selectedTeacher.staff_name || selectedTeacher.email || '') : searchQuery}
							onChange={(e) => {
								handleSearchChange(e.target.value);
								if (!e.target.value.trim()) {
									handleChange('cls_manager', '');
								}
							}}
							onFocus={() => {
								if (filteredTeachers.length > 0) {
									setShowDropdown(true);
								}
							}}
							onKeyDown={handleKeyDown}
							placeholder="Search teacher by name, email, or specialization..."
							disabled={loading || availableTeachers.length === 0}
							className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
								errors.cls_manager ? 'border-red-500' : 'border-gray-300'
							} disabled:bg-gray-100 disabled:cursor-not-allowed`}
						/>
						{showDropdown && filteredTeachers.length > 0 && (
							<div
								ref={dropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredTeachers.map((teacher, index) => (
									<button
										key={teacher.teacher_id}
										type="button"
										onClick={() => handleSelectTeacher(teacher)}
										onMouseEnter={() => setHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === highlightedIndex ? 'bg-primary-50' : ''
										} ${formData.cls_manager === teacher.teacher_id ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="flex items-center justify-between">
											<div>
												<div className="text-sm font-medium text-gray-900">{teacher.staff_name || 'N/A'}</div>
												<div className="text-xs text-gray-500">{teacher.email || 'N/A'}</div>
											</div>
											{teacher.specialized && (
												<span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-xs font-medium bg-blue-100 text-blue-800 ml-2">
													{teacher.specialized}
												</span>
											)}
										</div>
									</button>
								))}
							</div>
						)}
						{showDropdown && filteredTeachers.length === 0 && searchQuery.trim() && (
							<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg">
								<div className="px-4 py-2.5 text-sm text-gray-500">No teachers found</div>
							</div>
						)}
					</div>
				) : (
					<input
						type="text"
						value={selectedTeacher ? (selectedTeacher.staff_name || selectedTeacher.email || 'N/A') : 'N/A'}
						disabled
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] bg-gray-100 text-gray-600 cursor-not-allowed"
					/>
				)}
				{errors.cls_manager && mode === 'create' && (
					<p className="mt-1 text-sm text-red-600">{errors.cls_manager}</p>
				)}
				{mode === 'create' && availableTeachers.length === 0 && (
					<p className="mt-1 text-sm text-amber-600">
						No teachers available. Please create teachers first.
					</p>
				)}
			</div>

			{/* Form Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 transition-colors"
					disabled={loading}
				>
					Cancel
				</button>
				<button
					type="submit"
					className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-[3px] hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={loading || (mode === 'create' && availableTeachers.length === 0)}
				>
					{loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
				</button>
			</div>
		</form>
	);
}


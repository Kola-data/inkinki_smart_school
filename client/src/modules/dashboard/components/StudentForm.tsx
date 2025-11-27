import { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import { getArrayFromResponse } from '../../../utils/apiHelpers';

interface StudentMember {
	std_id?: string;
	par_id: string;
	std_name: string;
	std_code?: string | null;
	std_dob?: string | null;
	std_gender?: string | null;
	previous_school?: string | null;
	started_class?: string | null;
	current_class?: string | null;
	status?: string | null;
	school_id?: string;
}

interface ParentOption {
	par_id: string;
	mother_name: string | null;
	father_name: string | null;
	mother_phone: string | null;
	father_phone: string | null;
}

interface ClassOption {
	cls_id: string;
	cls_name: string;
	cls_type: string | null;
}

interface StudentFormProps {
	student?: StudentMember | null;
	onSubmit: (data: Partial<StudentMember>) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
	schoolId: string;
	preSelectedParentId?: string | null;
}

export default function StudentForm({ student, onSubmit, onCancel, loading = false, mode, schoolId, preSelectedParentId }: StudentFormProps) {
	const [formData, setFormData] = useState<Partial<StudentMember>>({
		par_id: preSelectedParentId || '',
		std_name: '',
		std_code: '',
		std_dob: '',
		std_gender: '',
		previous_school: '',
		started_class: '',
		current_class: '',
		status: '',
		school_id: schoolId,
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [availableParents, setAvailableParents] = useState<ParentOption[]>([]);
	const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]);

	// Autocomplete states for parent selection
	const [parentSearchQuery, setParentSearchQuery] = useState('');
	const [showParentDropdown, setShowParentDropdown] = useState(false);
	const [parentHighlightedIndex, setParentHighlightedIndex] = useState(-1);
	const parentDropdownRef = useRef<HTMLDivElement>(null);
	const parentInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for gender
	const [genderSearchQuery, setGenderSearchQuery] = useState('');
	const [showGenderDropdown, setShowGenderDropdown] = useState(false);
	const [genderHighlightedIndex, setGenderHighlightedIndex] = useState(-1);
	const genderDropdownRef = useRef<HTMLDivElement>(null);
	const genderInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for started class
	const [startedClassSearchQuery, setStartedClassSearchQuery] = useState('');
	const [showStartedClassDropdown, setShowStartedClassDropdown] = useState(false);
	const [startedClassHighlightedIndex, setStartedClassHighlightedIndex] = useState(-1);
	const startedClassDropdownRef = useRef<HTMLDivElement>(null);
	const startedClassInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for current class
	const [currentClassSearchQuery, setCurrentClassSearchQuery] = useState('');
	const [showCurrentClassDropdown, setShowCurrentClassDropdown] = useState(false);
	const [currentClassHighlightedIndex, setCurrentClassHighlightedIndex] = useState(-1);
	const currentClassDropdownRef = useRef<HTMLDivElement>(null);
	const currentClassInputRef = useRef<HTMLInputElement>(null);

	// Autocomplete states for status
	const [statusSearchQuery, setStatusSearchQuery] = useState('');
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const [statusHighlightedIndex, setStatusHighlightedIndex] = useState(-1);
	const statusDropdownRef = useRef<HTMLDivElement>(null);
	const statusInputRef = useRef<HTMLInputElement>(null);

	const genders = ['Male', 'Female'];
	const statusOptions = ['Starting Here', 'Transferred', 'Resuming'];

	// Fetch parents and classes
	useEffect(() => {
		const fetchOptions = async () => {
			if (!schoolId) return;

			try {
				const timestamp = new Date().getTime();

				// Fetch parents
				const parentsResponse = await api.get(`/parents/?school_id=${schoolId}&_t=${timestamp}`);
				const parents: ParentOption[] = getArrayFromResponse(parentsResponse.data).map((p: any) => ({
					par_id: p.par_id,
					mother_name: p.mother_name,
					father_name: p.father_name,
					mother_phone: p.mother_phone,
					father_phone: p.father_phone,
				}));
				setAvailableParents(parents);

				// Fetch classes
				const classesResponse = await api.get(`/classes/?school_id=${schoolId}&_t=${timestamp}`);
				const classes: ClassOption[] = getArrayFromResponse(classesResponse.data).map((c: any) => ({
					cls_id: c.cls_id,
					cls_name: c.cls_name,
					cls_type: c.cls_type,
				}));
				setAvailableClasses(classes);
			} catch (error: any) {setAvailableParents([]);
				setAvailableClasses([]);
			}
		};

		fetchOptions();
	}, [schoolId]);

	// Set form data when editing or when preSelectedParentId changes
	useEffect(() => {
		if (student && mode === 'edit') {
			setFormData({
				par_id: student.par_id || '',
				std_name: student.std_name || '',
				std_code: student.std_code || '',
				std_dob: student.std_dob || '',
				std_gender: student.std_gender || '',
				previous_school: student.previous_school || '',
				started_class: student.started_class || '',
				current_class: student.current_class || '',
				status: student.status || '',
				school_id: schoolId,
			});
			setErrors({});
			
			// Set search queries for display
			const selectedParent = availableParents.find(p => p.par_id === student.par_id);
			if (selectedParent) {
				setParentSearchQuery(getParentDisplayName(selectedParent));
			}
			setGenderSearchQuery(student.std_gender || '');
			
			const selectedStartedClass = availableClasses.find(c => c.cls_id === student.started_class);
			if (selectedStartedClass) {
				setStartedClassSearchQuery(selectedStartedClass.cls_name);
			}
			
			const selectedCurrentClass = availableClasses.find(c => c.cls_id === student.current_class);
			if (selectedCurrentClass) {
				setCurrentClassSearchQuery(selectedCurrentClass.cls_name);
			}
			
			setStatusSearchQuery(student.status || '');
		} else if (mode === 'create') {
			setFormData({
				par_id: preSelectedParentId || '',
				std_name: '',
				std_code: '',
				std_dob: '',
				std_gender: '',
				previous_school: '',
				started_class: '',
				current_class: '',
				status: '',
				school_id: schoolId,
			});
			setErrors({});
			
			// Set parent search query if pre-selected
			if (preSelectedParentId) {
				const selectedParent = availableParents.find(p => p.par_id === preSelectedParentId);
				if (selectedParent) {
					setParentSearchQuery(getParentDisplayName(selectedParent));
				}
			} else {
				setParentSearchQuery('');
			}
			
			setGenderSearchQuery('');
			setStartedClassSearchQuery('');
			setCurrentClassSearchQuery('');
			setStatusSearchQuery('');
		}
	}, [student, mode, preSelectedParentId, availableParents, availableClasses, schoolId]);

	// Helper function to get parent display name
	const getParentDisplayName = (parent: ParentOption): string => {
		const parentName = parent.mother_name || parent.father_name || 'Unknown';
		const phone = parent.mother_phone || parent.father_phone || '';
		return phone ? `${parentName} (${phone})` : parentName;
	};

	// Filter options
	const filteredParents = availableParents.filter((parent) => {
		if (!parentSearchQuery.trim()) return true;
		const query = parentSearchQuery.toLowerCase();
		const displayName = getParentDisplayName(parent).toLowerCase();
		return displayName.includes(query) ||
			(parent.mother_name && parent.mother_name.toLowerCase().includes(query)) ||
			(parent.father_name && parent.father_name.toLowerCase().includes(query)) ||
			(parent.mother_phone && parent.mother_phone.includes(query)) ||
			(parent.father_phone && parent.father_phone.includes(query));
	});

	const filteredGenders = genders.filter((gender) => {
		if (!genderSearchQuery.trim()) return true;
		return gender.toLowerCase().includes(genderSearchQuery.toLowerCase());
	});

	const filteredStartedClasses = availableClasses.filter((cls) => {
		if (!startedClassSearchQuery.trim()) return true;
		const query = startedClassSearchQuery.toLowerCase();
		return cls.cls_name?.toLowerCase().includes(query) ||
			(cls.cls_type && cls.cls_type.toLowerCase().includes(query));
	});

	const filteredCurrentClasses = availableClasses.filter((cls) => {
		if (!currentClassSearchQuery.trim()) return true;
		const query = currentClassSearchQuery.toLowerCase();
		return cls.cls_name?.toLowerCase().includes(query) ||
			(cls.cls_type && cls.cls_type.toLowerCase().includes(query));
	});

	const filteredStatusOptions = statusOptions.filter((status) => {
		if (!statusSearchQuery.trim()) return true;
		return status.toLowerCase().includes(statusSearchQuery.toLowerCase());
	});

	// Get selected options for display
	const selectedParent = availableParents.find(p => p.par_id === formData.par_id);
	const selectedStartedClass = availableClasses.find(c => c.cls_id === formData.started_class);
	const selectedCurrentClass = availableClasses.find(c => c.cls_id === formData.current_class);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const refs = [
				{ dropdown: parentDropdownRef, input: parentInputRef },
				{ dropdown: genderDropdownRef, input: genderInputRef },
				{ dropdown: startedClassDropdownRef, input: startedClassInputRef },
				{ dropdown: currentClassDropdownRef, input: currentClassInputRef },
				{ dropdown: statusDropdownRef, input: statusInputRef },
			];

			refs.forEach(({ dropdown, input }) => {
				if (
					dropdown.current &&
					!dropdown.current.contains(event.target as Node) &&
					input.current &&
					!input.current.contains(event.target as Node)
				) {
					if (dropdown === parentDropdownRef) setShowParentDropdown(false);
					if (dropdown === genderDropdownRef) setShowGenderDropdown(false);
					if (dropdown === startedClassDropdownRef) setShowStartedClassDropdown(false);
					if (dropdown === currentClassDropdownRef) setShowCurrentClassDropdown(false);
					if (dropdown === statusDropdownRef) setShowStatusDropdown(false);
				}
			});
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Handle keyboard navigation
	const handleParentKeyDown = (e: React.KeyboardEvent) => {
		if (!showParentDropdown || filteredParents.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setParentHighlightedIndex((prev) => (prev < filteredParents.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setParentHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (parentHighlightedIndex >= 0 && parentHighlightedIndex < filteredParents.length) {
					handleSelectParent(filteredParents[parentHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowParentDropdown(false);
				setParentHighlightedIndex(-1);
				break;
		}
	};

	const handleGenderKeyDown = (e: React.KeyboardEvent) => {
		if (!showGenderDropdown || filteredGenders.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setGenderHighlightedIndex((prev) => (prev < filteredGenders.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setGenderHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (genderHighlightedIndex >= 0 && genderHighlightedIndex < filteredGenders.length) {
					handleSelectGender(filteredGenders[genderHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowGenderDropdown(false);
				setGenderHighlightedIndex(-1);
				break;
		}
	};

	const handleStartedClassKeyDown = (e: React.KeyboardEvent) => {
		if (!showStartedClassDropdown || filteredStartedClasses.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setStartedClassHighlightedIndex((prev) => (prev < filteredStartedClasses.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setStartedClassHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (startedClassHighlightedIndex >= 0 && startedClassHighlightedIndex < filteredStartedClasses.length) {
					handleSelectStartedClass(filteredStartedClasses[startedClassHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowStartedClassDropdown(false);
				setStartedClassHighlightedIndex(-1);
				break;
		}
	};

	const handleCurrentClassKeyDown = (e: React.KeyboardEvent) => {
		if (!showCurrentClassDropdown || filteredCurrentClasses.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setCurrentClassHighlightedIndex((prev) => (prev < filteredCurrentClasses.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setCurrentClassHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (currentClassHighlightedIndex >= 0 && currentClassHighlightedIndex < filteredCurrentClasses.length) {
					handleSelectCurrentClass(filteredCurrentClasses[currentClassHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowCurrentClassDropdown(false);
				setCurrentClassHighlightedIndex(-1);
				break;
		}
	};

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
					handleSelectStatus(filteredStatusOptions[statusHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowStatusDropdown(false);
				setStatusHighlightedIndex(-1);
				break;
		}
	};

	// Handle selections
	const handleSelectParent = (parent: ParentOption) => {
		setFormData({ ...formData, par_id: parent.par_id });
		setParentSearchQuery(getParentDisplayName(parent));
		setShowParentDropdown(false);
		setParentHighlightedIndex(-1);
		setErrors({ ...errors, par_id: '' });
	};

	const handleSelectGender = (gender: string) => {
		setFormData({ ...formData, std_gender: gender });
		setGenderSearchQuery(gender);
		setShowGenderDropdown(false);
		setGenderHighlightedIndex(-1);
		setErrors({ ...errors, std_gender: '' });
	};

	const handleSelectStartedClass = (cls: ClassOption) => {
		setFormData({ ...formData, started_class: cls.cls_id });
		setStartedClassSearchQuery(cls.cls_name);
		setShowStartedClassDropdown(false);
		setStartedClassHighlightedIndex(-1);
		setErrors({ ...errors, started_class: '' });
	};

	const handleSelectCurrentClass = (cls: ClassOption) => {
		setFormData({ ...formData, current_class: cls.cls_id });
		setCurrentClassSearchQuery(cls.cls_name);
		setShowCurrentClassDropdown(false);
		setCurrentClassHighlightedIndex(-1);
		setErrors({ ...errors, current_class: '' });
	};

	const handleSelectStatus = (status: string) => {
		setFormData({ ...formData, status });
		setStatusSearchQuery(status);
		setShowStatusDropdown(false);
		setStatusHighlightedIndex(-1);
		setErrors({ ...errors, status: '' });
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const newErrors: Record<string, string> = {};

		if (!formData.par_id) {
			newErrors.par_id = 'Parent is required';
		}
		if (!formData.std_name?.trim()) {
			newErrors.std_name = 'Student name is required';
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		// Clean up empty strings
		const submitData: Partial<StudentMember> = {
			...formData,
			std_code: formData.std_code || null,
			std_dob: formData.std_dob || null,
			std_gender: formData.std_gender || null,
			previous_school: formData.previous_school || null,
			started_class: formData.started_class || null,
			current_class: formData.current_class || null,
			status: formData.status || null,
		};

		onSubmit(submitData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Parent Selection */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Parent <span className="text-red-500">*</span>
				</label>
				<div className="relative">
					<input
						ref={parentInputRef}
						type="text"
						value={selectedParent ? getParentDisplayName(selectedParent) : parentSearchQuery}
						onChange={(e) => {
							setParentSearchQuery(e.target.value);
							setShowParentDropdown(true);
							setParentHighlightedIndex(-1);
							if (!e.target.value.trim()) {
								setFormData({ ...formData, par_id: '' });
							}
						}}
						onFocus={() => {
							if (filteredParents.length > 0) {
								setShowParentDropdown(true);
							}
						}}
						onKeyDown={handleParentKeyDown}
						placeholder="Search parent by name or phone..."
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.par_id ? 'border-red-500' : 'border-gray-300'
						}`}
					/>
					{showParentDropdown && filteredParents.length > 0 && (
						<div
							ref={parentDropdownRef}
							className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
						>
							{filteredParents.map((parent, index) => (
								<button
									key={parent.par_id}
									type="button"
									onClick={() => handleSelectParent(parent)}
									onMouseEnter={() => setParentHighlightedIndex(index)}
									className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
										index === parentHighlightedIndex ? 'bg-primary-50' : ''
									} ${formData.par_id === parent.par_id ? 'bg-primary-100 font-medium' : ''}`}
								>
									<div className="text-sm font-medium text-gray-900">{getParentDisplayName(parent)}</div>
								</button>
							))}
						</div>
					)}
				</div>
				{errors.par_id && (
					<p className="mt-1 text-sm text-red-600">{errors.par_id}</p>
				)}
			</div>

			{/* Student Name */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Student Name <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					value={formData.std_name || ''}
					onChange={(e) => {
						setFormData({ ...formData, std_name: e.target.value });
						setErrors({ ...errors, std_name: '' });
					}}
					placeholder="Enter student name"
					className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
						errors.std_name ? 'border-red-500' : 'border-gray-300'
					}`}
				/>
				{errors.std_name && (
					<p className="mt-1 text-sm text-red-600">{errors.std_name}</p>
				)}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Student Code */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Student Code <span className="text-gray-500 text-xs">(Optional - Auto-generated if empty)</span>
					</label>
					<input
						type="text"
						value={formData.std_code || ''}
						onChange={(e) => setFormData({ ...formData, std_code: e.target.value })}
						placeholder="Leave empty for auto-generation (STD-XXXXXX)"
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
					/>
				</div>

				{/* Date of Birth */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
					<input
						type="date"
						value={formData.std_dob || ''}
						onChange={(e) => setFormData({ ...formData, std_dob: e.target.value })}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
					/>
				</div>

				{/* Gender */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
					<div className="relative">
						<input
							ref={genderInputRef}
							type="text"
							value={genderSearchQuery}
							onChange={(e) => {
								setGenderSearchQuery(e.target.value);
								setShowGenderDropdown(true);
								setGenderHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setFormData({ ...formData, std_gender: '' });
								}
							}}
							onFocus={() => {
								if (filteredGenders.length > 0) {
									setShowGenderDropdown(true);
								}
							}}
							onKeyDown={handleGenderKeyDown}
							placeholder="Select gender"
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
						/>
						{showGenderDropdown && filteredGenders.length > 0 && (
							<div
								ref={genderDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredGenders.map((gender, index) => (
									<button
										key={gender}
										type="button"
										onClick={() => handleSelectGender(gender)}
										onMouseEnter={() => setGenderHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === genderHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.std_gender === gender ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{gender}</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Status */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
					<div className="relative">
						<input
							ref={statusInputRef}
							type="text"
							value={statusSearchQuery}
							onChange={(e) => {
								setStatusSearchQuery(e.target.value);
								setShowStatusDropdown(true);
								setStatusHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setFormData({ ...formData, status: '' });
								}
							}}
							onFocus={() => {
								if (filteredStatusOptions.length > 0) {
									setShowStatusDropdown(true);
								}
							}}
							onKeyDown={handleStatusKeyDown}
							placeholder="Select status"
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
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
										onClick={() => handleSelectStatus(status)}
										onMouseEnter={() => setStatusHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === statusHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.status === status ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{status}</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Previous School */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Previous School</label>
				<input
					type="text"
					value={formData.previous_school || ''}
					onChange={(e) => setFormData({ ...formData, previous_school: e.target.value })}
					placeholder="Enter previous school name"
					className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
				/>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Started Class */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Started Class</label>
					<div className="relative">
						<input
							ref={startedClassInputRef}
							type="text"
							value={selectedStartedClass ? selectedStartedClass.cls_name : startedClassSearchQuery}
							onChange={(e) => {
								setStartedClassSearchQuery(e.target.value);
								setShowStartedClassDropdown(true);
								setStartedClassHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setFormData({ ...formData, started_class: '' });
								}
							}}
							onFocus={() => {
								if (filteredStartedClasses.length > 0) {
									setShowStartedClassDropdown(true);
								}
							}}
							onKeyDown={handleStartedClassKeyDown}
							placeholder="Select started class"
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
						/>
						{showStartedClassDropdown && filteredStartedClasses.length > 0 && (
							<div
								ref={startedClassDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredStartedClasses.map((cls, index) => (
									<button
										key={cls.cls_id}
										type="button"
										onClick={() => handleSelectStartedClass(cls)}
										onMouseEnter={() => setStartedClassHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === startedClassHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.started_class === cls.cls_id ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="flex items-center justify-between">
											<div className="text-sm font-medium text-gray-900">{cls.cls_name}</div>
											{cls.cls_type && (
												<span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-xs font-medium bg-gray-100 text-gray-800 ml-2">
													{cls.cls_type}
												</span>
											)}
										</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Current Class */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Current Class</label>
					<div className="relative">
						<input
							ref={currentClassInputRef}
							type="text"
							value={selectedCurrentClass ? selectedCurrentClass.cls_name : currentClassSearchQuery}
							onChange={(e) => {
								setCurrentClassSearchQuery(e.target.value);
								setShowCurrentClassDropdown(true);
								setCurrentClassHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setFormData({ ...formData, current_class: '' });
								}
							}}
							onFocus={() => {
								if (filteredCurrentClasses.length > 0) {
									setShowCurrentClassDropdown(true);
								}
							}}
							onKeyDown={handleCurrentClassKeyDown}
							placeholder="Select current class"
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
						/>
						{showCurrentClassDropdown && filteredCurrentClasses.length > 0 && (
							<div
								ref={currentClassDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredCurrentClasses.map((cls, index) => (
									<button
										key={cls.cls_id}
										type="button"
										onClick={() => handleSelectCurrentClass(cls)}
										onMouseEnter={() => setCurrentClassHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === currentClassHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.current_class === cls.cls_id ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="flex items-center justify-between">
											<div className="text-sm font-medium text-gray-900">{cls.cls_name}</div>
											{cls.cls_type && (
												<span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-xs font-medium bg-gray-100 text-gray-800 ml-2">
													{cls.cls_type}
												</span>
											)}
										</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Form Actions */}
			<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					disabled={loading}
					className="px-6 py-2.5 border border-gray-300 rounded-[3px] text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-[3px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Processing...' : mode === 'create' ? 'Create Student' : 'Update Student'}
				</button>
			</div>
		</form>
	);
}


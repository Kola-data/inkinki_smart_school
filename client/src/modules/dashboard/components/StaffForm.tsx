import { useState, useEffect, useRef } from 'react';
import { convertFileToBase64, validateFileSize, validateImageFile } from '../../../utils/fileUtils';

interface StaffMember {
	staff_id?: string;
	staff_name: string;
	email: string;
	staff_title: string | null;
	staff_role: string | null;
	employment_type: string | null;
	staff_gender: string | null;
	staff_dob: string | null;
	qualifications: string | null;
	experience: string | null;
	staff_profile: string | null;
	staff_nid_photo: string | null;
	phone: string | null;
	password?: string;
	is_active: boolean;
}

interface StaffFormProps {
	staff?: StaffMember | null;
	onSubmit: (data: Partial<StaffMember>) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
}

export default function StaffForm({ staff, onSubmit, onCancel, loading = false, mode }: StaffFormProps) {
	const [formData, setFormData] = useState<Partial<StaffMember>>({
		staff_name: '',
		email: '',
		phone: '',
		staff_title: '',
		staff_role: '',
		employment_type: '',
		staff_gender: '',
		staff_dob: '',
		qualifications: '',
		experience: '',
		password: '',
		is_active: true,
	});

	const [profileFile, setProfileFile] = useState<File | null>(null);
	const [nidFile, setNidFile] = useState<File | null>(null);
	const [profilePreview, setProfilePreview] = useState<string | null>(null);
	const [nidPreview, setNidPreview] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Autocomplete states for select boxes
	const [roleSearchQuery, setRoleSearchQuery] = useState('');
	const [showRoleDropdown, setShowRoleDropdown] = useState(false);
	const [roleHighlightedIndex, setRoleHighlightedIndex] = useState(-1);
	const roleDropdownRef = useRef<HTMLDivElement>(null);
	const roleInputRef = useRef<HTMLInputElement>(null);

	const [employmentTypeSearchQuery, setEmploymentTypeSearchQuery] = useState('');
	const [showEmploymentTypeDropdown, setShowEmploymentTypeDropdown] = useState(false);
	const [employmentTypeHighlightedIndex, setEmploymentTypeHighlightedIndex] = useState(-1);
	const employmentTypeDropdownRef = useRef<HTMLDivElement>(null);
	const employmentTypeInputRef = useRef<HTMLInputElement>(null);

	const [genderSearchQuery, setGenderSearchQuery] = useState('');
	const [showGenderDropdown, setShowGenderDropdown] = useState(false);
	const [genderHighlightedIndex, setGenderHighlightedIndex] = useState(-1);
	const genderDropdownRef = useRef<HTMLDivElement>(null);
	const genderInputRef = useRef<HTMLInputElement>(null);

	const roles = ['admin', 'teacher', 'accountant'];
	const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Temporary'];
	const genders = ['Male', 'Female'];

	useEffect(() => {
		if (staff && mode === 'edit') {
			setFormData({
				staff_name: staff.staff_name || '',
				email: staff.email || '',
				phone: staff.phone || '',
				staff_title: staff.staff_title || '',
				staff_role: staff.staff_role || '',
				employment_type: staff.employment_type || '',
				staff_gender: staff.staff_gender || '',
				staff_dob: staff.staff_dob ? staff.staff_dob.split('T')[0] : '',
				qualifications: staff.qualifications || '',
				experience: staff.experience || '',
				staff_profile: staff.staff_profile || null,
				staff_nid_photo: staff.staff_nid_photo || null,
				is_active: staff.is_active ?? true,
			});
			setRoleSearchQuery(staff.staff_role || '');
			setEmploymentTypeSearchQuery(staff.employment_type || '');
			setGenderSearchQuery(staff.staff_gender || '');
			if (staff.staff_profile) {
				setProfilePreview(staff.staff_profile.startsWith('http') ? staff.staff_profile : `http://localhost:8000/${staff.staff_profile}`);
			}
			if (staff.staff_nid_photo) {
				setNidPreview(staff.staff_nid_photo.startsWith('http') ? staff.staff_nid_photo : `http://localhost:8000/${staff.staff_nid_photo}`);
			}
		}
		if (mode === 'create') {
			setRoleSearchQuery('');
			setEmploymentTypeSearchQuery('');
			setGenderSearchQuery('');
		}
	}, [staff, mode]);

	// Filter options
	const filteredRoles = roles.filter((role) => {
		if (!roleSearchQuery.trim()) return true;
		return role.toLowerCase().includes(roleSearchQuery.toLowerCase());
	});

	const filteredEmploymentTypes = employmentTypes.filter((type) => {
		if (!employmentTypeSearchQuery.trim()) return true;
		return type.toLowerCase().includes(employmentTypeSearchQuery.toLowerCase());
	});

	const filteredGenders = genders.filter((gender) => {
		if (!genderSearchQuery.trim()) return true;
		return gender.toLowerCase().includes(genderSearchQuery.toLowerCase());
	});

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				roleDropdownRef.current &&
				!roleDropdownRef.current.contains(event.target as Node) &&
				roleInputRef.current &&
				!roleInputRef.current.contains(event.target as Node)
			) {
				setShowRoleDropdown(false);
			}
			if (
				employmentTypeDropdownRef.current &&
				!employmentTypeDropdownRef.current.contains(event.target as Node) &&
				employmentTypeInputRef.current &&
				!employmentTypeInputRef.current.contains(event.target as Node)
			) {
				setShowEmploymentTypeDropdown(false);
			}
			if (
				genderDropdownRef.current &&
				!genderDropdownRef.current.contains(event.target as Node) &&
				genderInputRef.current &&
				!genderInputRef.current.contains(event.target as Node)
			) {
				setShowGenderDropdown(false);
			}
		};

		if (showRoleDropdown || showEmploymentTypeDropdown || showGenderDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showRoleDropdown, showEmploymentTypeDropdown, showGenderDropdown]);

	// Keyboard navigation handlers
	const handleRoleKeyDown = (e: React.KeyboardEvent) => {
		if (!showRoleDropdown || filteredRoles.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setRoleHighlightedIndex((prev) => (prev < filteredRoles.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setRoleHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (roleHighlightedIndex >= 0 && roleHighlightedIndex < filteredRoles.length) {
					handleSelectRole(filteredRoles[roleHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowRoleDropdown(false);
				setRoleHighlightedIndex(-1);
				break;
		}
	};

	const handleEmploymentTypeKeyDown = (e: React.KeyboardEvent) => {
		if (!showEmploymentTypeDropdown || filteredEmploymentTypes.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setEmploymentTypeHighlightedIndex((prev) => (prev < filteredEmploymentTypes.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setEmploymentTypeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (employmentTypeHighlightedIndex >= 0 && employmentTypeHighlightedIndex < filteredEmploymentTypes.length) {
					handleSelectEmploymentType(filteredEmploymentTypes[employmentTypeHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowEmploymentTypeDropdown(false);
				setEmploymentTypeHighlightedIndex(-1);
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

	// Selection handlers
	const handleSelectRole = (role: string) => {
		handleChange('staff_role', role);
		setRoleSearchQuery(role.charAt(0).toUpperCase() + role.slice(1));
		setShowRoleDropdown(false);
		setRoleHighlightedIndex(-1);
	};

	const handleSelectEmploymentType = (type: string) => {
		handleChange('employment_type', type);
		setEmploymentTypeSearchQuery(type);
		setShowEmploymentTypeDropdown(false);
		setEmploymentTypeHighlightedIndex(-1);
	};

	const handleSelectGender = (gender: string) => {
		handleChange('staff_gender', gender);
		setGenderSearchQuery(gender);
		setShowGenderDropdown(false);
		setGenderHighlightedIndex(-1);
	};

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.staff_name?.trim()) {
			newErrors.staff_name = 'Staff name is required';
		}

		if (!formData.email?.trim()) {
			newErrors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = 'Invalid email format';
		}

		if (mode === 'create' && !formData.password?.trim()) {
			newErrors.password = 'Password is required';
		} else if (mode === 'create' && formData.password && formData.password.length < 6) {
			newErrors.password = 'Password must be at least 6 characters';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleProfileFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!validateImageFile(file)) {
			setErrors((prev) => ({ ...prev, staff_profile: 'Please select a valid image file (PNG, JPG, JPEG)' }));
			return;
		}

		if (!validateFileSize(file, 5)) {
			setErrors((prev) => ({ ...prev, staff_profile: 'File size must be less than 5MB' }));
			return;
		}

		setProfileFile(file);
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.staff_profile;
			return newErrors;
		});

		const reader = new FileReader();
		reader.onloadend = () => {
			setProfilePreview(reader.result as string);
		};
		reader.readAsDataURL(file);
	};

	const handleNidFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!validateImageFile(file)) {
			setErrors((prev) => ({ ...prev, staff_nid_photo: 'Please select a valid image file (PNG, JPG, JPEG)' }));
			return;
		}

		if (!validateFileSize(file, 5)) {
			setErrors((prev) => ({ ...prev, staff_nid_photo: 'File size must be less than 5MB' }));
			return;
		}

		setNidFile(file);
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.staff_nid_photo;
			return newErrors;
		});

		const reader = new FileReader();
		reader.onloadend = () => {
			setNidPreview(reader.result as string);
		};
		reader.readAsDataURL(file);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		const submitData: any = { ...formData };

		// Handle profile photo upload
		if (profileFile) {
			try {
				const profileBase64 = await convertFileToBase64(profileFile);
				submitData.staff_profile = profileBase64;
			} catch (error) {
				setErrors((prev) => ({ ...prev, staff_profile: 'Failed to process profile image' }));
				return;
			}
		} else if (mode === 'edit' && !submitData.staff_profile) {
			// Keep existing profile if not changed
			submitData.staff_profile = staff?.staff_profile || null;
		}

		// Handle NID photo upload
		if (nidFile) {
			try {
				const nidBase64 = await convertFileToBase64(nidFile);
				submitData.staff_nid_photo = nidBase64;
			} catch (error) {
				setErrors((prev) => ({ ...prev, staff_nid_photo: 'Failed to process NID image' }));
				return;
			}
		} else if (mode === 'edit' && !submitData.staff_nid_photo) {
			// Keep existing NID photo if not changed
			submitData.staff_nid_photo = staff?.staff_nid_photo || null;
		}

		// For edit mode, only include password if it's provided and not empty
		if (mode === 'edit') {
			if (!submitData.password || !submitData.password.trim()) {
				delete submitData.password;
			}
		}

		await onSubmit(submitData);
	};

	const handleChange = (field: keyof StaffMember, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Profile Photo Upload */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
				<div className="flex items-center gap-4">
					{profilePreview && (
						<div className="relative">
							<img
								src={profilePreview}
								alt="Profile preview"
								className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
							/>
							<button
								type="button"
								onClick={() => {
									setProfilePreview(null);
									setProfileFile(null);
									setFormData((prev) => ({ ...prev, staff_profile: null }));
								}}
								className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
							>
								×
							</button>
						</div>
					)}
					<div className="flex-1">
						<input
							type="file"
							accept="image/*"
							onChange={handleProfileFileChange}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
						/>
						{errors.staff_profile && <p className="mt-1 text-sm text-red-600">{errors.staff_profile}</p>}
						<p className="mt-1 text-xs text-gray-500">PNG, JPG up to 5MB</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Staff Name */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Staff Name <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						value={formData.staff_name || ''}
						onChange={(e) => handleChange('staff_name', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.staff_name ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter staff name"
					/>
					{errors.staff_name && <p className="mt-1 text-sm text-red-600">{errors.staff_name}</p>}
				</div>

				{/* Email */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Email <span className="text-red-500">*</span>
					</label>
					<input
						type="email"
						value={formData.email || ''}
						onChange={(e) => handleChange('email', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.email ? 'border-red-500' : 'border-gray-300'
						}`}
						placeholder="Enter email"
					/>
					{errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
				</div>

				{/* Phone */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
					<input
						type="tel"
						value={formData.phone || ''}
						onChange={(e) => handleChange('phone', e.target.value || null)}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
						placeholder="Enter phone number"
					/>
				</div>

				{/* Password (only for create) */}
				{mode === 'create' && (
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Password <span className="text-red-500">*</span>
						</label>
						<input
							type="password"
							value={formData.password || ''}
							onChange={(e) => handleChange('password', e.target.value)}
							className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
								errors.password ? 'border-red-500' : 'border-gray-300'
							}`}
							placeholder="Enter password"
						/>
						{errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
					</div>
				)}

				{/* Title */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
					<input
						type="text"
						value={formData.staff_title || ''}
						onChange={(e) => handleChange('staff_title', e.target.value)}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
						placeholder="e.g., DOS, Principal"
					/>
				</div>

				{/* Role */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
					<div className="relative">
						<input
							ref={roleInputRef}
							type="text"
							value={formData.staff_role ? formData.staff_role.charAt(0).toUpperCase() + formData.staff_role.slice(1) : roleSearchQuery}
							onChange={(e) => {
								setRoleSearchQuery(e.target.value);
								setShowRoleDropdown(true);
								setRoleHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowRoleDropdown(false);
									handleChange('staff_role', null);
								}
							}}
							onFocus={() => {
								if (filteredRoles.length > 0) {
									setShowRoleDropdown(true);
								}
							}}
							onKeyDown={handleRoleKeyDown}
							placeholder="Search role..."
							disabled={loading}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
						/>
						{showRoleDropdown && filteredRoles.length > 0 && (
							<div
								ref={roleDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredRoles.map((role, index) => (
									<button
										key={role}
										type="button"
										onClick={() => handleSelectRole(role)}
										onMouseEnter={() => setRoleHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === roleHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.staff_role === role ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900 capitalize">{role}</div>
									</button>
								))}
							</div>
						)}
						{showRoleDropdown && filteredRoles.length === 0 && roleSearchQuery.trim() && (
							<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg">
								<div className="px-4 py-2.5 text-sm text-gray-500">No roles found</div>
							</div>
						)}
					</div>
				</div>

				{/* Employment Type */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
					<div className="relative">
						<input
							ref={employmentTypeInputRef}
							type="text"
							value={formData.employment_type || employmentTypeSearchQuery}
							onChange={(e) => {
								setEmploymentTypeSearchQuery(e.target.value);
								setShowEmploymentTypeDropdown(true);
								setEmploymentTypeHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowEmploymentTypeDropdown(false);
									handleChange('employment_type', null);
								}
							}}
							onFocus={() => {
								if (filteredEmploymentTypes.length > 0) {
									setShowEmploymentTypeDropdown(true);
								}
							}}
							onKeyDown={handleEmploymentTypeKeyDown}
							placeholder="Search employment type..."
							disabled={loading}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
						/>
						{showEmploymentTypeDropdown && filteredEmploymentTypes.length > 0 && (
							<div
								ref={employmentTypeDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredEmploymentTypes.map((type, index) => (
									<button
										key={type}
										type="button"
										onClick={() => handleSelectEmploymentType(type)}
										onMouseEnter={() => setEmploymentTypeHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === employmentTypeHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.employment_type === type ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{type}</div>
									</button>
								))}
							</div>
						)}
						{showEmploymentTypeDropdown && filteredEmploymentTypes.length === 0 && employmentTypeSearchQuery.trim() && (
							<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg">
								<div className="px-4 py-2.5 text-sm text-gray-500">No employment types found</div>
							</div>
						)}
					</div>
				</div>

				{/* Gender */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
					<div className="relative">
						<input
							ref={genderInputRef}
							type="text"
							value={formData.staff_gender || genderSearchQuery}
							onChange={(e) => {
								setGenderSearchQuery(e.target.value);
								setShowGenderDropdown(true);
								setGenderHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowGenderDropdown(false);
									handleChange('staff_gender', null);
								}
							}}
							onFocus={() => {
								if (filteredGenders.length > 0) {
									setShowGenderDropdown(true);
								}
							}}
							onKeyDown={handleGenderKeyDown}
							placeholder="Search gender..."
							disabled={loading}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
										} ${formData.staff_gender === gender ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{gender}</div>
									</button>
								))}
							</div>
						)}
						{showGenderDropdown && filteredGenders.length === 0 && genderSearchQuery.trim() && (
							<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg">
								<div className="px-4 py-2.5 text-sm text-gray-500">No genders found</div>
							</div>
						)}
					</div>
				</div>

				{/* Date of Birth */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
					<input
						type="date"
						value={formData.staff_dob || ''}
						onChange={(e) => handleChange('staff_dob', e.target.value || null)}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
					/>
				</div>
			</div>

			{/* Qualifications */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Qualifications</label>
				<textarea
					value={formData.qualifications || ''}
					onChange={(e) => handleChange('qualifications', e.target.value || null)}
					rows={3}
					className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
					placeholder="Enter qualifications"
				/>
			</div>

			{/* Experience */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
				<input
					type="text"
					value={formData.experience || ''}
					onChange={(e) => handleChange('experience', e.target.value || null)}
					className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
					placeholder="e.g., 5 years"
				/>
			</div>

			{/* NID Photo Upload */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">NID Photo</label>
				<div className="flex items-center gap-4">
					{nidPreview && (
						<div className="relative">
							<img
								src={nidPreview}
								alt="NID preview"
								className="w-24 h-16 rounded object-cover border-2 border-gray-300"
							/>
							<button
								type="button"
								onClick={() => {
									setNidPreview(null);
									setNidFile(null);
									setFormData((prev) => ({ ...prev, staff_nid_photo: null }));
								}}
								className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
							>
								×
							</button>
						</div>
					)}
					<div className="flex-1">
						<input
							type="file"
							accept="image/*"
							onChange={handleNidFileChange}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
						/>
						{errors.staff_nid_photo && <p className="mt-1 text-sm text-red-600">{errors.staff_nid_photo}</p>}
						<p className="mt-1 text-xs text-gray-500">PNG, JPG up to 5MB</p>
					</div>
				</div>
			</div>

			{/* Active Status */}
			<div className="flex items-center">
				<input
					type="checkbox"
					id="is_active"
					checked={formData.is_active ?? true}
					onChange={(e) => handleChange('is_active', e.target.checked)}
					className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
				/>
				<label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
					Active Status
				</label>
			</div>

			{/* Form Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					disabled={loading}
					className="px-6 py-2.5 border border-gray-300 rounded-[3px] text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-[3px] hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
				>
					{loading && (
						<svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					)}
					{mode === 'create' ? 'Create Staff' : 'Update Staff'}
				</button>
			</div>
		</form>
	);
}


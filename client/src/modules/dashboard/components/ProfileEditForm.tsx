import { useState, useEffect, useRef } from 'react';
import Modal from '../../../components/Modal';
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

interface ProfileEditFormProps {
	staff: StaffMember;
	onSubmit: (data: Partial<StaffMember>) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
	mode: 'edit';
}

const API_BASE_URL = 'http://localhost:8000';

export default function ProfileEditForm({ staff, onSubmit, onCancel, loading = false }: ProfileEditFormProps) {
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
	});

	const [profileFile, setProfileFile] = useState<File | null>(null);
	const [profilePreview, setProfilePreview] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Autocomplete states
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
		if (staff) {
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
			});
			setRoleSearchQuery(staff.staff_role || '');
			setEmploymentTypeSearchQuery(staff.employment_type || '');
			setGenderSearchQuery(staff.staff_gender || '');
			if (staff.staff_profile) {
				const profileUrl = staff.staff_profile.startsWith('http') 
					? staff.staff_profile 
					: `${API_BASE_URL}/${staff.staff_profile}`;
				setProfilePreview(profileUrl);
			}
		}
	}, [staff]);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;

			if (roleDropdownRef.current && !roleDropdownRef.current.contains(target) && roleInputRef.current && !roleInputRef.current.contains(target)) {
				setShowRoleDropdown(false);
			}
			if (employmentTypeDropdownRef.current && !employmentTypeDropdownRef.current.contains(target) && employmentTypeInputRef.current && !employmentTypeInputRef.current.contains(target)) {
				setShowEmploymentTypeDropdown(false);
			}
			if (genderDropdownRef.current && !genderDropdownRef.current.contains(target) && genderInputRef.current && !genderInputRef.current.contains(target)) {
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

	const handleChange = (field: keyof StaffMember, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	const handleProfileFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!validateImageFile(file)) {
			setErrors((prev) => ({ ...prev, profile: 'Please select a valid image file (JPG, PNG, GIF)' }));
			return;
		}

		if (!validateFileSize(file, 5)) {
			setErrors((prev) => ({ ...prev, profile: 'Image size must be less than 5MB' }));
			return;
		}

		setProfileFile(file);
		setErrors((prev) => ({ ...prev, profile: '' }));

		try {
			const base64 = await convertFileToBase64(file);
			setProfilePreview(base64);
			handleChange('staff_profile', base64);
		} catch (error) {
			setErrors((prev) => ({ ...prev, profile: 'Failed to process image' }));
		}
	};

	const validate = () => {
		const newErrors: Record<string, string> = {};

		if (!formData.staff_name?.trim()) {
			newErrors.staff_name = 'Name is required';
		}

		if (!formData.email?.trim()) {
			newErrors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = 'Invalid email format';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		const submitData: Partial<StaffMember> = {
			...formData,
		};

		await onSubmit(submitData);
	};

	return (
		<Modal isOpen={true} onClose={onCancel} title="Edit Profile" size="lg">
			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Profile Image */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
					<div className="flex items-center gap-4">
						{profilePreview ? (
							<img src={profilePreview} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-gray-300" />
						) : (
							<div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
								<span className="text-gray-400 text-sm">No image</span>
							</div>
						)}
						<div>
							<input
								type="file"
								accept="image/*"
								onChange={handleProfileFileChange}
								className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-[3px] file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
								disabled={loading}
							/>
							{errors.profile && <p className="mt-1 text-sm text-red-600">{errors.profile}</p>}
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Name */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Name <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							value={formData.staff_name || ''}
							onChange={(e) => handleChange('staff_name', e.target.value)}
							className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
								errors.staff_name ? 'border-red-500' : 'border-gray-300'
							}`}
							placeholder="Enter name"
							disabled={loading}
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
							disabled={loading}
						/>
						{errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
					</div>

					{/* Phone */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
						<input
							type="tel"
							value={formData.phone || ''}
							onChange={(e) => handleChange('phone', e.target.value)}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
							placeholder="Enter phone number"
							disabled={loading}
						/>
					</div>

					{/* Title */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
						<input
							type="text"
							value={formData.staff_title || ''}
							onChange={(e) => handleChange('staff_title', e.target.value)}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
							placeholder="Enter title"
							disabled={loading}
						/>
					</div>

					{/* Role */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
						<div className="relative">
							<input
								ref={roleInputRef}
								type="text"
								value={formData.staff_role || roleSearchQuery}
								onChange={(e) => {
									setRoleSearchQuery(e.target.value);
									setShowRoleDropdown(true);
									setRoleHighlightedIndex(-1);
									if (!e.target.value.trim()) {
										setShowRoleDropdown(false);
										handleChange('staff_role', '');
									}
								}}
								onFocus={() => {
									if (roles.length > 0) {
										setShowRoleDropdown(true);
									}
									setRoleSearchQuery('');
								}}
								className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
								placeholder="Select role"
								disabled={loading}
							/>
							{showRoleDropdown && roles.length > 0 && (
								<div
									ref={roleDropdownRef}
									className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
								>
									<div className="flex flex-col">
										{roles.filter((role) => {
											if (!roleSearchQuery.trim()) return true;
											return role.toLowerCase().includes(roleSearchQuery.toLowerCase());
										}).map((role, index) => (
											<button
												key={role}
												type="button"
												onClick={() => {
													handleChange('staff_role', role);
													setRoleSearchQuery(role);
													setShowRoleDropdown(false);
												}}
												onMouseEnter={() => setRoleHighlightedIndex(index)}
												className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm block ${
													index === roleHighlightedIndex ? 'bg-primary-50' : ''
												} ${formData.staff_role === role ? 'bg-primary-100 font-medium' : ''}`}
											>
												{role}
											</button>
										))}
									</div>
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
										handleChange('employment_type', '');
									}
								}}
								onFocus={() => {
									if (employmentTypes.length > 0) {
										setShowEmploymentTypeDropdown(true);
									}
									setEmploymentTypeSearchQuery('');
								}}
								className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
								placeholder="Select employment type"
								disabled={loading}
							/>
							{showEmploymentTypeDropdown && employmentTypes.length > 0 && (
								<div
									ref={employmentTypeDropdownRef}
									className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
								>
									<div className="flex flex-col">
										{employmentTypes.filter((type) => {
											if (!employmentTypeSearchQuery.trim()) return true;
											return type.toLowerCase().includes(employmentTypeSearchQuery.toLowerCase());
										}).map((type, index) => (
											<button
												key={type}
												type="button"
												onClick={() => {
													handleChange('employment_type', type);
													setEmploymentTypeSearchQuery(type);
													setShowEmploymentTypeDropdown(false);
												}}
												onMouseEnter={() => setEmploymentTypeHighlightedIndex(index)}
												className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm block ${
													index === employmentTypeHighlightedIndex ? 'bg-primary-50' : ''
												} ${formData.employment_type === type ? 'bg-primary-100 font-medium' : ''}`}
											>
												{type}
											</button>
										))}
									</div>
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
										handleChange('staff_gender', '');
									}
								}}
								onFocus={() => {
									if (genders.length > 0) {
										setShowGenderDropdown(true);
									}
									setGenderSearchQuery('');
								}}
								className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
								placeholder="Select gender"
								disabled={loading}
							/>
							{showGenderDropdown && genders.length > 0 && (
								<div
									ref={genderDropdownRef}
									className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
								>
									<div className="flex flex-col">
										{genders.filter((gender) => {
											if (!genderSearchQuery.trim()) return true;
											return gender.toLowerCase().includes(genderSearchQuery.toLowerCase());
										}).map((gender, index) => (
											<button
												key={gender}
												type="button"
												onClick={() => {
													handleChange('staff_gender', gender);
													setGenderSearchQuery(gender);
													setShowGenderDropdown(false);
												}}
												onMouseEnter={() => setGenderHighlightedIndex(index)}
												className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm block ${
													index === genderHighlightedIndex ? 'bg-primary-50' : ''
												} ${formData.staff_gender === gender ? 'bg-primary-100 font-medium' : ''}`}
											>
												{gender}
											</button>
										))}
									</div>
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
							onChange={(e) => handleChange('staff_dob', e.target.value)}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
							disabled={loading}
						/>
					</div>
				</div>

				{/* Qualifications */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Qualifications</label>
					<textarea
						value={formData.qualifications || ''}
						onChange={(e) => handleChange('qualifications', e.target.value)}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
						rows={4}
						placeholder="Enter qualifications"
						disabled={loading}
					/>
				</div>

				{/* Experience */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
					<textarea
						value={formData.experience || ''}
						onChange={(e) => handleChange('experience', e.target.value)}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
						rows={4}
						placeholder="Enter experience"
						disabled={loading}
					/>
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
						{loading ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</form>
		</Modal>
	);
}


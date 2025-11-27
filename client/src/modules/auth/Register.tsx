import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import {
	validateRequired,
	validateEmail,
	validatePhone,
} from '../../utils/validation';
import { convertFileToBase64, validateFileSize, validateImageFile } from '../../utils/fileUtils';

interface SchoolFormData {
	school_name: string;
	school_address: string;
	school_ownership: string;
	school_phone: string;
	school_email: string;
	school_logo: File | null;
}

export default function Register() {
	const [schoolData, setSchoolData] = useState<SchoolFormData>({
		school_name: '',
		school_address: '',
		school_ownership: '',
		school_phone: '',
		school_email: '',
		school_logo: null,
	});
	const [schoolErrors, setSchoolErrors] = useState<Partial<Record<keyof SchoolFormData, string>>>({});
	const [schoolTouched, setSchoolTouched] = useState<Partial<Record<keyof SchoolFormData, boolean>>>({});
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	// Autocomplete states for school ownership
	const [ownershipQuery, setOwnershipQuery] = useState('');
	const [showOwnershipDropdown, setShowOwnershipDropdown] = useState(false);
	const [ownershipHighlightedIndex, setOwnershipHighlightedIndex] = useState(-1);
	const ownershipDropdownRef = useRef<HTMLDivElement>(null);
	const ownershipInputRef = useRef<HTMLInputElement>(null);

	const ownershipOptions = ['Public', 'Private', 'Government', 'Semi-Government', 'International'];

	// Filter ownership options based on search query
	const filteredOwnershipOptions = ownershipOptions.filter((option) => {
		if (!ownershipQuery.trim()) return true;
		return option.toLowerCase().includes(ownershipQuery.toLowerCase());
	});

	// Keyboard navigation for ownership autocomplete
	const handleOwnershipKeyDown = (e: React.KeyboardEvent) => {
		if (!showOwnershipDropdown || filteredOwnershipOptions.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setOwnershipHighlightedIndex((prev) => (prev < filteredOwnershipOptions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setOwnershipHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (ownershipHighlightedIndex >= 0 && ownershipHighlightedIndex < filteredOwnershipOptions.length) {
					const selected = filteredOwnershipOptions[ownershipHighlightedIndex];
					handleSchoolChange('school_ownership', selected);
					setOwnershipQuery(selected);
					setShowOwnershipDropdown(false);
				} else if (ownershipHighlightedIndex === -1 && filteredOwnershipOptions.length === 1) {
					const selected = filteredOwnershipOptions[0];
					handleSchoolChange('school_ownership', selected);
					setOwnershipQuery(selected);
					setShowOwnershipDropdown(false);
				}
				break;
			case 'Escape':
				setShowOwnershipDropdown(false);
				setOwnershipHighlightedIndex(-1);
				break;
		}
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				ownershipDropdownRef.current &&
				!ownershipDropdownRef.current.contains(event.target as Node) &&
				ownershipInputRef.current &&
				!ownershipInputRef.current.contains(event.target as Node)
			) {
				setShowOwnershipDropdown(false);
			}
		};

		if (showOwnershipDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showOwnershipDropdown]);

	const validateSchoolField = (field: keyof SchoolFormData, value: string | File | null): boolean => {
		let error: string | null = null;

		if (field === 'school_name') {
			error = validateRequired(value as string, 'School name');
		} else if (field === 'school_address') {
			error = validateRequired(value as string, 'School address');
		} else if (field === 'school_phone') {
			error = validatePhone(value as string);
		} else if (field === 'school_email') {
			error = validateEmail(value as string);
		} else if (field === 'school_logo' && value) {
			const file = value as File;
			if (!validateImageFile(file)) {
				error = 'Please upload a valid image file (JPEG, PNG, GIF, WebP)';
			} else if (!validateFileSize(file, 5)) {
				error = 'Image size must be less than 5MB';
			}
		}

		setSchoolErrors((prev) => ({ ...prev, [field]: error || undefined }));
		return !error;
	};

	const handleSchoolChange = (field: keyof SchoolFormData, value: string | File | null) => {
		setSchoolData((prev) => ({ ...prev, [field]: value }));
		
		if (schoolTouched[field]) {
			validateSchoolField(field, value);
		}
	};

	const handleSchoolBlur = (field: keyof SchoolFormData) => {
		setSchoolTouched((prev) => ({ ...prev, [field]: true }));
		validateSchoolField(field, schoolData[field]);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Mark all fields as touched
			setSchoolTouched({
				school_name: true,
				school_address: true,
				school_phone: true,
				school_email: true,
			school_logo: true,
			});

		// Validate all fields
			const isSchoolNameValid = validateSchoolField('school_name', schoolData.school_name);
			const isSchoolAddressValid = validateSchoolField('school_address', schoolData.school_address);
			const isSchoolPhoneValid = validateSchoolField('school_phone', schoolData.school_phone);
			const isSchoolEmailValid = validateSchoolField('school_email', schoolData.school_email);
			const isSchoolLogoValid = schoolData.school_logo
				? validateSchoolField('school_logo', schoolData.school_logo)
				: true; // Logo is optional

			if (
				!isSchoolNameValid ||
				!isSchoolAddressValid ||
				!isSchoolPhoneValid ||
				!isSchoolEmailValid ||
				!isSchoolLogoValid
			) {
				toast.error('Please fix the errors in the form');
				return;
			}

		// Create school
			setLoading(true);
			try {
				let schoolLogoBase64: string | undefined;
				if (schoolData.school_logo) {
					schoolLogoBase64 = await convertFileToBase64(schoolData.school_logo);
				}

			await api.post('/school/', {
					school_name: schoolData.school_name,
					school_address: schoolData.school_address,
					school_ownership: schoolData.school_ownership || null,
					school_phone: schoolData.school_phone,
					school_email: schoolData.school_email,
					school_logo: schoolLogoBase64 || null,
				});

			toast.success('School registered successfully! Please login to continue.');
			setTimeout(() => {
				navigate('/login');
			}, 1500);
		} catch (err: any) {
			const errorMessage =
				err.response?.data?.detail || err.message || 'Failed to register school. Please try again.';
			toast.error(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex">
			{/* Left Panel - Illustration */}
			<div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-50 to-blue-50 items-center justify-center p-12 relative overflow-hidden">
				<div className="relative z-10">
					{/* Person Illustration */}
					<div className="relative">
						<div className="w-80 h-96 flex items-end justify-center">
							<div className="absolute bottom-20 w-32 h-32 bg-gray-300 rounded-t-lg transform -rotate-12"></div>
							<div className="relative z-10">
								<div className="w-20 h-20 bg-gray-800 rounded-full mx-auto mb-2"></div>
								<div className="w-32 h-40 bg-coral-500 rounded-t-2xl relative shadow-md">
									<div className="absolute -top-2 -right-4 w-8 h-16 bg-gray-800 rounded-full transform rotate-12"></div>
								</div>
								<div className="flex gap-4 justify-center mt-2">
									<div className="w-10 h-16 bg-blue-600 rounded-[3px]"></div>
									<div className="w-10 h-16 bg-blue-600 rounded-[3px]"></div>
								</div>
							</div>
							<div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 translate-y-8">
								<div className="w-40 h-28 bg-gray-200 rounded-[3px] shadow-lg">
									<div className="w-full h-1 bg-gray-400 mt-2"></div>
									<div className="w-3/4 h-1 bg-gray-300 mx-auto mt-2"></div>
								</div>
							</div>
						</div>
					</div>
					<div className="absolute top-20 left-20 w-16 h-16 bg-red-500 transform rotate-45 opacity-60"></div>
					<div className="absolute top-40 right-32 w-8 h-8 bg-red-500 transform rotate-45 opacity-60"></div>
					<div className="absolute bottom-32 left-32 w-12 h-12 bg-blue-300 rounded-full opacity-60"></div>
					<div className="absolute bottom-20 right-20 w-20 h-20 bg-blue-300 rounded-full opacity-60"></div>
				</div>
			</div>

			{/* Right Panel - Registration Form */}
			<div className="flex-1 flex items-center justify-center bg-white p-8 overflow-y-auto">
				<div className="w-full max-w-md">
					<div className="mb-6">
						<h1 className="text-3xl font-bold text-gray-900 mb-2">School Registration</h1>
						<p className="text-gray-600">Register Your School Details</p>
					</div>

					<form onSubmit={handleSubmit}>
								<div className="space-y-5">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											SCHOOL NAME *
										</label>
										<input
											type="text"
											value={schoolData.school_name}
											onChange={(e) => handleSchoolChange('school_name', e.target.value)}
											onBlur={() => handleSchoolBlur('school_name')}
											className={`w-full px-4 py-3 border rounded-[3px] focus:ring-2 focus:ring-purple-600 outline-none transition ${
												schoolTouched.school_name && schoolErrors.school_name
													? 'border-red-500 focus:border-red-500'
													: 'border-gray-300 focus:border-purple-600'
											}`}
											placeholder="Enter school name"
										/>
										{schoolTouched.school_name && schoolErrors.school_name && (
											<p className="mt-1 text-sm text-red-600">{schoolErrors.school_name}</p>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											SCHOOL ADDRESS *
										</label>
										<input
											type="text"
											value={schoolData.school_address}
											onChange={(e) => handleSchoolChange('school_address', e.target.value)}
											onBlur={() => handleSchoolBlur('school_address')}
											className={`w-full px-4 py-3 border rounded-[3px] focus:ring-2 focus:ring-purple-600 outline-none transition ${
												schoolTouched.school_address && schoolErrors.school_address
													? 'border-red-500 focus:border-red-500'
													: 'border-gray-300 focus:border-purple-600'
											}`}
											placeholder="Enter school address"
										/>
										{schoolTouched.school_address && schoolErrors.school_address && (
											<p className="mt-1 text-sm text-red-600">{schoolErrors.school_address}</p>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											SCHOOL OWNERSHIP
										</label>
										<div className="relative">
											<input
												ref={ownershipInputRef}
												type="text"
												value={schoolData.school_ownership || ownershipQuery}
												onChange={(e) => {
													setOwnershipQuery(e.target.value);
													setShowOwnershipDropdown(true);
													setOwnershipHighlightedIndex(-1);
													if (!e.target.value.trim()) {
														setShowOwnershipDropdown(false);
														handleSchoolChange('school_ownership', '');
													}
												}}
												onFocus={() => {
													if (filteredOwnershipOptions.length > 0) {
														setShowOwnershipDropdown(true);
													}
												}}
												onKeyDown={handleOwnershipKeyDown}
												placeholder="Select ownership type"
												className="w-full px-4 py-3 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none transition"
											/>
											{showOwnershipDropdown && filteredOwnershipOptions.length > 0 && (
												<div
													ref={ownershipDropdownRef}
													className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
												>
													{filteredOwnershipOptions.map((option, index) => (
														<button
															key={option}
															type="button"
															onClick={() => {
																handleSchoolChange('school_ownership', option);
																setOwnershipQuery(option);
																setShowOwnershipDropdown(false);
															}}
															onMouseEnter={() => setOwnershipHighlightedIndex(index)}
															className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
																index === ownershipHighlightedIndex ? 'bg-purple-50' : ''
															} ${schoolData.school_ownership === option ? 'bg-purple-100 font-medium' : ''}`}
														>
															<div className="text-sm font-medium text-gray-900">{option}</div>
														</button>
													))}
												</div>
											)}
										</div>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											SCHOOL PHONE *
										</label>
										<input
											type="tel"
											value={schoolData.school_phone}
											onChange={(e) => handleSchoolChange('school_phone', e.target.value)}
											onBlur={() => handleSchoolBlur('school_phone')}
											className={`w-full px-4 py-3 border rounded-[3px] focus:ring-2 focus:ring-purple-600 outline-none transition ${
												schoolTouched.school_phone && schoolErrors.school_phone
													? 'border-red-500 focus:border-red-500'
													: 'border-gray-300 focus:border-purple-600'
											}`}
											placeholder="Enter school phone number"
										/>
										{schoolTouched.school_phone && schoolErrors.school_phone && (
											<p className="mt-1 text-sm text-red-600">{schoolErrors.school_phone}</p>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											SCHOOL EMAIL *
										</label>
										<input
											type="email"
											value={schoolData.school_email}
											onChange={(e) => handleSchoolChange('school_email', e.target.value)}
											onBlur={() => handleSchoolBlur('school_email')}
											className={`w-full px-4 py-3 border rounded-[3px] focus:ring-2 focus:ring-purple-600 outline-none transition ${
												schoolTouched.school_email && schoolErrors.school_email
													? 'border-red-500 focus:border-red-500'
													: 'border-gray-300 focus:border-purple-600'
											}`}
											placeholder="Enter school email"
										/>
										{schoolTouched.school_email && schoolErrors.school_email && (
											<p className="mt-1 text-sm text-red-600">{schoolErrors.school_email}</p>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											SCHOOL LOGO
										</label>
										<input
											type="file"
											accept="image/*"
											onChange={(e) => {
												const file = e.target.files?.[0] || null;
												handleSchoolChange('school_logo', file);
												if (file) handleSchoolBlur('school_logo');
											}}
											className={`w-full px-4 py-3 border rounded-[3px] focus:ring-2 focus:ring-purple-600 outline-none transition ${
												schoolTouched.school_logo && schoolErrors.school_logo
													? 'border-red-500 focus:border-red-500'
													: 'border-gray-300 focus:border-purple-600'
											}`}
										/>
										{schoolTouched.school_logo && schoolErrors.school_logo && (
											<p className="mt-1 text-sm text-red-600">{schoolErrors.school_logo}</p>
										)}
										{schoolData.school_logo && (
											<p className="mt-1 text-sm text-gray-600">{schoolData.school_logo.name}</p>
										)}
									</div>
								</div>

								<div className="mt-8">
									<button
										type="submit"
										disabled={loading}
										className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-[3px] transition disabled:opacity-50 disabled:cursor-not-allowed"
									>
								{loading ? 'Registering...' : 'Register School'}
									</button>
								</div>

						<div className="mt-6 text-center">
							<p className="text-sm text-gray-600">
								Already have an account?{' '}
								<Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">
									Login here
							</Link>
						</p>
					</div>
					</form>
				</div>
			</div>
		</div>
	);
}

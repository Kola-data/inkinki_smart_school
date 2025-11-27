import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { validateEmail, validatePassword } from '../../utils/validation';

export default function ResetPasswordConfirm() {
	const location = useLocation();
	const navigate = useNavigate();
	const [email, setEmail] = useState((location.state as any)?.email || '');
	const [verificationCode, setVerificationCode] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [errors, setErrors] = useState<{ 
		email?: string; 
		verificationCode?: string; 
		newPassword?: string; 
		confirmPassword?: string;
	}>({});
	const [touched, setTouched] = useState<{ 
		email?: boolean; 
		verificationCode?: boolean; 
		newPassword?: boolean; 
		confirmPassword?: boolean;
	}>({});
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!email) {
			// If no email in state, redirect to request page
			navigate('/reset-password');
		}
	}, [email, navigate]);

	const validateField = (field: 'email' | 'verificationCode' | 'newPassword' | 'confirmPassword', value: string) => {
		let error: string | null = null;

		if (field === 'email') {
			error = validateEmail(value);
		} else if (field === 'verificationCode') {
			if (!value.trim()) {
				error = 'Verification code is required';
			} else if (!/^\d{6}$/.test(value)) {
				error = 'Verification code must be 6 digits';
			}
		} else if (field === 'newPassword') {
			error = validatePassword(value);
		} else if (field === 'confirmPassword') {
			if (!value.trim()) {
				error = 'Please confirm your password';
			} else if (value !== newPassword) {
				error = 'Passwords do not match';
			}
		}

		setErrors((prev) => ({ ...prev, [field]: error || undefined }));
		return !error;
	};

	const handleBlur = (field: 'email' | 'verificationCode' | 'newPassword' | 'confirmPassword') => {
		setTouched((prev) => ({ ...prev, [field]: true }));
		validateField(field, field === 'email' ? email : field === 'verificationCode' ? verificationCode : field === 'newPassword' ? newPassword : confirmPassword);
	};

	const handleChange = (field: 'email' | 'verificationCode' | 'newPassword' | 'confirmPassword', value: string) => {
		if (field === 'email') {
			setEmail(value);
			if (touched.email) {
				validateField('email', value);
			}
		} else if (field === 'verificationCode') {
			// Only allow digits and limit to 6 characters
			const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
			setVerificationCode(digitsOnly);
			if (touched.verificationCode) {
				validateField('verificationCode', digitsOnly);
			}
		} else if (field === 'newPassword') {
			setNewPassword(value);
			if (touched.newPassword) {
				validateField('newPassword', value);
			}
			// Re-validate confirm password if it's been touched
			if (touched.confirmPassword) {
				validateField('confirmPassword', confirmPassword);
			}
		} else if (field === 'confirmPassword') {
			setConfirmPassword(value);
			if (touched.confirmPassword) {
				validateField('confirmPassword', value);
			}
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate all fields
		const isEmailValid = validateField('email', email);
		const isCodeValid = validateField('verificationCode', verificationCode);
		const isPasswordValid = validateField('newPassword', newPassword);
		const isConfirmValid = validateField('confirmPassword', confirmPassword);
		
		setTouched({ email: true, verificationCode: true, newPassword: true, confirmPassword: true });

		if (!isEmailValid || !isCodeValid || !isPasswordValid || !isConfirmValid) {
			return;
		}

		try {
			setLoading(true);
			await api.post('/auth/reset-password/confirm', {
				email,
				verification_code: verificationCode,
				new_password: newPassword
			});
			toast.success('Password reset successfully! You can now login with your new password.');
			navigate('/login');
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || 'Failed to reset password. Please check your verification code.';
			toast.error(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex">
			{/* Left Panel - Decorative */}
			<div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 to-indigo-700 relative overflow-hidden">
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="text-center text-white px-12">
						<h1 className="text-4xl font-bold mb-4">Inkinki Smart School</h1>
						<p className="text-xl opacity-90">Enter Verification Code</p>
					</div>
				</div>
				<div className="absolute inset-0 opacity-10">
					<div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full"></div>
					<div className="absolute top-40 right-32 w-24 h-24 bg-white rounded-full"></div>
					<div className="absolute bottom-32 left-32 w-12 h-12 bg-white rounded-full"></div>
					<div className="absolute bottom-20 right-20 w-20 h-20 bg-white rounded-full"></div>
				</div>
			</div>

			{/* Right Panel - Reset Password Form */}
			<div className="flex-1 flex items-center justify-center bg-white p-8">
				<div className="w-full max-w-md">
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
						<p className="text-gray-600">Enter the verification code sent to your email</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-6">
						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
								EMAIL
							</label>
							<input
								id="email"
								type="email"
								value={email}
								onChange={(e) => handleChange('email', e.target.value)}
								onBlur={() => handleBlur('email')}
								className={`w-full px-4 py-3 border rounded-[3px] focus:ring-2 focus:ring-purple-600 outline-none transition ${
									touched.email && errors.email
										? 'border-red-500 focus:border-red-500'
										: 'border-gray-300 focus:border-transparent'
								}`}
								placeholder="Enter your email"
								disabled={!!(location.state as any)?.email}
							/>
							{touched.email && errors.email && (
								<p className="mt-1 text-sm text-red-600">{errors.email}</p>
							)}
						</div>

						<div>
							<label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
								VERIFICATION CODE
							</label>
							<input
								id="verificationCode"
								type="text"
								value={verificationCode}
								onChange={(e) => handleChange('verificationCode', e.target.value)}
								onBlur={() => handleBlur('verificationCode')}
								className={`w-full px-4 py-3 border rounded-[3px] focus:ring-2 focus:ring-purple-600 outline-none transition text-center text-2xl font-mono tracking-widest ${
									touched.verificationCode && errors.verificationCode
										? 'border-red-500 focus:border-red-500'
										: 'border-gray-300 focus:border-transparent'
								}`}
								placeholder="000000"
								maxLength={6}
							/>
							{touched.verificationCode && errors.verificationCode && (
								<p className="mt-1 text-sm text-red-600">{errors.verificationCode}</p>
							)}
							<p className="mt-1 text-xs text-gray-500">Enter the 6-digit code from your email</p>
						</div>

						<div>
							<label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
								NEW PASSWORD
							</label>
							<input
								id="newPassword"
								type="password"
								value={newPassword}
								onChange={(e) => handleChange('newPassword', e.target.value)}
								onBlur={() => handleBlur('newPassword')}
								className={`w-full px-4 py-3 border rounded-[3px] focus:ring-2 focus:ring-purple-600 outline-none transition ${
									touched.newPassword && errors.newPassword
										? 'border-red-500 focus:border-red-500'
										: 'border-gray-300 focus:border-transparent'
								}`}
								placeholder="Enter new password"
							/>
							{touched.newPassword && errors.newPassword && (
								<p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
							)}
						</div>

						<div>
							<label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
								CONFIRM PASSWORD
							</label>
							<input
								id="confirmPassword"
								type="password"
								value={confirmPassword}
								onChange={(e) => handleChange('confirmPassword', e.target.value)}
								onBlur={() => handleBlur('confirmPassword')}
								className={`w-full px-4 py-3 border rounded-[3px] focus:ring-2 focus:ring-purple-600 outline-none transition ${
									touched.confirmPassword && errors.confirmPassword
										? 'border-red-500 focus:border-red-500'
										: 'border-gray-300 focus:border-transparent'
								}`}
								placeholder="Confirm new password"
							/>
							{touched.confirmPassword && errors.confirmPassword && (
								<p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
							)}
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-[3px] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
						>
							{loading ? (
								<>
									<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Resetting...
								</>
							) : (
								'Reset Password'
							)}
						</button>
					</form>

					<div className="mt-6 text-center space-y-2">
						<div>
							<Link to="/reset-password" className="text-purple-600 hover:text-purple-700 font-semibold text-sm">
								Resend Code
							</Link>
						</div>
						<div>
							<Link to="/login" className="text-purple-600 hover:text-purple-700 font-semibold text-sm">
								Back to Login
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}


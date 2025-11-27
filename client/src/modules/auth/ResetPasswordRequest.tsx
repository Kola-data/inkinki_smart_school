import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { validateEmail } from '../../utils/validation';

export default function ResetPasswordRequest() {
	const [email, setEmail] = useState('');
	const [errors, setErrors] = useState<{ email?: string }>({});
	const [touched, setTouched] = useState<{ email?: boolean }>({});
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const validateField = (field: 'email', value: string) => {
		let error: string | null = null;

		if (field === 'email') {
			error = validateEmail(value);
		}

		setErrors((prev) => ({ ...prev, [field]: error || undefined }));
		return !error;
	};

	const handleBlur = (field: 'email') => {
		setTouched((prev) => ({ ...prev, [field]: true }));
		if (field === 'email') {
			validateField('email', email);
		}
	};

	const handleChange = (field: 'email', value: string) => {
		if (field === 'email') {
			setEmail(value);
			if (touched.email) {
				validateField('email', value);
			}
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate all fields
		const isEmailValid = validateField('email', email);
		setTouched({ email: true });

		if (!isEmailValid) {
			return;
		}

		try {
			setLoading(true);
			await api.post('/auth/reset-password', { email });
			toast.success('Password reset code has been sent to your email');
			// Navigate to reset password confirm page
			navigate('/reset-password/confirm', { state: { email } });
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || 'Failed to send reset code';
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
						<p className="text-xl opacity-90">Reset Your Password</p>
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
						<p className="text-gray-600">Enter your email to receive a verification code</p>
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
							/>
							{touched.email && errors.email && (
								<p className="mt-1 text-sm text-red-600">{errors.email}</p>
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
									Sending...
								</>
							) : (
								'Send Verification Code'
							)}
						</button>
					</form>

					<div className="mt-6 text-center">
						<Link to="/login" className="text-purple-600 hover:text-purple-700 font-semibold text-sm">
							Back to Login
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}


import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { validateEmail, validatePassword } from '../../utils/validation';

export default function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
	const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const validateField = (field: 'email' | 'password', value: string) => {
		let error: string | null = null;

		if (field === 'email') {
			error = validateEmail(value);
		} else if (field === 'password') {
			error = validatePassword(value);
		}

		setErrors((prev) => ({ ...prev, [field]: error || undefined }));
		return !error;
	};

	const handleBlur = (field: 'email' | 'password') => {
		setTouched((prev) => ({ ...prev, [field]: true }));
		if (field === 'email') {
			validateField('email', email);
		} else if (field === 'password') {
			validateField('password', password);
		}
	};

	const handleChange = (field: 'email' | 'password', value: string) => {
		if (field === 'email') {
			setEmail(value);
			if (touched.email) {
				validateField('email', value);
			}
		} else if (field === 'password') {
			setPassword(value);
			if (touched.password) {
				validateField('password', value);
			}
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		e.stopPropagation();
		
		// Mark all fields as touched
		setTouched({ email: true, password: true });

		// Validate all fields
		const isEmailValid = validateField('email', email);
		const isPasswordValid = validateField('password', password);

		if (!isEmailValid || !isPasswordValid) {
			toast.error('Please fix the errors in the form', {
				duration: 3000,
				position: 'top-right',
			});
			return;
		}

		setLoading(true);

		try {
			const { data } = await api.post('/auth/login', { email, password });
			
			// Store authentication data
			localStorage.setItem('token', data.access_token);
			localStorage.setItem('staff', JSON.stringify({
				staff_id: data.staff_id,
				staff_name: data.staff_name,
				email: data.email,
				school_id: data.school_id,
				staff_profile: data.staff_profile || null,
			}));
			
			// Show success message
			toast.success(`Welcome back, ${data.staff_name}!`, {
				duration: 3000,
				position: 'top-right',
			});
			
			// Clear form data on success
			setEmail('');
			setPassword('');
			setErrors({});
			setTouched({});
			
			// Navigate after a short delay to ensure toast is visible
			setTimeout(() => {
				navigate('/dashboard');
			}, 1000);
		} catch (err: any) {
			console.error('Login error:', err);
			console.error('Error response:', err.response);
			
			// Determine error message with more detailed handling
			let errorMessage = 'Login failed. Please try again.';
			
			if (err.response) {
				// Server responded with error
				if (err.response.data?.detail) {
					errorMessage = err.response.data.detail;
				} else if (err.response.status === 401) {
					errorMessage = 'Invalid email or password. Please check your credentials.';
				} else if (err.response.status === 403) {
					errorMessage = 'Access denied. Your account may be inactive or your school may be inactive.';
				} else if (err.response.status === 500) {
					errorMessage = 'Server error. Please try again later.';
				} else {
					errorMessage = `Login failed (${err.response.status}). Please try again.`;
				}
			} else if (err.request) {
				// Request made but no response
				errorMessage = 'No response from server. Please check your connection.';
			} else if (err.message) {
				errorMessage = err.message;
			}
			
			// Show error toast immediately with explicit styling
			toast.error(errorMessage, {
				duration: 5000,
				position: 'top-right',
				style: {
					background: '#ef4444',
					color: '#fff',
					borderRadius: '3px',
					padding: '12px 16px',
					fontSize: '14px',
					fontWeight: '500',
					zIndex: 9999,
				},
				id: `login-error-${Date.now()}`, // Unique ID to ensure it shows
			});
			
			// Keep form data - don't clear email and password on error
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
						{/* Person */}
						<div className="w-80 h-96 flex items-end justify-center">
							{/* Chair */}
							<div className="absolute bottom-20 w-32 h-32 bg-gray-300 rounded-t-lg transform -rotate-12"></div>
							
							{/* Person */}
							<div className="relative z-10">
								{/* Head */}
								<div className="w-20 h-20 bg-gray-800 rounded-full mx-auto mb-2"></div>
								
								{/* Body */}
								<div className="w-32 h-40 bg-coral-500 rounded-t-2xl relative shadow-md">
									{/* Ponytail */}
									<div className="absolute -top-2 -right-4 w-8 h-16 bg-gray-800 rounded-full transform rotate-12"></div>
								</div>
								
								{/* Legs */}
								<div className="flex gap-4 justify-center mt-2">
									<div className="w-10 h-16 bg-blue-600 rounded-[3px]"></div>
									<div className="w-10 h-16 bg-blue-600 rounded-[3px]"></div>
								</div>
							</div>
							
							{/* Laptop */}
							<div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 translate-y-8">
								<div className="w-40 h-28 bg-gray-200 rounded-[3px] shadow-lg">
									<div className="w-full h-1 bg-gray-400 mt-2"></div>
									<div className="w-3/4 h-1 bg-gray-300 mx-auto mt-2"></div>
								</div>
							</div>
						</div>
					</div>
					
					{/* Decorative Shapes */}
					<div className="absolute top-20 left-20 w-16 h-16 bg-red-500 transform rotate-45 opacity-60"></div>
					<div className="absolute top-40 right-32 w-8 h-8 bg-red-500 transform rotate-45 opacity-60"></div>
					<div className="absolute bottom-32 left-32 w-12 h-12 bg-blue-300 rounded-full opacity-60"></div>
					<div className="absolute bottom-20 right-20 w-20 h-20 bg-blue-300 rounded-full opacity-60"></div>
				</div>
			</div>

			{/* Right Panel - Login Form */}
			<div className="flex-1 flex items-center justify-center bg-white p-8">
				<div className="w-full max-w-md">
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
						<p className="text-gray-600">Sign in to your account</p>
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

						<div>
							<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
								PASSWORD
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => handleChange('password', e.target.value)}
								onBlur={() => handleBlur('password')}
								className={`w-full px-4 py-3 border rounded-[3px] focus:ring-2 focus:ring-purple-600 outline-none transition ${
									touched.password && errors.password
										? 'border-red-500 focus:border-red-500'
										: 'border-gray-300 focus:border-transparent'
								}`}
								placeholder="Enter your password"
							/>
							{touched.password && errors.password && (
								<p className="mt-1 text-sm text-red-600">{errors.password}</p>
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
									Signing in...
								</>
							) : (
								'Sign In'
							)}
						</button>
					</form>

					<div className="mt-6 text-center">
						<p className="text-gray-600">
							Don't have an account?{' '}
							<Link to="/register" className="text-purple-600 hover:text-purple-700 font-semibold">
								Sign Up
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}


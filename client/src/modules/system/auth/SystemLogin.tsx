import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';

export default function SystemLogin() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	// Redirect if already logged in (use useEffect to avoid render warning)
	useEffect(() => {
		const systemToken = localStorage.getItem('system_token');
		if (systemToken) {
			navigate('/system/dashboard', { replace: true });
		}
	}, [navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const { data } = await api.post('/system-auth/login', { username, password });
			
			// Store system user data
			localStorage.setItem('system_token', data.access_token);
			localStorage.setItem('system_user', JSON.stringify({
				user_id: data.user_id,
				username: data.username,
				full_name: data.full_name,
				email: data.email,
				role: data.role,
				account_status: data.account_status
			}));
			
			toast.success(`Welcome, ${data.full_name}!`, {
				duration: 3000,
				position: 'top-right',
			});
			
			setTimeout(() => {
				navigate('/system/dashboard');
			}, 1000);
		} catch (err: any) {
			const errorMessage = err.response?.data?.detail || 'Login failed. Please try again.';
			toast.error(errorMessage, {
				duration: 4000,
				position: 'top-right',
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				{/* Logo/Header */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
						<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
						</svg>
					</div>
					<h1 className="text-3xl font-bold text-gray-900">System Management</h1>
					<p className="text-gray-600 mt-2">Inkingi Smart School</p>
				</div>

				{/* Login Card */}
				<div className="bg-white rounded-[3px] shadow-xl p-8 border border-gray-100">
					<form onSubmit={handleSubmit} className="space-y-6">
						<div>
							<label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
								Username
							</label>
							<input
								id="username"
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
								className="w-full px-4 py-3 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
								placeholder="Enter your username"
								disabled={loading}
							/>
						</div>

						<div>
							<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
								Password
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="w-full px-4 py-3 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
								placeholder="Enter your password"
								disabled={loading}
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-indigo-600 text-white py-3 rounded-[3px] font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? 'Signing in...' : 'Sign In'}
						</button>
					</form>

					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600">
							School Management?{' '}
							<a href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
								Go to School Login
							</a>
						</p>
					</div>
				</div>

				{/* Footer */}
				<p className="text-center text-sm text-gray-500 mt-6">
					© 2025 Inkingi Smart School. All rights reserved.
				</p>
			</div>
		</div>
	);
}


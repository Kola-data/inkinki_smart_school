import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const api = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Add request interceptor to include auth token
api.interceptors.request.use(
	(config) => {
		// Check if this is a system route
		// System routes include: /system-*, /payment-seasons/*, /school-payment-records/*
		const isSystemRoute = config.url?.includes('/system-') || config.url?.includes('/payment-seasons') || config.url?.includes('/school-payment-records');
		// Also check if we're on a system dashboard page
		const currentPath = window.location.pathname;
		const isSystemDashboard = currentPath.startsWith('/system/dashboard');
		
		const token = (isSystemRoute || isSystemDashboard)
			? localStorage.getItem('system_token')
			: localStorage.getItem('token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Track if we've already shown a redirect to prevent multiple redirects
let isRedirecting = false;

// Add response interceptor for error handling
api.interceptors.response.use(
	(response) => response,
	(error) => {
		// Don't redirect on validation errors (422) or other non-auth errors
		// Only redirect on 401 (Unauthorized), not 403 (Forbidden)
		// 403 means authenticated but not authorized - don't redirect
		// 422 is validation error - don't redirect
		if (error.response?.status === 401) {
			// Prevent multiple redirects
			if (isRedirecting) {
				return Promise.reject(error);
			}
			
			const currentPath = window.location.pathname;
			const isSystemRoute = currentPath.startsWith('/system');
			
			// Get the appropriate token
			const token = isSystemRoute 
				? localStorage.getItem('system_token')
				: localStorage.getItem('token');
			
			// Check if this is a login/register attempt
			const requestUrl = error.config?.url || '';
			const isLoginAttempt = requestUrl.includes('/login') || 
								   requestUrl.includes('/register') ||
								   requestUrl.includes('/system-auth/login') ||
								   requestUrl.includes('/auth/login');
			
			// Only redirect if:
			// 1. We have a token (meaning we were authenticated before)
			// 2. We're not on a login/register page
			// 3. The error is not from a login attempt
			// 4. The error message clearly indicates token expiration/invalidation
			if (token && !isLoginAttempt && currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/system/login') {
				const errorDetail = error.response?.data?.detail || '';
				const errorMessage = errorDetail.toLowerCase();
				
				// Log the error for debugging
				console.warn('[API Interceptor] 401 Error:', {
					url: requestUrl,
					detail: errorDetail,
					path: currentPath,
					hasToken: !!token
				});
				
				// Only redirect for clear authentication failures
				const isClearAuthError = 
					errorMessage.includes('expired') ||
					errorMessage.includes('invalid authentication') ||
					errorMessage.includes('invalid token') ||
					errorMessage.includes('token may be expired') ||
					errorMessage.includes('authentication credentials') ||
					errorMessage.includes('not authenticated') ||
					errorMessage.includes('token is required') ||
					errorMessage.includes('invalid authentication credentials');
				
				if (isClearAuthError) {
					console.warn('[API Interceptor] Redirecting to login due to authentication failure');
					isRedirecting = true;
					
					// Clear tokens and redirect
					if (isSystemRoute) {
						localStorage.removeItem('system_token');
						localStorage.removeItem('system_user');
						setTimeout(() => {
							window.location.href = '/system/login';
						}, 100);
					} else {
						localStorage.removeItem('token');
						localStorage.removeItem('staff');
						setTimeout(() => {
							window.location.href = '/login';
						}, 100);
					}
					
					// Reset redirect flag after a delay
					setTimeout(() => {
						isRedirecting = false;
					}, 2000);
					
					return Promise.reject(error);
				} else {
					// Not a clear auth error - log but don't redirect
					console.warn('[API Interceptor] 401 error but not redirecting - letting component handle:', errorDetail);
				}
			} else {
				// No token or login attempt - don't redirect
				if (!token) {
					console.warn('[API Interceptor] 401 error but no token - not redirecting');
				}
			}
			// If it's not a clear auth error, don't redirect - let the component handle it
		}
		// For 403 and other errors, just reject without redirecting
		return Promise.reject(error);
	}
);

export default api;


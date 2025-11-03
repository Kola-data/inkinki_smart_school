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
		const token = localStorage.getItem('token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Add response interceptor for error handling
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			// Only redirect if not already on login page
			const currentPath = window.location.pathname;
			if (currentPath !== '/login' && currentPath !== '/register') {
				// Token expired or invalid - redirect to login
				localStorage.removeItem('token');
				localStorage.removeItem('staff');
				window.location.href = '/login';
			}
			// If on login page, let the login component handle the error
		}
		return Promise.reject(error);
	}
);

export default api;


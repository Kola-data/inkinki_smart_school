export interface ValidationError {
	field: string;
	message: string;
}

export const validateEmail = (email: string): string | null => {
	if (!email) {
		return 'Email is required';
	}
	
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return 'Please enter a valid email address';
	}
	
	return null;
};

export const validatePassword = (password: string, minLength: number = 6): string | null => {
	if (!password) {
		return 'Password is required';
	}
	
	if (password.length < minLength) {
		return `Password must be at least ${minLength} characters long`;
	}
	
	// Check for at least one letter and one number
	const hasLetter = /[a-zA-Z]/.test(password);
	const hasNumber = /[0-9]/.test(password);
	
	if (!hasLetter || !hasNumber) {
		return 'Password must contain at least one letter and one number';
	}
	
	return null;
};

export const validateRequired = (value: string, fieldName: string): string | null => {
	if (!value || value.trim() === '') {
		return `${fieldName} is required`;
	}
	return null;
};

export const validatePhone = (phone: string): string | null => {
	if (!phone) {
		return 'Phone number is required';
	}
	
	// Basic phone validation (allows numbers, spaces, hyphens, parentheses, plus sign)
	const phoneRegex = /^[\d\s\-\+\(\)]+$/;
	if (!phoneRegex.test(phone)) {
		return 'Please enter a valid phone number';
	}
	
	// Remove all non-digit characters for length check
	const digitsOnly = phone.replace(/\D/g, '');
	if (digitsOnly.length < 10) {
		return 'Phone number must be at least 10 digits';
	}
	
	return null;
};

export const validateWebsite = (website: string): string | null => {
	if (!website || website.trim() === '') {
		return null; // Website is optional
	}
	
	// Basic URL validation (allows www. prefix or http/https)
	const websiteRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
	if (!websiteRegex.test(website)) {
		return 'Please enter a valid website URL';
	}
	
	return null;
};

export const validateName = (name: string): string | null => {
	if (!name || name.trim() === '') {
		return 'Name is required';
	}
	
	if (name.trim().length < 2) {
		return 'Name must be at least 2 characters long';
	}
	
	// Allow letters, spaces, hyphens, apostrophes
	const nameRegex = /^[a-zA-Z\s\-']+$/;
	if (!nameRegex.test(name)) {
		return 'Name can only contain letters, spaces, hyphens, and apostrophes';
	}
	
	return null;
};


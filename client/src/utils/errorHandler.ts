/**
 * Utility function to handle API errors consistently across the application
 * @param error - The error object from axios
 * @param defaultMessage - Default error message if no specific error is found
 * @returns Formatted error message string
 */
export function handleApiError(error: any, defaultMessage: string = 'An error occurred'): string {
	// Log error for debugging
	console.error('API Error:', error);
	
	// Check if it's a validation error (422)
	if (error.response?.status === 422) {
		const errorDetail = error.response?.data?.detail;
		if (Array.isArray(errorDetail)) {
			// Validation errors from Pydantic
			const errorMessages = errorDetail.map((err: any) => {
				const field = err.loc?.join('.') || 'field';
				return `${field}: ${err.msg}`;
			}).join(', ');
			return errorMessages || 'Validation error';
		}
	}
	
	// Check for standard error response
	const errorDetail = error.response?.data?.detail;
	if (errorDetail) {
		if (Array.isArray(errorDetail)) {
			// Array of errors
			const errorMessages = errorDetail.map((err: any) => {
				if (typeof err === 'string') return err;
				const field = err.loc?.join('.') || 'field';
				return `${field}: ${err.msg || err}`;
			}).join(', ');
			return errorMessages || 'Validation error';
		}
		// Single error message
		return errorDetail;
	}
	
	// Check for error message
	if (error.message) {
		return error.message;
	}
	
	// Return default message
	return defaultMessage;
}


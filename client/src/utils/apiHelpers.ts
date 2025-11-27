/**
 * Helper function to extract array from paginated or direct API response
 * @param data - The response data from API
 * @returns Array of items
 */
export function getArrayFromResponse(data: any): any[] {
	if (!data) return [];
	if (Array.isArray(data)) return data;
	if (data.items && Array.isArray(data.items)) return data.items;
	return [];
}

/**
 * Helper function to extract pagination info from API response
 * @param data - The response data from API
 * @returns Object with pagination info or null if not paginated
 */
export function getPaginationFromResponse(data: any): { total: number; page: number; page_size: number; total_pages: number } | null {
	if (!data || Array.isArray(data)) return null;
	if (data.items && typeof data.total === 'number') {
		return {
			total: data.total || 0,
			page: data.page || 1,
			page_size: data.page_size || 0,
			total_pages: data.total_pages || 0,
		};
	}
	return null;
}



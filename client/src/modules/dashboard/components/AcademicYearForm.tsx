import { useState, useEffect } from 'react';

interface AcademicYearMember {
	academic_id?: string;
	academic_name: string;
	start_date: string;
	end_date: string;
	is_current: boolean;
}

interface AcademicYearFormProps {
	academicYear?: AcademicYearMember | null;
	onSubmit: (data: Partial<AcademicYearMember>) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
}

export default function AcademicYearForm({ academicYear, onSubmit, onCancel, loading = false, mode }: AcademicYearFormProps) {
	const [formData, setFormData] = useState<Partial<AcademicYearMember>>({
		academic_name: '',
		start_date: '',
		end_date: '',
		is_current: false,
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (academicYear && mode === 'edit') {
			setFormData({
				academic_name: academicYear.academic_name || '',
				start_date: academicYear.start_date || '',
				end_date: academicYear.end_date || '',
				is_current: academicYear.is_current ?? false,
			});
			setErrors({});
		}
		if (mode === 'create') {
			setFormData({
				academic_name: '',
				start_date: '',
				end_date: '',
				is_current: false,
			});
			setErrors({});
		}
	}, [academicYear, mode]);

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.academic_name?.trim()) {
			newErrors.academic_name = 'Academic year name is required';
		}

		if (!formData.start_date) {
			newErrors.start_date = 'Start date is required';
		}

		if (!formData.end_date) {
			newErrors.end_date = 'End date is required';
		}

		if (formData.start_date && formData.end_date) {
			const start = new Date(formData.start_date);
			const end = new Date(formData.end_date);
			
			if (start >= end) {
				newErrors.end_date = 'End date must be after start date';
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (validate()) {
			await onSubmit(formData);
		}
	};

	const handleChange = (field: keyof AcademicYearMember, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Academic Year Name */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Academic Year Name <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					value={formData.academic_name || ''}
					onChange={(e) => handleChange('academic_name', e.target.value)}
					className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
						errors.academic_name ? 'border-red-500' : 'border-gray-300'
					}`}
					placeholder="e.g., 2024-2025"
				/>
				{errors.academic_name && (
					<p className="mt-1 text-sm text-red-600">{errors.academic_name}</p>
				)}
			</div>

			{/* Start Date */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Start Date <span className="text-red-500">*</span>
				</label>
				<input
					type="date"
					value={formData.start_date || ''}
					onChange={(e) => handleChange('start_date', e.target.value)}
					className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
						errors.start_date ? 'border-red-500' : 'border-gray-300'
					}`}
				/>
				{errors.start_date && (
					<p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
				)}
			</div>

			{/* End Date */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					End Date <span className="text-red-500">*</span>
				</label>
				<input
					type="date"
					value={formData.end_date || ''}
					onChange={(e) => handleChange('end_date', e.target.value)}
					className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
						errors.end_date ? 'border-red-500' : 'border-gray-300'
					}`}
				/>
				{errors.end_date && (
					<p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
				)}
			</div>

			{/* Is Current */}
			<div className="flex items-center">
				<input
					type="checkbox"
					id="is_current"
					checked={formData.is_current || false}
					onChange={(e) => handleChange('is_current', e.target.checked)}
					className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded-[3px]"
				/>
				<label htmlFor="is_current" className="ml-2 block text-sm text-gray-700">
					Set as current academic year
				</label>
			</div>

			{/* Form Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[3px] hover:bg-gray-50 transition-colors"
					disabled={loading}
				>
					Cancel
				</button>
				<button
					type="submit"
					className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-[3px] hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={loading}
				>
					{loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
				</button>
			</div>
		</form>
	);
}



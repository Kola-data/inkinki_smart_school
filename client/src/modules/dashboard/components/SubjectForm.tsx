import { useState, useEffect } from 'react';

interface SubjectMember {
	subj_id?: string;
	subj_name: string;
	subj_desc: string | null;
}

interface SubjectFormProps {
	subject?: SubjectMember | null;
	onSubmit: (data: Partial<SubjectMember>) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
}

export default function SubjectForm({ subject, onSubmit, onCancel, loading = false, mode }: SubjectFormProps) {
	const [formData, setFormData] = useState<Partial<SubjectMember>>({
		subj_name: '',
		subj_desc: '',
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (subject && mode === 'edit') {
			setFormData({
				subj_name: subject.subj_name || '',
				subj_desc: subject.subj_desc || '',
			});
			setErrors({});
		}
		if (mode === 'create') {
			setFormData({
				subj_name: '',
				subj_desc: '',
			});
			setErrors({});
		}
	}, [subject, mode]);

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.subj_name?.trim()) {
			newErrors.subj_name = 'Subject name is required';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (validate()) {
			const submitData: any = { ...formData };
			// Convert empty string to null for description
			if (submitData.subj_desc === '') {
				submitData.subj_desc = null;
			}
			await onSubmit(submitData);
		}
	};

	const handleChange = (field: keyof SubjectMember, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Subject Name */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Subject Name <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					value={formData.subj_name || ''}
					onChange={(e) => handleChange('subj_name', e.target.value)}
					className={`w-full px-3 py-2 border rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 ${
						errors.subj_name ? 'border-red-500' : 'border-gray-300'
					}`}
					placeholder="e.g., Mathematics, English, Science"
				/>
				{errors.subj_name && (
					<p className="mt-1 text-sm text-red-600">{errors.subj_name}</p>
				)}
			</div>

			{/* Subject Description */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Description
				</label>
				<textarea
					value={formData.subj_desc || ''}
					onChange={(e) => handleChange('subj_desc', e.target.value)}
					rows={4}
					className="w-full px-3 py-2 border border-gray-300 rounded-[3px] focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
					placeholder="Optional description of the subject..."
				/>
				<p className="mt-1 text-xs text-gray-500">Provide additional details about this subject (optional)</p>
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


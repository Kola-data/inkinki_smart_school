import { useState, useEffect, useRef } from 'react';

interface ClassTeacherMember {
	id?: string;
	teacher_id: string;
	subj_id: string;
	cls_id: string;
	start_date: string;
	end_date: string;
}

interface ClassOption {
	cls_id: string;
	cls_name: string;
	cls_type: string | null;
}

interface TeacherOption {
	teacher_id: string;
	staff_name: string | null;
	email: string | null;
	specialized: string | null;
}

interface SubjectOption {
	subj_id: string;
	subj_name: string;
}

interface ClassTeacherFormProps {
	assignment?: ClassTeacherMember | null;
	availableClasses: ClassOption[];
	availableTeachers: TeacherOption[];
	availableSubjects: SubjectOption[];
	onSubmit: (data: Partial<ClassTeacherMember>) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
}

export default function ClassTeacherForm({
	assignment,
	availableClasses,
	availableTeachers,
	availableSubjects,
	onSubmit,
	onCancel,
	loading = false,
	mode,
}: ClassTeacherFormProps) {
	const [formData, setFormData] = useState<Partial<ClassTeacherMember>>({
		teacher_id: '',
		subj_id: '',
		cls_id: '',
		start_date: '',
		end_date: '',
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	
	// Autocomplete states for each field
	const [classSearchQuery, setClassSearchQuery] = useState('');
	const [showClassDropdown, setShowClassDropdown] = useState(false);
	const [classHighlightedIndex, setClassHighlightedIndex] = useState(-1);
	const classDropdownRef = useRef<HTMLDivElement>(null);
	const classInputRef = useRef<HTMLInputElement>(null);

	const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
	const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
	const [teacherHighlightedIndex, setTeacherHighlightedIndex] = useState(-1);
	const teacherDropdownRef = useRef<HTMLDivElement>(null);
	const teacherInputRef = useRef<HTMLInputElement>(null);

	const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
	const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
	const [subjectHighlightedIndex, setSubjectHighlightedIndex] = useState(-1);
	const subjectDropdownRef = useRef<HTMLDivElement>(null);
	const subjectInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (assignment && mode === 'edit') {
			setFormData({
				teacher_id: assignment.teacher_id || '',
				subj_id: assignment.subj_id || '',
				cls_id: assignment.cls_id || '',
				start_date: assignment.start_date || '',
				end_date: assignment.end_date || '',
			});
			setErrors({});
		}
		if (mode === 'create') {
			setClassSearchQuery('');
			setTeacherSearchQuery('');
			setSubjectSearchQuery('');
			setFormData({
				teacher_id: '',
				subj_id: '',
				cls_id: '',
				start_date: '',
				end_date: '',
			});
			setErrors({});
		}
	}, [assignment, mode]);

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.teacher_id?.trim()) {
			newErrors.teacher_id = 'Teacher is required';
		}

		if (!formData.subj_id?.trim()) {
			newErrors.subj_id = 'Subject is required';
		}

		if (!formData.cls_id?.trim()) {
			newErrors.cls_id = 'Class is required';
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

	// Filter options based on search queries
	const filteredClasses = availableClasses.filter((cls) => {
		if (!classSearchQuery.trim()) return true;
		const query = classSearchQuery.toLowerCase();
		return (
			cls.cls_name.toLowerCase().includes(query) ||
			(cls.cls_type && cls.cls_type.toLowerCase().includes(query))
		);
	});

	const filteredTeachers = availableTeachers.filter((teacher) => {
		if (!teacherSearchQuery.trim()) return true;
		const query = teacherSearchQuery.toLowerCase();
		return (
			(teacher.staff_name && teacher.staff_name.toLowerCase().includes(query)) ||
			(teacher.email && teacher.email.toLowerCase().includes(query)) ||
			(teacher.specialized && teacher.specialized.toLowerCase().includes(query))
		);
	});

	const filteredSubjects = availableSubjects.filter((subject) => {
		if (!subjectSearchQuery.trim()) return true;
		const query = subjectSearchQuery.toLowerCase();
		return subject.subj_name.toLowerCase().includes(query);
	});

	// Get selected options
	const selectedClass = availableClasses.find((c) => c.cls_id === formData.cls_id);
	const selectedTeacher = availableTeachers.find((t) => t.teacher_id === formData.teacher_id);
	const selectedSubject = availableSubjects.find((s) => s.subj_id === formData.subj_id);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				classDropdownRef.current &&
				!classDropdownRef.current.contains(event.target as Node) &&
				classInputRef.current &&
				!classInputRef.current.contains(event.target as Node)
			) {
				setShowClassDropdown(false);
			}
			if (
				teacherDropdownRef.current &&
				!teacherDropdownRef.current.contains(event.target as Node) &&
				teacherInputRef.current &&
				!teacherInputRef.current.contains(event.target as Node)
			) {
				setShowTeacherDropdown(false);
			}
			if (
				subjectDropdownRef.current &&
				!subjectDropdownRef.current.contains(event.target as Node) &&
				subjectInputRef.current &&
				!subjectInputRef.current.contains(event.target as Node)
			) {
				setShowSubjectDropdown(false);
			}
		};

		if (showClassDropdown || showTeacherDropdown || showSubjectDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showClassDropdown, showTeacherDropdown, showSubjectDropdown]);

	// Keyboard navigation handlers
	const handleClassKeyDown = (e: React.KeyboardEvent) => {
		if (!showClassDropdown || filteredClasses.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setClassHighlightedIndex((prev) => (prev < filteredClasses.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setClassHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (classHighlightedIndex >= 0 && classHighlightedIndex < filteredClasses.length) {
					handleSelectClass(filteredClasses[classHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowClassDropdown(false);
				setClassHighlightedIndex(-1);
				break;
		}
	};

	const handleTeacherKeyDown = (e: React.KeyboardEvent) => {
		if (!showTeacherDropdown || filteredTeachers.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setTeacherHighlightedIndex((prev) => (prev < filteredTeachers.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setTeacherHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (teacherHighlightedIndex >= 0 && teacherHighlightedIndex < filteredTeachers.length) {
					handleSelectTeacher(filteredTeachers[teacherHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowTeacherDropdown(false);
				setTeacherHighlightedIndex(-1);
				break;
		}
	};

	const handleSubjectKeyDown = (e: React.KeyboardEvent) => {
		if (!showSubjectDropdown || filteredSubjects.length === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setSubjectHighlightedIndex((prev) => (prev < filteredSubjects.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setSubjectHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (subjectHighlightedIndex >= 0 && subjectHighlightedIndex < filteredSubjects.length) {
					handleSelectSubject(filteredSubjects[subjectHighlightedIndex]);
				}
				break;
			case 'Escape':
				setShowSubjectDropdown(false);
				setSubjectHighlightedIndex(-1);
				break;
		}
	};

	// Selection handlers
	const handleSelectClass = (cls: ClassOption) => {
		handleChange('cls_id', cls.cls_id);
		setClassSearchQuery(cls.cls_name + (cls.cls_type ? ` (${cls.cls_type})` : ''));
		setShowClassDropdown(false);
		setClassHighlightedIndex(-1);
	};

	const handleSelectTeacher = (teacher: TeacherOption) => {
		handleChange('teacher_id', teacher.teacher_id);
		setTeacherSearchQuery(teacher.staff_name || teacher.email || '');
		setShowTeacherDropdown(false);
		setTeacherHighlightedIndex(-1);
	};

	const handleSelectSubject = (subject: SubjectOption) => {
		handleChange('subj_id', subject.subj_id);
		setSubjectSearchQuery(subject.subj_name);
		setShowSubjectDropdown(false);
		setSubjectHighlightedIndex(-1);
	};

	const handleChange = (field: keyof ClassTeacherMember, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Class Selection */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Class <span className="text-red-500">*</span>
				</label>
				{mode === 'create' ? (
					<div className="relative">
						<input
							ref={classInputRef}
							type="text"
							value={selectedClass ? selectedClass.cls_name + (selectedClass.cls_type ? ` (${selectedClass.cls_type})` : '') : classSearchQuery}
							onChange={(e) => {
								setClassSearchQuery(e.target.value);
								setShowClassDropdown(true);
								setClassHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowClassDropdown(false);
									handleChange('cls_id', '');
								}
							}}
							onFocus={() => {
								if (filteredClasses.length > 0) {
									setShowClassDropdown(true);
								}
							}}
							onKeyDown={handleClassKeyDown}
							placeholder="Search class by name or type..."
							disabled={loading || availableClasses.length === 0}
							className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
								errors.cls_id ? 'border-red-500' : 'border-gray-300'
							} disabled:bg-gray-100 disabled:cursor-not-allowed`}
						/>
						{showClassDropdown && filteredClasses.length > 0 && (
							<div
								ref={classDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredClasses.map((cls, index) => (
									<button
										key={cls.cls_id}
										type="button"
										onClick={() => handleSelectClass(cls)}
										onMouseEnter={() => setClassHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === classHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.cls_id === cls.cls_id ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="flex items-center justify-between">
											<div className="text-sm font-medium text-gray-900">{cls.cls_name}</div>
											{cls.cls_type && (
												<span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-xs font-medium bg-gray-100 text-gray-800 ml-2">
													{cls.cls_type}
												</span>
											)}
										</div>
									</button>
								))}
							</div>
						)}
						{showClassDropdown && filteredClasses.length === 0 && classSearchQuery.trim() && (
							<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg">
								<div className="px-4 py-2.5 text-sm text-gray-500">No classes found</div>
							</div>
						)}
					</div>
				) : (
					<input
						type="text"
						value={selectedClass ? selectedClass.cls_name + (selectedClass.cls_type ? ` (${selectedClass.cls_type})` : '') : 'N/A'}
						disabled
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] bg-gray-100 text-gray-600 cursor-not-allowed"
					/>
				)}
				{errors.cls_id && mode === 'create' && (
					<p className="mt-1 text-sm text-red-600">{errors.cls_id}</p>
				)}
			</div>

			{/* Teacher Selection */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Teacher <span className="text-red-500">*</span>
				</label>
				{mode === 'create' ? (
					<div className="relative">
						<input
							ref={teacherInputRef}
							type="text"
							value={selectedTeacher ? (selectedTeacher.staff_name || selectedTeacher.email || '') : teacherSearchQuery}
							onChange={(e) => {
								setTeacherSearchQuery(e.target.value);
								setShowTeacherDropdown(true);
								setTeacherHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowTeacherDropdown(false);
									handleChange('teacher_id', '');
								}
							}}
							onFocus={() => {
								if (filteredTeachers.length > 0) {
									setShowTeacherDropdown(true);
								}
							}}
							onKeyDown={handleTeacherKeyDown}
							placeholder="Search teacher by name, email, or specialization..."
							disabled={loading || availableTeachers.length === 0}
							className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
								errors.teacher_id ? 'border-red-500' : 'border-gray-300'
							} disabled:bg-gray-100 disabled:cursor-not-allowed`}
						/>
						{showTeacherDropdown && filteredTeachers.length > 0 && (
							<div
								ref={teacherDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredTeachers.map((teacher, index) => (
									<button
										key={teacher.teacher_id}
										type="button"
										onClick={() => handleSelectTeacher(teacher)}
										onMouseEnter={() => setTeacherHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === teacherHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.teacher_id === teacher.teacher_id ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="flex items-center justify-between">
											<div>
												<div className="text-sm font-medium text-gray-900">{teacher.staff_name || 'N/A'}</div>
												<div className="text-xs text-gray-500">{teacher.email || 'N/A'}</div>
											</div>
											{teacher.specialized && (
												<span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-xs font-medium bg-blue-100 text-blue-800 ml-2">
													{teacher.specialized}
												</span>
											)}
										</div>
									</button>
								))}
							</div>
						)}
						{showTeacherDropdown && filteredTeachers.length === 0 && teacherSearchQuery.trim() && (
							<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg">
								<div className="px-4 py-2.5 text-sm text-gray-500">No teachers found</div>
							</div>
						)}
					</div>
				) : (
					<input
						type="text"
						value={selectedTeacher ? (selectedTeacher.staff_name || selectedTeacher.email || 'N/A') : 'N/A'}
						disabled
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] bg-gray-100 text-gray-600 cursor-not-allowed"
					/>
				)}
				{errors.teacher_id && mode === 'create' && (
					<p className="mt-1 text-sm text-red-600">{errors.teacher_id}</p>
				)}
			</div>

			{/* Subject Selection */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Subject <span className="text-red-500">*</span>
				</label>
				{mode === 'create' ? (
					<div className="relative">
						<input
							ref={subjectInputRef}
							type="text"
							value={selectedSubject ? selectedSubject.subj_name : subjectSearchQuery}
							onChange={(e) => {
								setSubjectSearchQuery(e.target.value);
								setShowSubjectDropdown(true);
								setSubjectHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowSubjectDropdown(false);
									handleChange('subj_id', '');
								}
							}}
							onFocus={() => {
								if (filteredSubjects.length > 0) {
									setShowSubjectDropdown(true);
								}
							}}
							onKeyDown={handleSubjectKeyDown}
							placeholder="Search subject by name..."
							disabled={loading || availableSubjects.length === 0}
							className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
								errors.subj_id ? 'border-red-500' : 'border-gray-300'
							} disabled:bg-gray-100 disabled:cursor-not-allowed`}
						/>
						{showSubjectDropdown && filteredSubjects.length > 0 && (
							<div
								ref={subjectDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredSubjects.map((subject, index) => (
									<button
										key={subject.subj_id}
										type="button"
										onClick={() => handleSelectSubject(subject)}
										onMouseEnter={() => setSubjectHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === subjectHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.subj_id === subject.subj_id ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{subject.subj_name}</div>
									</button>
								))}
							</div>
						)}
						{showSubjectDropdown && filteredSubjects.length === 0 && subjectSearchQuery.trim() && (
							<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg">
								<div className="px-4 py-2.5 text-sm text-gray-500">No subjects found</div>
							</div>
						)}
					</div>
				) : (
					<input
						type="text"
						value={selectedSubject ? selectedSubject.subj_name : 'N/A'}
						disabled
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] bg-gray-100 text-gray-600 cursor-not-allowed"
					/>
				)}
				{errors.subj_id && mode === 'create' && (
					<p className="mt-1 text-sm text-red-600">{errors.subj_id}</p>
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


import { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import { getArrayFromResponse } from '../../../utils/apiHelpers';

interface AttendanceItem {
	att_id?: string;
	school_id: string;
	teacher_id: string;
	std_id: string;
	subj_id: string;
	cls_id: string | null;
	date: string;
	status: string;
}

interface TeacherOption {
	teacher_id: string;
	staff_name: string;
	email?: string;
	specialized?: string;
}

interface StudentOption {
	std_id: string;
	std_name: string;
	std_code?: string | null;
}

interface SubjectOption {
	subj_id: string;
	subj_name: string;
}

interface ClassOption {
	cls_id: string;
	cls_name: string;
	cls_type?: string | null;
}

interface AttendanceFormData {
	school_id: string;
	teacher_id: string;
	std_id: string;
	subj_id: string;
	cls_id: string | null;
	date: string;
	status: string;
}

interface AttendanceFormProps {
	attendance?: AttendanceItem | null;
	onSubmit: (data: Partial<AttendanceItem> | Partial<AttendanceItem>[]) => void;
	onCancel: () => void;
	loading?: boolean;
	mode: 'create' | 'edit';
	schoolId: string;
	preselectedClassId?: string;
	preselectedSubjectId?: string;
	preselectedTeacherId?: string | null;
	preselectedStudents?: any[];
}

const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'];

export default function AttendanceForm({
	attendance,
	onSubmit,
	onCancel,
	loading = false,
	mode,
	schoolId,
	preselectedClassId,
	preselectedSubjectId,
	preselectedTeacherId,
	preselectedStudents = [],
}: AttendanceFormProps) {
	const isBulkMode = mode === 'create' && preselectedClassId && preselectedSubjectId && preselectedTeacherId && preselectedStudents.length > 0;
	
	// Bulk attendance state
	const [bulkAttendance, setBulkAttendance] = useState<Record<string, { status: string; date: string }>>({});
	const [formData, setFormData] = useState<Partial<AttendanceFormData>>({
		school_id: schoolId,
		teacher_id: '',
		std_id: '',
		subj_id: '',
		cls_id: null,
		date: '',
		status: '',
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	// Available options
	const [availableTeachers, setAvailableTeachers] = useState<TeacherOption[]>([]);
	const [availableStudents, setAvailableStudents] = useState<StudentOption[]>([]);
	const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>([]);
	const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]);

	// Autocomplete states
	const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
	const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
	const [teacherHighlightedIndex, setTeacherHighlightedIndex] = useState(-1);
	const teacherDropdownRef = useRef<HTMLDivElement>(null);
	const teacherInputRef = useRef<HTMLInputElement>(null);

	const [studentSearchQuery, setStudentSearchQuery] = useState('');
	const [showStudentDropdown, setShowStudentDropdown] = useState(false);
	const [studentHighlightedIndex, setStudentHighlightedIndex] = useState(-1);
	const studentDropdownRef = useRef<HTMLDivElement>(null);
	const studentInputRef = useRef<HTMLInputElement>(null);

	const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
	const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
	const [subjectHighlightedIndex, setSubjectHighlightedIndex] = useState(-1);
	const subjectDropdownRef = useRef<HTMLDivElement>(null);
	const subjectInputRef = useRef<HTMLInputElement>(null);

	const [classSearchQuery, setClassSearchQuery] = useState('');
	const [showClassDropdown, setShowClassDropdown] = useState(false);
	const [classHighlightedIndex, setClassHighlightedIndex] = useState(-1);
	const classDropdownRef = useRef<HTMLDivElement>(null);
	const classInputRef = useRef<HTMLInputElement>(null);

	const [statusSearchQuery, setStatusSearchQuery] = useState('');
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const [statusHighlightedIndex, setStatusHighlightedIndex] = useState(-1);
	const statusDropdownRef = useRef<HTMLDivElement>(null);
	const statusInputRef = useRef<HTMLInputElement>(null);

	// Fetch options
	useEffect(() => {
		const fetchOptions = async () => {
			if (!schoolId) return;

			try {
				const timestamp = new Date().getTime();

				// Fetch teachers
				const teachersResponse = await api.get(`/teachers/?school_id=${schoolId}&_t=${timestamp}`);
				const teachers = getArrayFromResponse(teachersResponse.data).filter((t: any) => t.is_active);
				const mappedTeachers: TeacherOption[] = teachers.map((t: any) => ({
					teacher_id: t.teacher_id,
					staff_name: t.staff_name,
					email: t.staff_email,
					specialized: t.specialized,
				}));
				setAvailableTeachers(mappedTeachers);

				// Fetch students
				const studentsResponse = await api.get(`/students/?school_id=${schoolId}&_t=${timestamp}`);
				const students: StudentOption[] = getArrayFromResponse(studentsResponse.data).map((s: any) => ({
					std_id: s.std_id,
					std_name: s.std_name,
					std_code: s.std_code,
				}));
				setAvailableStudents(students);

				// Fetch subjects
				const subjectsResponse = await api.get(`/subjects/?school_id=${schoolId}&_t=${timestamp}`);
				const subjects: SubjectOption[] = getArrayFromResponse(subjectsResponse.data).map((s: any) => ({
					subj_id: s.subj_id,
					subj_name: s.subj_name,
				}));
				setAvailableSubjects(subjects);

				// Fetch classes
				const classesResponse = await api.get(`/classes/?school_id=${schoolId}&_t=${timestamp}`);
				const classes: ClassOption[] = getArrayFromResponse(classesResponse.data).map((c: any) => ({
					cls_id: c.cls_id,
					cls_name: c.cls_name,
					cls_type: c.cls_type,
				}));
				setAvailableClasses(classes);
			} catch (error: any) {setAvailableTeachers([]);
				setAvailableStudents([]);
				setAvailableSubjects([]);
				setAvailableClasses([]);
			}
		};

		fetchOptions();
	}, [schoolId]);

	// Initialize bulk attendance when preselected students are provided
	useEffect(() => {
		if (isBulkMode && preselectedStudents.length > 0) {
			const defaultDate = new Date().toISOString().slice(0, 16);
			const initialBulk: Record<string, { status: string; date: string }> = {};
			preselectedStudents.forEach((student) => {
				initialBulk[student.std_id] = {
					status: 'present',
					date: defaultDate,
				};
			});
			setBulkAttendance(initialBulk);
			
			// Set form data with preselected values
			setFormData({
				school_id: schoolId,
				teacher_id: preselectedTeacherId || '',
				std_id: '',
				subj_id: preselectedSubjectId || '',
				cls_id: preselectedClassId || null,
				date: defaultDate,
				status: 'present',
			});
		}
	}, [isBulkMode, preselectedStudents, preselectedTeacherId, preselectedSubjectId, preselectedClassId, schoolId]);

	// Set form data when editing
	useEffect(() => {
		if (isBulkMode) return; // Don't override bulk mode initialization
		
		if (attendance && mode === 'edit') {
			// Format date for datetime-local input
			const dateValue = attendance.date ? new Date(attendance.date).toISOString().slice(0, 16) : '';
			setFormData({
				school_id: schoolId,
				teacher_id: attendance.teacher_id || '',
				std_id: attendance.std_id || '',
				subj_id: attendance.subj_id || '',
				cls_id: attendance.cls_id || null,
				date: dateValue,
				status: attendance.status || '',
			});

			// Set search queries to selected values
			const selectedTeacher = availableTeachers.find((t) => t.teacher_id === attendance.teacher_id);
			const selectedStudent = availableStudents.find((s) => s.std_id === attendance.std_id);
			const selectedSubject = availableSubjects.find((s) => s.subj_id === attendance.subj_id);
			const selectedClass = availableClasses.find((c) => c.cls_id === attendance.cls_id);

			setTeacherSearchQuery(selectedTeacher?.staff_name || '');
			setStudentSearchQuery(selectedStudent?.std_name || '');
			setSubjectSearchQuery(selectedSubject?.subj_name || '');
			setClassSearchQuery(selectedClass?.cls_name || '');
			setStatusSearchQuery(attendance.status || '');
		} else if (!isBulkMode) {
			setFormData({
				school_id: schoolId,
				teacher_id: '',
				std_id: '',
				subj_id: '',
				cls_id: null,
				date: '',
				status: '',
			});
			setTeacherSearchQuery('');
			setStudentSearchQuery('');
			setSubjectSearchQuery('');
			setClassSearchQuery('');
			setStatusSearchQuery('');
		}
	}, [attendance, mode, schoolId, availableTeachers, availableStudents, availableSubjects, availableClasses, isBulkMode]);

	// Filter options based on search queries
	const filteredTeachers = availableTeachers.filter((teacher) => {
		if (!teacherSearchQuery.trim()) return true;
		const query = teacherSearchQuery.toLowerCase();
		return (
			(teacher.staff_name && teacher.staff_name.toLowerCase().includes(query)) ||
			(teacher.email && teacher.email.toLowerCase().includes(query)) ||
			(teacher.specialized && teacher.specialized.toLowerCase().includes(query))
		);
	});

	const filteredStudents = availableStudents.filter((student) => {
		if (!studentSearchQuery.trim()) return true;
		const query = studentSearchQuery.toLowerCase();
		return (
			(student.std_name && student.std_name.toLowerCase().includes(query)) ||
			(student.std_code && student.std_code.toLowerCase().includes(query))
		);
	});

	const filteredSubjects = availableSubjects.filter((subject) => {
		if (!subjectSearchQuery.trim()) return true;
		return subject.subj_name.toLowerCase().includes(subjectSearchQuery.toLowerCase());
	});

	const filteredClasses = availableClasses.filter((cls) => {
		if (!classSearchQuery.trim()) return true;
		const query = classSearchQuery.toLowerCase();
		return (
			cls.cls_name.toLowerCase().includes(query) ||
			(cls.cls_type && cls.cls_type.toLowerCase().includes(query))
		);
	});

	const filteredStatuses = ATTENDANCE_STATUSES.filter((status) => {
		if (!statusSearchQuery.trim()) return true;
		return status.toLowerCase().includes(statusSearchQuery.toLowerCase());
	});

	// Get selected options for display
	const selectedTeacher = availableTeachers.find((t) => t.teacher_id === formData.teacher_id);
	const selectedStudent = availableStudents.find((s) => s.std_id === formData.std_id);
	const selectedSubject = availableSubjects.find((s) => s.subj_id === formData.subj_id);
	const selectedClass = availableClasses.find((c) => c.cls_id === formData.cls_id);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;

			if (
				teacherDropdownRef.current &&
				!teacherDropdownRef.current.contains(target) &&
				teacherInputRef.current &&
				!teacherInputRef.current.contains(target)
			) {
				setShowTeacherDropdown(false);
			}

			if (
				studentDropdownRef.current &&
				!studentDropdownRef.current.contains(target) &&
				studentInputRef.current &&
				!studentInputRef.current.contains(target)
			) {
				setShowStudentDropdown(false);
			}

			if (
				subjectDropdownRef.current &&
				!subjectDropdownRef.current.contains(target) &&
				subjectInputRef.current &&
				!subjectInputRef.current.contains(target)
			) {
				setShowSubjectDropdown(false);
			}

			if (
				classDropdownRef.current &&
				!classDropdownRef.current.contains(target) &&
				classInputRef.current &&
				!classInputRef.current.contains(target)
			) {
				setShowClassDropdown(false);
			}

			if (
				statusDropdownRef.current &&
				!statusDropdownRef.current.contains(target) &&
				statusInputRef.current &&
				!statusInputRef.current.contains(target)
			) {
				setShowStatusDropdown(false);
			}
		};

		if (showTeacherDropdown || showStudentDropdown || showSubjectDropdown || showClassDropdown || showStatusDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showTeacherDropdown, showStudentDropdown, showSubjectDropdown, showClassDropdown, showStatusDropdown]);

	const handleChange = (field: keyof AttendanceFormData, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: '' }));
		}
	};

	const validate = () => {
		const newErrors: Record<string, string> = {};

		if (!formData.teacher_id?.trim()) {
			newErrors.teacher_id = 'Teacher is required';
		}

		if (!formData.std_id?.trim()) {
			newErrors.std_id = 'Student is required';
		}

		if (!formData.subj_id?.trim()) {
			newErrors.subj_id = 'Subject is required';
		}

		if (!formData.date?.trim()) {
			newErrors.date = 'Date is required';
		}

		if (!formData.status?.trim()) {
			newErrors.status = 'Status is required';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleBulkStatusChange = (studentId: string, status: string) => {
		setBulkAttendance((prev) => ({
			...prev,
			[studentId]: {
				...prev[studentId],
				status,
			},
		}));
	};

	const handleBulkDateChange = (studentId: string, date: string) => {
		setBulkAttendance((prev) => ({
			...prev,
			[studentId]: {
				...prev[studentId],
				date,
			},
		}));
	};

	const handleBulkDateChangeAll = (date: string) => {
		const updated: Record<string, { status: string; date: string }> = {};
		Object.keys(bulkAttendance).forEach((studentId) => {
			updated[studentId] = {
				...bulkAttendance[studentId],
				date,
			};
		});
		setBulkAttendance(updated);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (isBulkMode) {
			// Bulk submission
			const bulkData: Partial<AttendanceItem>[] = preselectedStudents.map((student) => {
				const attendanceData = bulkAttendance[student.std_id];
				const dateValue = attendanceData?.date
					? new Date(attendanceData.date).toISOString()
					: new Date().toISOString();

				return {
					school_id: schoolId,
					teacher_id: preselectedTeacherId || '',
					std_id: student.std_id,
					subj_id: preselectedSubjectId || '',
					cls_id: preselectedClassId || null,
					date: dateValue,
					status: attendanceData?.status || 'present',
				};
			});

			onSubmit(bulkData);
		} else {
			// Single submission
			if (!validate()) {
				return;
			}

			// Convert date to ISO string format
			const dateValue = formData.date ? new Date(formData.date).toISOString() : new Date().toISOString();

			const submitData: Partial<AttendanceItem> = {
				school_id: schoolId,
				teacher_id: formData.teacher_id || '',
				std_id: formData.std_id || '',
				subj_id: formData.subj_id || '',
				cls_id: formData.cls_id || null,
				date: dateValue,
				status: formData.status || 'present',
			};

			onSubmit(submitData);
		}
	};

	// Get selected class and subject names for display
	const selectedClassDisplay = availableClasses.find((c) => c.cls_id === preselectedClassId);
	const selectedSubjectDisplay = availableSubjects.find((s) => s.subj_id === preselectedSubjectId);
	const selectedTeacherDisplay = availableTeachers.find((t) => t.teacher_id === preselectedTeacherId);

	if (isBulkMode) {
		return (
			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Summary Info */}
				<div className="bg-gray-50 rounded-[3px] p-4 space-y-2">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
						<div>
							<span className="text-gray-600">Class:</span>
							<span className="ml-2 font-medium text-gray-900">{selectedClassDisplay?.cls_name || 'N/A'}</span>
						</div>
						<div>
							<span className="text-gray-600">Subject:</span>
							<span className="ml-2 font-medium text-gray-900">{selectedSubjectDisplay?.subj_name || 'N/A'}</span>
						</div>
						<div>
							<span className="text-gray-600">Teacher:</span>
							<span className="ml-2 font-medium text-gray-900">{selectedTeacherDisplay?.staff_name || 'N/A'}</span>
						</div>
						<div>
							<span className="text-gray-600">Students:</span>
							<span className="ml-2 font-medium text-gray-900">{preselectedStudents.length}</span>
						</div>
					</div>
				</div>

				{/* Set Date for All */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Set Date & Time for All</label>
					<input
						type="datetime-local"
						value={Object.values(bulkAttendance)[0]?.date || new Date().toISOString().slice(0, 16)}
						onChange={(e) => handleBulkDateChangeAll(e.target.value)}
						className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
						disabled={loading}
					/>
				</div>

				{/* Students List */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-3">Mark Attendance for Students</label>
					<div className="border border-gray-300 rounded-[3px] overflow-hidden">
						<div className="max-h-96 overflow-y-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50 sticky top-0">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{preselectedStudents.map((student) => {
										const attendanceData = bulkAttendance[student.std_id] || { status: 'present', date: new Date().toISOString().slice(0, 16) };
										return (
											<tr key={student.std_id} className="hover:bg-gray-50">
												<td className="px-4 py-3 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">{student.std_name}</div>
													{student.std_code && (
														<div className="text-xs text-gray-500">Code: {student.std_code}</div>
													)}
												</td>
												<td className="px-4 py-3 whitespace-nowrap">
													<select
														value={attendanceData.status}
														onChange={(e) => handleBulkStatusChange(student.std_id, e.target.value)}
														className="px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
														disabled={loading}
													>
														{ATTENDANCE_STATUSES.map((status) => (
															<option key={status} value={status}>
																{status.charAt(0).toUpperCase() + status.slice(1)}
															</option>
														))}
													</select>
												</td>
												<td className="px-4 py-3 whitespace-nowrap">
													<input
														type="datetime-local"
														value={attendanceData.date}
														onChange={(e) => handleBulkDateChange(student.std_id, e.target.value)}
														className="px-3 py-1.5 border border-gray-300 rounded-[3px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
														disabled={loading}
													/>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* Form Actions */}
				<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
					<button
						type="button"
						onClick={onCancel}
						disabled={loading}
						className="px-4 py-2.5 border border-gray-300 rounded-[3px] text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={loading}
						className="px-4 py-2.5 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Saving...' : 'Mark Attendance'}
					</button>
				</div>
			</form>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Teacher */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Teacher <span className="text-red-500">*</span>
					</label>
					<div className="relative">
						<input
							ref={teacherInputRef}
							type="text"
							value={selectedTeacher?.staff_name || teacherSearchQuery}
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
								setTeacherSearchQuery('');
							}}
							className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
								errors.teacher_id ? 'border-red-500' : 'border-gray-300'
							}`}
							placeholder="Select teacher"
							disabled={loading}
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
										onClick={() => {
											handleChange('teacher_id', teacher.teacher_id);
											setTeacherSearchQuery(teacher.staff_name);
											setShowTeacherDropdown(false);
										}}
										onMouseEnter={() => setTeacherHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === teacherHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.teacher_id === teacher.teacher_id ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{teacher.staff_name}</div>
										{teacher.specialized && (
											<div className="text-xs text-gray-500">{teacher.specialized}</div>
										)}
									</button>
								))}
							</div>
						)}
					</div>
					{errors.teacher_id && <p className="mt-1 text-sm text-red-600">{errors.teacher_id}</p>}
				</div>

				{/* Student */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Student <span className="text-red-500">*</span>
					</label>
					<div className="relative">
						<input
							ref={studentInputRef}
							type="text"
							value={selectedStudent?.std_name || studentSearchQuery}
							onChange={(e) => {
								setStudentSearchQuery(e.target.value);
								setShowStudentDropdown(true);
								setStudentHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowStudentDropdown(false);
									handleChange('std_id', '');
								}
							}}
							onFocus={() => {
								if (filteredStudents.length > 0) {
									setShowStudentDropdown(true);
								}
								setStudentSearchQuery('');
							}}
							className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
								errors.std_id ? 'border-red-500' : 'border-gray-300'
							}`}
							placeholder="Select student"
							disabled={loading}
						/>
						{showStudentDropdown && filteredStudents.length > 0 && (
							<div
								ref={studentDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredStudents.map((student, index) => (
									<button
										key={student.std_id}
										type="button"
										onClick={() => {
											handleChange('std_id', student.std_id);
											setStudentSearchQuery(student.std_name);
											setShowStudentDropdown(false);
										}}
										onMouseEnter={() => setStudentHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === studentHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.std_id === student.std_id ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{student.std_name}</div>
										{student.std_code && (
											<div className="text-xs text-gray-500">Code: {student.std_code}</div>
										)}
									</button>
								))}
							</div>
						)}
					</div>
					{errors.std_id && <p className="mt-1 text-sm text-red-600">{errors.std_id}</p>}
				</div>

				{/* Subject */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Subject <span className="text-red-500">*</span>
					</label>
					<div className="relative">
						<input
							ref={subjectInputRef}
							type="text"
							value={selectedSubject?.subj_name || subjectSearchQuery}
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
								setSubjectSearchQuery('');
							}}
							className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
								errors.subj_id ? 'border-red-500' : 'border-gray-300'
							}`}
							placeholder="Select subject"
							disabled={loading}
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
										onClick={() => {
											handleChange('subj_id', subject.subj_id);
											setSubjectSearchQuery(subject.subj_name);
											setShowSubjectDropdown(false);
										}}
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
					</div>
					{errors.subj_id && <p className="mt-1 text-sm text-red-600">{errors.subj_id}</p>}
				</div>

				{/* Class (Optional) */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
					<div className="relative">
						<input
							ref={classInputRef}
							type="text"
							value={selectedClass?.cls_name || classSearchQuery}
							onChange={(e) => {
								setClassSearchQuery(e.target.value);
								setShowClassDropdown(true);
								setClassHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowClassDropdown(false);
									handleChange('cls_id', null);
								}
							}}
							onFocus={() => {
								if (filteredClasses.length > 0) {
									setShowClassDropdown(true);
								}
								setClassSearchQuery('');
							}}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
							placeholder="Select class (optional)"
							disabled={loading}
						/>
						{showClassDropdown && filteredClasses.length > 0 && (
							<div
								ref={classDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								<button
									type="button"
									onClick={() => {
										handleChange('cls_id', null);
										setClassSearchQuery('');
										setShowClassDropdown(false);
									}}
									className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
								>
									<div className="text-sm font-medium text-gray-900">None</div>
								</button>
								{filteredClasses.map((cls, index) => (
									<button
										key={cls.cls_id}
										type="button"
										onClick={() => {
											handleChange('cls_id', cls.cls_id);
											setClassSearchQuery(cls.cls_name);
											setShowClassDropdown(false);
										}}
										onMouseEnter={() => setClassHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === classHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.cls_id === cls.cls_id ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{cls.cls_name}</div>
										{cls.cls_type && (
											<div className="text-xs text-gray-500">{cls.cls_type}</div>
										)}
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Date */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Date & Time <span className="text-red-500">*</span>
					</label>
					<input
						type="datetime-local"
						value={formData.date || ''}
						onChange={(e) => handleChange('date', e.target.value)}
						className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
							errors.date ? 'border-red-500' : 'border-gray-300'
						}`}
						disabled={loading}
					/>
					{errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
				</div>

				{/* Status */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Status <span className="text-red-500">*</span>
					</label>
					<div className="relative">
						<input
							ref={statusInputRef}
							type="text"
							value={formData.status || statusSearchQuery}
							onChange={(e) => {
								setStatusSearchQuery(e.target.value);
								setShowStatusDropdown(true);
								setStatusHighlightedIndex(-1);
								if (!e.target.value.trim()) {
									setShowStatusDropdown(false);
									handleChange('status', '');
								}
							}}
							onFocus={() => {
								if (filteredStatuses.length > 0) {
									setShowStatusDropdown(true);
								}
								setStatusSearchQuery('');
							}}
							className={`w-full px-4 py-2.5 border rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
								errors.status ? 'border-red-500' : 'border-gray-300'
							}`}
							placeholder="Select status"
							disabled={loading}
						/>
						{showStatusDropdown && filteredStatuses.length > 0 && (
							<div
								ref={statusDropdownRef}
								className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
							>
								{filteredStatuses.map((status, index) => (
									<button
										key={status}
										type="button"
										onClick={() => {
											handleChange('status', status);
											setStatusSearchQuery(status);
											setShowStatusDropdown(false);
										}}
										onMouseEnter={() => setStatusHighlightedIndex(index)}
										className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
											index === statusHighlightedIndex ? 'bg-primary-50' : ''
										} ${formData.status === status ? 'bg-primary-100 font-medium' : ''}`}
									>
										<div className="text-sm font-medium text-gray-900">{status.charAt(0).toUpperCase() + status.slice(1)}</div>
									</button>
								))}
							</div>
						)}
					</div>
					{errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
				</div>
			</div>

			{/* Form Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					onClick={onCancel}
					disabled={loading}
					className="px-4 py-2.5 border border-gray-300 rounded-[3px] text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-4 py-2.5 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
				</button>
			</div>
		</form>
	);
}


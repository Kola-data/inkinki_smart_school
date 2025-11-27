import { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../../../components/Modal';
import api from '../../../services/api';

interface ClassTeacherAssignment {
	id: string;
	teacher_id: string;
	subj_id: string;
	cls_id: string;
	start_date: string;
	end_date: string;
	teacher_name?: string | null;
	subject_name?: string | null;
	class_name?: string | null;
	class_type?: string | null;
}

interface StudentOption {
	std_id: string;
	std_name: string;
	std_code?: string | null;
	current_class?: string | null;
}

interface AttendanceFilterModalProps {
	isOpen: boolean;
	onClose: () => void;
	onProceed: (selectedClass: string, selectedSubject: string, students: StudentOption[]) => void;
	schoolId: string;
	teacherId: string | null;
}

export default function AttendanceFilterModal({
	isOpen,
	onClose,
	onProceed,
	schoolId,
	teacherId,
}: AttendanceFilterModalProps) {
	const [classTeacherAssignments, setClassTeacherAssignments] = useState<ClassTeacherAssignment[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedClassId, setSelectedClassId] = useState<string>('');
	const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
	const [students, setStudents] = useState<StudentOption[]>([]);
	const [loadingStudents, setLoadingStudents] = useState(false);

	// Autocomplete states
	const [classSearchQuery, setClassSearchQuery] = useState('');
	const [showClassDropdown, setShowClassDropdown] = useState(false);
	const [classHighlightedIndex, setClassHighlightedIndex] = useState(-1);
	const classDropdownRef = useRef<HTMLDivElement>(null);
	const classInputRef = useRef<HTMLInputElement>(null);

	const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
	const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
	const [subjectHighlightedIndex, setSubjectHighlightedIndex] = useState(-1);
	const subjectDropdownRef = useRef<HTMLDivElement>(null);
	const subjectInputRef = useRef<HTMLInputElement>(null);

	// Fetch class-teacher assignments for the logged-in teacher
	useEffect(() => {
		const fetchAssignments = async () => {
			if (!schoolId || !teacherId || !isOpen) return;

			try {
				setLoading(true);
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/class-teachers/?school_id=${schoolId}&_t=${timestamp}`);
				
				// Filter assignments for the logged-in teacher
				const teacherAssignments = (data || []).filter(
					(assignment: ClassTeacherAssignment) => assignment.teacher_id === teacherId
				);
				setClassTeacherAssignments(teacherAssignments);
			} catch (error: any) {setClassTeacherAssignments([]);
			} finally {
				setLoading(false);
			}
		};

		fetchAssignments();
	}, [schoolId, teacherId, isOpen]);

	// Get unique classes and subjects from assignments
	const availableClasses = useMemo(() => {
		const classMap = new Map<string, { cls_id: string; cls_name: string; cls_type: string | null }>();
		classTeacherAssignments.forEach((assignment) => {
			if (assignment.cls_id && assignment.class_name) {
				classMap.set(assignment.cls_id, {
					cls_id: assignment.cls_id,
					cls_name: assignment.class_name,
					cls_type: assignment.class_type || null,
				});
			}
		});
		return Array.from(classMap.values());
	}, [classTeacherAssignments]);

	const availableSubjects = useMemo(() => {
		// If class is selected, only show subjects for that class
		if (selectedClassId) {
			const subjectsMap = new Map<string, { subj_id: string; subj_name: string }>();
			classTeacherAssignments
				.filter((assignment) => assignment.cls_id === selectedClassId)
				.forEach((assignment) => {
					if (assignment.subj_id && assignment.subject_name) {
						subjectsMap.set(assignment.subj_id, {
							subj_id: assignment.subj_id,
							subj_name: assignment.subject_name,
						});
					}
				});
			return Array.from(subjectsMap.values());
		}

		// Otherwise show all subjects from teacher's assignments
		const subjectsMap = new Map<string, { subj_id: string; subj_name: string }>();
		classTeacherAssignments.forEach((assignment) => {
			if (assignment.subj_id && assignment.subject_name) {
				subjectsMap.set(assignment.subj_id, {
					subj_id: assignment.subj_id,
					subj_name: assignment.subject_name,
				});
			}
		});
		return Array.from(subjectsMap.values());
	}, [classTeacherAssignments, selectedClassId]);

	// Fetch students when class is selected
	useEffect(() => {
		const fetchStudents = async () => {
			if (!selectedClassId || !schoolId) {
				setStudents([]);
				return;
			}

			try {
				setLoadingStudents(true);
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/students/?school_id=${schoolId}&_t=${timestamp}`);
				
				// Filter students by selected class
				const classStudents: StudentOption[] = (data || [])
					.filter((s: any) => s.current_class === selectedClassId)
					.map((s: any) => ({
						std_id: s.std_id,
						std_name: s.std_name,
						std_code: s.std_code,
						current_class: s.current_class,
					}));
				setStudents(classStudents);
			} catch (error: any) {setStudents([]);
			} finally {
				setLoadingStudents(false);
			}
		};

		fetchStudents();
	}, [selectedClassId, schoolId]);

	// Filter options based on search queries
	const filteredClasses = availableClasses.filter((cls) => {
		if (!classSearchQuery.trim()) return true;
		const query = classSearchQuery.toLowerCase();
		return (
			cls.cls_name.toLowerCase().includes(query) ||
			(cls.cls_type && cls.cls_type.toLowerCase().includes(query))
		);
	});

	const filteredSubjects = availableSubjects.filter((subject) => {
		if (!subjectSearchQuery.trim()) return true;
		return subject.subj_name.toLowerCase().includes(subjectSearchQuery.toLowerCase());
	});

	// Get selected options for display
	const selectedClass = availableClasses.find((c) => c.cls_id === selectedClassId);
	const selectedSubject = availableSubjects.find((s) => s.subj_id === selectedSubjectId);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;

			if (
				classDropdownRef.current &&
				!classDropdownRef.current.contains(target) &&
				classInputRef.current &&
				!classInputRef.current.contains(target)
			) {
				setShowClassDropdown(false);
			}

			if (
				subjectDropdownRef.current &&
				!subjectDropdownRef.current.contains(target) &&
				subjectInputRef.current &&
				!subjectInputRef.current.contains(target)
			) {
				setShowSubjectDropdown(false);
			}
		};

		if (showClassDropdown || showSubjectDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showClassDropdown, showSubjectDropdown]);

	const handleProceed = () => {
		if (!selectedClassId || !selectedSubjectId) {
			return;
		}
		onProceed(selectedClassId, selectedSubjectId, students);
	};

	const handleReset = () => {
		setSelectedClassId('');
		setSelectedSubjectId('');
		setClassSearchQuery('');
		setSubjectSearchQuery('');
		setStudents([]);
	};

	if (!isOpen) return null;

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Select Class and Subject" size="lg">
			<div className="space-y-6">
				{loading ? (
					<div className="text-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
						<p className="mt-4 text-gray-600">Loading your classes...</p>
					</div>
				) : classTeacherAssignments.length === 0 ? (
					<div className="text-center py-8">
						<p className="text-gray-600">No class assignments found. Please contact admin to assign you to classes.</p>
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Class Filter */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Class <span className="text-red-500">*</span>
								</label>
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
												setSelectedClassId('');
												setSelectedSubjectId('');
												setSubjectSearchQuery('');
											}
										}}
										onFocus={() => {
											if (filteredClasses.length > 0) {
												setShowClassDropdown(true);
											}
											setClassSearchQuery('');
										}}
										className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										placeholder="Select class"
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
													onClick={() => {
														setSelectedClassId(cls.cls_id);
														setClassSearchQuery(cls.cls_name);
														setShowClassDropdown(false);
														// Reset subject when class changes
														setSelectedSubjectId('');
														setSubjectSearchQuery('');
													}}
													onMouseEnter={() => setClassHighlightedIndex(index)}
													className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
														index === classHighlightedIndex ? 'bg-primary-50' : ''
													} ${selectedClassId === cls.cls_id ? 'bg-primary-100 font-medium' : ''}`}
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

							{/* Subject Filter */}
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
												setSelectedSubjectId('');
											}
										}}
										onFocus={() => {
											if (filteredSubjects.length > 0) {
												setShowSubjectDropdown(true);
											}
											setSubjectSearchQuery('');
										}}
										className="w-full px-4 py-2.5 border border-gray-300 rounded-[3px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
										placeholder={selectedClassId ? 'Select subject' : 'Select class first'}
										disabled={!selectedClassId}
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
														setSelectedSubjectId(subject.subj_id);
														setSubjectSearchQuery(subject.subj_name);
														setShowSubjectDropdown(false);
													}}
													onMouseEnter={() => setSubjectHighlightedIndex(index)}
													className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
														index === subjectHighlightedIndex ? 'bg-primary-50' : ''
													} ${selectedSubjectId === subject.subj_id ? 'bg-primary-100 font-medium' : ''}`}
												>
													<div className="text-sm font-medium text-gray-900">{subject.subj_name}</div>
												</button>
											))}
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Students Preview */}
						{selectedClassId && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Students in {selectedClass?.cls_name || 'Selected Class'}
								</label>
								{loadingStudents ? (
									<div className="text-center py-4">
										<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
									</div>
								) : students.length === 0 ? (
									<div className="px-4 py-3 bg-gray-50 rounded-[3px] text-sm text-gray-600">
										No students found in this class
									</div>
								) : (
									<div className="px-4 py-3 bg-gray-50 rounded-[3px]">
										<p className="text-sm text-gray-600">
											{students.length} student{students.length !== 1 ? 's' : ''} found
										</p>
									</div>
								)}
							</div>
						)}

						{/* Actions */}
						<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
							<button
								type="button"
								onClick={() => {
									handleReset();
									onClose();
								}}
								className="px-4 py-2.5 border border-gray-300 rounded-[3px] text-gray-700 hover:bg-gray-50 transition-colors"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleProceed}
								disabled={!selectedClassId || !selectedSubjectId || students.length === 0}
								className="px-4 py-2.5 bg-primary-600 text-white rounded-[3px] hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Proceed
							</button>
						</div>
					</>
				)}
			</div>
		</Modal>
	);
}


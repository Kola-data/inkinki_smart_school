import { useState, useEffect, useRef } from 'react';
import { CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import { getArrayFromResponse } from '../../../utils/apiHelpers';

interface AcademicYearOption {
	academic_id: string;
	academic_name: string;
	is_current?: boolean;
}

interface AcademicYearFilterProps {
	schoolId: string | null;
	selectedAcademicYearId: string | null;
	onChange: (academicYearId: string | null) => void;
	placeholder?: string;
	className?: string;
}

export default function AcademicYearFilter({
	schoolId,
	selectedAcademicYearId,
	onChange,
	placeholder = 'Filter by Academic Year',
	className = '',
}: AcademicYearFilterProps) {
	const [availableAcademicYears, setAvailableAcademicYears] = useState<AcademicYearOption[]>([]);
	const [query, setQuery] = useState('');
	const [showDropdown, setShowDropdown] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Fetch academic years
	useEffect(() => {
		const fetchAcademicYears = async () => {
			if (!schoolId) {
				setAvailableAcademicYears([]);
				return;
			}

			try {
				const timestamp = new Date().getTime();
				const { data } = await api.get(`/academic-years/?school_id=${schoolId}&_t=${timestamp}`);
				const academicYears: AcademicYearOption[] = getArrayFromResponse(data).map((ay: any) => ({
					academic_id: ay.academic_id,
					academic_name: ay.academic_name,
					is_current: ay.is_current || false,
				}));
				setAvailableAcademicYears(academicYears);
			} catch (error: any) {setAvailableAcademicYears([]);
			}
		};

		fetchAcademicYears();
	}, [schoolId]);

	// Update query when selection changes
	useEffect(() => {
		if (selectedAcademicYearId) {
			const selected = availableAcademicYears.find((ay) => ay.academic_id === selectedAcademicYearId);
			if (selected) {
				setQuery(selected.academic_name);
			}
		} else {
			setQuery('');
		}
	}, [selectedAcademicYearId, availableAcademicYears]);

	// Filter options
	const filteredOptions = availableAcademicYears.filter((ay) => {
		if (!query.trim()) return true;
		return ay.academic_name.toLowerCase().includes(query.toLowerCase());
	});

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(target) &&
				inputRef.current &&
				!inputRef.current.contains(target)
			) {
				setShowDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleSelect = (academicYear: AcademicYearOption) => {
		onChange(academicYear.academic_id);
		setQuery(academicYear.academic_name);
		setShowDropdown(false);
	};

	const handleClear = () => {
		onChange(null);
		setQuery('');
		setShowDropdown(false);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.target.value);
		setShowDropdown(true);
		setHighlightedIndex(-1);
	};

	const handleInputFocus = () => {
		setShowDropdown(true);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
		} else if (e.key === 'Enter' && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
			handleSelect(filteredOptions[highlightedIndex]);
		} else if (e.key === 'Escape') {
			setShowDropdown(false);
		}
	};

	const selectedAcademicYear = availableAcademicYears.find((ay) => ay.academic_id === selectedAcademicYearId);

	return (
		<div className={`relative ${className}`}>
			<div className="relative">
				<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<CalendarDaysIcon className="h-5 w-5 text-gray-400" />
				</div>
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={handleInputChange}
					onFocus={handleInputFocus}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-[3px] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
				/>
				{selectedAcademicYearId && (
					<button
						type="button"
						onClick={handleClear}
						className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
					>
						<XMarkIcon className="h-5 w-5" />
					</button>
				)}
			</div>

			{showDropdown && filteredOptions.length > 0 && (
				<div
					ref={dropdownRef}
					className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-[3px] shadow-lg max-h-60 overflow-auto"
				>
					<div className="py-1">
						<button
							type="button"
							onClick={handleClear}
							className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
								!selectedAcademicYearId ? 'bg-primary-50 font-medium' : ''
							}`}
						>
							All Academic Years
						</button>
						{filteredOptions.map((academicYear, index) => (
							<button
								key={academicYear.academic_id}
								type="button"
								onClick={() => handleSelect(academicYear)}
								className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
									selectedAcademicYearId === academicYear.academic_id
										? 'bg-primary-100 font-medium'
										: ''
								} ${highlightedIndex === index ? 'bg-gray-100' : ''}`}
							>
								<div className="flex items-center justify-between">
									<span>{academicYear.academic_name}</span>
									{academicYear.is_current && (
										<span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
											Current
										</span>
									)}
								</div>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}


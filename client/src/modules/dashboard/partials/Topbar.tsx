import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

const API_BASE_URL = 'http://localhost:8000';

interface TopbarProps {
	onMenuClick?: () => void;
	sidebarOpen?: boolean;
}

export default function Topbar({ onMenuClick, sidebarOpen = false }: TopbarProps) {
	const navigate = useNavigate();
	const [staffName, setStaffName] = useState('Admin');
	const [staffId, setStaffId] = useState<string | null>(null);
	const [staffProfilePath, setStaffProfilePath] = useState<string | null>(null);
	const [schoolName, setSchoolName] = useState('');
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [imageError, setImageError] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const storedStaff = localStorage.getItem('staff');
		const storedSchool = localStorage.getItem('school');
		
		if (storedStaff) {
			try {
				const staff = JSON.parse(storedStaff);
				setStaffName(staff.staff_name || 'Admin');
				setStaffId(staff.staff_id || null);
				setStaffProfilePath(staff.staff_profile || null);
				setImageError(false); // Reset error state when staff data changes
			} catch {
				// Keep default
			}
		}

		if (storedSchool) {
			try {
				const school = JSON.parse(storedSchool);
				setSchoolName(school.school_name || '');
			} catch {
				// Keep default
			}
		}
	}, []);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setDropdownOpen(false);
			}
		}

		if (dropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [dropdownOpen]);

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	const handleLogout = () => {
		// Clear all localStorage data
		localStorage.clear();
		// Redirect to login page
		navigate('/login');
		// Force a full page reload to ensure all state is cleared
		setTimeout(() => {
			window.location.href = '/login';
		}, 100);
	};

	const getProfileImageUrl = () => {
		if (!staffProfilePath) {
			return null;
		}
		
		// If it's already a full URL, return it
		if (staffProfilePath.startsWith('http://') || staffProfilePath.startsWith('https://')) {
			return staffProfilePath;
		}
		
		// Use static file serving (uploads are mounted at /uploads in FastAPI)
		// The path from DB is like: "uploads/staff/profiles/xxx.png"
		// The mount point is /uploads, so URL should be: http://localhost:8000/uploads/staff/profiles/xxx.png
		// Ensure we don't double the /uploads prefix
		let imageUrl: string;
		if (staffProfilePath.startsWith('uploads/')) {
			imageUrl = `${API_BASE_URL}/${staffProfilePath}`;
		} else {
			// If path doesn't start with uploads/, add it
			imageUrl = `${API_BASE_URL}/uploads/${staffProfilePath}`;
		}
		
		return imageUrl;
	};

	const profileImageUrl = getProfileImageUrl();

	return (
		<header className="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-50">
			<div className="flex items-center gap-4">
				{/* Menu/Close toggle button - shown when sidebar can be toggled (below lg breakpoint = 1024px) */}
				<button
					onClick={onMenuClick}
					className="lg:hidden p-2 hover:bg-gray-100 rounded-[3px] transition-colors flex-shrink-0"
					aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
					title={sidebarOpen ? 'Close menu' : 'Open menu'}
				>
					{sidebarOpen ? (
						<XMarkIcon className="w-6 h-6 text-gray-700" />
					) : (
						<Bars3Icon className="w-6 h-6 text-gray-700" />
					)}
				</button>
				<h1 className="text-lg md:text-xl font-semibold text-gray-800 truncate">
					{schoolName || 'Dashboard'}
				</h1>
			</div>
			
			<div className="flex items-center gap-4">
				<div className="hidden lg:flex items-center gap-3 text-sm text-gray-600">
					<span className="font-medium">{staffName}</span>
					<div className="relative" ref={dropdownRef}>
						<button
							onClick={() => setDropdownOpen(!dropdownOpen)}
							className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full transition-all"
							aria-label="User menu"
						>
							{profileImageUrl && !imageError && staffProfilePath ? (
								<img
									src={profileImageUrl}
									alt={staffName}
									key={`profile-${staffId}-${staffProfilePath}`}
									className="w-10 h-10 rounded-full object-cover border-2 border-primary-200 hover:border-primary-400 transition-colors cursor-pointer shadow-md"
									onError={() => {
										setImageError(true);
									}}
									onLoad={() => {
										setImageError(false);
									}}
								/>
							) : (
								<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center text-white font-semibold shadow-md hover:shadow-lg transition-shadow cursor-pointer">
									{getInitials(staffName)}
								</div>
							)}
						</button>

						{dropdownOpen && (
							<div className="absolute right-0 mt-2 w-48 bg-white rounded-[3px] shadow-lg border border-gray-200 py-1 z-50">
								<Link
									to="/dashboard/settings"
									className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
									onClick={() => setDropdownOpen(false)}
								>
									<div className="flex items-center gap-2">
										<Cog6ToothIcon className="w-4 h-4" />
										<span>Settings</span>
									</div>
								</Link>
								<button
									onClick={handleLogout}
									className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
								>
									<div className="flex items-center gap-2">
										<ArrowLeftOnRectangleIcon className="w-4 h-4" />
										<span>Logout</span>
									</div>
								</button>
							</div>
						)}
					</div>
				</div>
				
				{/* Mobile/Tablet profile button - shown below lg (1024px) */}
				<div className="lg:hidden relative" ref={dropdownRef}>
					<button
						onClick={() => setDropdownOpen(!dropdownOpen)}
						className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full transition-all"
						aria-label="User menu"
					>
						{profileImageUrl && !imageError && staffProfilePath ? (
							<img
								src={profileImageUrl}
								alt={staffName}
								key={`profile-${staffId}-${staffProfilePath}`}
								className="w-9 h-9 rounded-full object-cover border-2 border-primary-200 hover:border-primary-400 transition-colors cursor-pointer shadow-md"
								onError={(e) => {
									const img = e.target as HTMLImageElement;
									setImageError(true);
								}}
								onLoad={() => setImageError(false)}
							/>
						) : (
							<div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 grid place-items-center text-white font-semibold shadow-md">
								{getInitials(staffName)}
							</div>
						)}
					</button>

					{dropdownOpen && (
						<div className="absolute right-0 mt-2 w-48 bg-white rounded-[3px] shadow-lg border border-gray-200 py-1 z-50">
							<Link
								to="/dashboard/settings"
								className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
								onClick={() => setDropdownOpen(false)}
							>
								<div className="flex items-center gap-2">
									<Cog6ToothIcon className="w-4 h-4" />
									<span>Settings</span>
								</div>
							</Link>
							<button
								onClick={handleLogout}
								className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
							>
								<div className="flex items-center gap-2">
									<ArrowLeftOnRectangleIcon className="w-4 h-4" />
									<span>Logout</span>
								</div>
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}

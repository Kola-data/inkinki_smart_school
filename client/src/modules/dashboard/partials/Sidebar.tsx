import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
	HomeIcon,
	UserGroupIcon,
	BriefcaseIcon,
	AcademicCapIcon,
	BuildingOfficeIcon,
	UsersIcon,
	BanknotesIcon,
	CalendarDaysIcon,
	BookOpenIcon,
	CalendarIcon,
	Bars3Icon,
	XMarkIcon,
	ChevronLeftIcon,
	ArrowRightIcon,
	ArrowLeftOnRectangleIcon,
	UserCircleIcon,
} from '@heroicons/react/24/outline';

const navigation = [
	{ name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
	{ name: 'Students', path: '/dashboard/students', icon: UserGroupIcon },
	{ name: 'Staff', path: '/dashboard/staff', icon: BriefcaseIcon },
	{ name: 'Teachers', path: '/dashboard/teachers', icon: AcademicCapIcon },
	{ name: 'Classes', path: '/dashboard/classes', icon: BuildingOfficeIcon },
	{ name: 'Teaching Schedule', path: '/dashboard/class-teachers', icon: UserCircleIcon },
	{ name: 'Parents', path: '/dashboard/parents', icon: UsersIcon },
	{ name: 'Fees', path: '/dashboard/fees', icon: BanknotesIcon },
	{ name: 'Attendance', path: '/dashboard/attendance', icon: CalendarDaysIcon },
	{ name: 'Subjects', path: '/dashboard/subjects', icon: BookOpenIcon },
	{ name: 'Academic Years', path: '/dashboard/academic-years', icon: CalendarIcon },
];

interface SidebarProps {
	isOpen?: boolean;
	onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
	const [collapsed, setCollapsed] = useState(false);
	const navigate = useNavigate();
	const [schoolName, setSchoolName] = useState('Inkinki Smart School');

	useEffect(() => {
		// Get school name from localStorage or API
		const storedSchool = localStorage.getItem('school');
		if (storedSchool) {
			try {
				const school = JSON.parse(storedSchool);
				setSchoolName(school.school_name || 'Inkinki Smart School');
			} catch {
				// Keep default
			}
		}
	}, []);

	const handleLogout = () => {
		// Clear all localStorage data
		localStorage.clear();
		// Redirect to login page
		window.location.href = '/login';
	};

	// Close mobile sidebar when clicking outside
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [isOpen]);

	// Close mobile sidebar when route changes
	const handleNavClick = () => {
		if (onClose) {
			onClose();
		}
	};

	return (
		<>
			{/* Overlay - shown when sidebar is open on screens below lg (1024px) */}
			{isOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
					onClick={onClose}
				/>
			)}
			
			{/* Sidebar */}
			<aside
				className={`${
					collapsed ? 'w-20' : 'w-64'
				} ${
					isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
				} fixed lg:static left-0 top-0 z-50 lg:z-auto min-h-screen bg-primary-700 text-white flex-col transition-all duration-300 shadow-xl`}
			>
			<div className="px-6 py-6 border-b border-primary-600">
				<div className="flex items-center justify-between">
					{!collapsed && (
						<div className="flex-1">
							<h1 className="font-bold text-xl text-white">Inkinki</h1>
							<p className="text-xs text-white/80 mt-1 truncate">{schoolName}</p>
						</div>
					)}
					<div className="flex items-center gap-2">
						{/* Close button - shown on screens below lg (1024px) when sidebar is open */}
						{isOpen && onClose && (
							<button
								onClick={onClose}
								className="lg:hidden p-2 hover:bg-primary-600 rounded-[3px] transition-colors flex-shrink-0"
								aria-label="Close sidebar"
								title="Close menu"
							>
								<XMarkIcon className="w-5 h-5 text-white" />
							</button>
						)}
						{/* Desktop collapse/expand button - shown on lg and above (1024px+) */}
						<button
							onClick={() => setCollapsed(!collapsed)}
							className="hidden lg:flex p-2 hover:bg-primary-600 rounded-[3px] transition-colors flex-shrink-0"
							aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
							title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
						>
							{collapsed ? (
								<ArrowRightIcon className="w-5 h-5 text-white" />
							) : (
								<ChevronLeftIcon className="w-5 h-5 text-white" />
							)}
						</button>
					</div>
				</div>
			</div>

			<nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
				{navigation.map((item) => {
					const Icon = item.icon;
					return (
						<NavLink
							key={item.path}
							to={item.path}
							onClick={handleNavClick}
							className={({ isActive }) =>
								`flex items-center gap-3 px-4 py-3 rounded-[3px] text-sm font-medium transition-all duration-200 ${
									isActive
										? 'bg-white text-primary-700 shadow-md'
										: 'text-white/90 hover:bg-primary-600 hover:text-white'
								}`
							}
						>
							<Icon className="w-5 h-5 flex-shrink-0" />
							{!collapsed && <span>{item.name}</span>}
						</NavLink>
					);
				})}
			</nav>

			<div className="px-3 py-4 border-t border-primary-600">
				<button
					onClick={handleLogout}
					className={`w-full flex items-center gap-3 px-4 py-3 rounded-[3px] text-sm font-medium text-white/90 hover:bg-red-600 hover:text-white transition-all duration-200 ${
						collapsed ? 'justify-center' : ''
					}`}
				>
					<ArrowLeftOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
					{!collapsed && <span>Logout</span>}
				</button>
			</div>
		</aside>
		</>
	);
}

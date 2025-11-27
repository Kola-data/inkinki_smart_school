import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
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
	CurrencyDollarIcon,
	ReceiptRefundIcon,
	ClipboardDocumentListIcon,
	DocumentCheckIcon,
	DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { getVisibleNavigationItems } from '../../../utils/rolePermissions';

// Icon mapping - using different icons based on type
const iconMap: { [key: string]: any } = {
	'Dashboard': HomeIcon,
	'Students': UserGroupIcon,
	'Staff': BriefcaseIcon,
	'Teachers': AcademicCapIcon,
	'Classes': BuildingOfficeIcon,
	'Teaching Schedule': UserCircleIcon,
	'Parents': UsersIcon,
	'Fee Types': BanknotesIcon,
	'Fee Management': CurrencyDollarIcon,
	'Expenses': ReceiptRefundIcon,
	'Attendance': CalendarDaysIcon,
	'Test Marks': ClipboardDocumentListIcon,
	'Exam Marks': DocumentCheckIcon,
	'Student Reports': DocumentTextIcon,
	'Subjects': BookOpenIcon,
	'Academic Years': CalendarIcon,
};

interface SidebarProps {
	isOpen?: boolean;
	onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
	const [collapsed, setCollapsed] = useState(false);
	const navigate = useNavigate();
	const [schoolName, setSchoolName] = useState('Inkinki Smart School');
	const [navigationItems, setNavigationItems] = useState<Array<{name: string; path: string; icon: any}>>([]);
	const [hoveredItem, setHoveredItem] = useState<string | null>(null);
	const [tooltipPosition, setTooltipPosition] = useState<{top: number; left: number} | null>(null);
	const hoveredElementRef = useRef<HTMLElement | null>(null);

	// Get role-based navigation items - reactive to role changes
	useEffect(() => {
		const checkRole = () => {
			const items = getVisibleNavigationItems();// Debug log
			const mappedItems = items.map(item => ({
				...item,
				icon: iconMap[item.name] || HomeIcon,
			}));
			setNavigationItems(mappedItems);
		};

		// Check immediately
		checkRole();

		// Listen for custom event when staff data is updated
		const handleStaffUpdate = () => {
			checkRole();
		};

		window.addEventListener('staffUpdated', handleStaffUpdate);
		
		// Also check periodically (in case localStorage was updated elsewhere)
		const interval = setInterval(checkRole, 2000);
		
		return () => {
			window.removeEventListener('staffUpdated', handleStaffUpdate);
			clearInterval(interval);
		};
	}, []);

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

	// Update tooltip position when hovered item changes
	useEffect(() => {
		if (collapsed && hoveredItem && hoveredElementRef.current) {
			const rect = hoveredElementRef.current.getBoundingClientRect();
			setTooltipPosition({
				top: rect.top + rect.height / 2,
				left: 80, // 80px from left (collapsed sidebar width)
			});
		} else {
			setTooltipPosition(null);
		}
	}, [collapsed, hoveredItem]);

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
				} fixed left-0 top-0 z-[60] lg:z-[100] h-screen bg-primary-700 text-white flex flex-col transition-all duration-300 shadow-xl ${collapsed ? 'overflow-visible' : 'overflow-hidden'}`}
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

			<nav className="sidebar-nav flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-visible relative" style={{ scrollbarWidth: 'thin', scrollbarColor: '#5850EC #5145CD' }}>
				{navigationItems.length === 0 ? (
					<div className="px-4 py-3 text-white/70 text-sm">
						Loading navigation...
					</div>
				) : (
					navigationItems.map((item, index) => {
					const Icon = item.icon;
					const isHovered = hoveredItem === item.path;
					return (
						<div 
							key={item.path} 
							className="relative"
							ref={(el) => {
								if (isHovered && collapsed) {
									hoveredElementRef.current = el;
								}
							}}
							onMouseEnter={(e) => {
								if (collapsed) {
									hoveredElementRef.current = e.currentTarget;
									setHoveredItem(item.path);
								}
							}}
							onMouseLeave={() => {
								if (hoveredItem === item.path) {
									setHoveredItem(null);
									hoveredElementRef.current = null;
								}
							}}
						>
							<NavLink
								to={item.path}
								onClick={handleNavClick}
								className={({ isActive }) =>
									`relative flex items-center gap-3 px-4 py-3 rounded-[3px] text-sm font-medium transition-all duration-200 ${
										isActive
											? 'bg-white text-primary-700 shadow-md'
											: 'text-white/90 hover:bg-primary-700 hover:text-white'
									} ${collapsed ? 'justify-center' : ''}`
								}
							>
								<Icon className="w-5 h-5 flex-shrink-0" />
								{!collapsed && <span>{item.name}</span>}
							</NavLink>
						</div>
					);
					})
				)}
			</nav>

			<div 
				className="px-3 py-4 border-t border-primary-600 relative"
				ref={(el) => {
					if (hoveredItem === 'logout' && collapsed) {
						hoveredElementRef.current = el;
					}
				}}
				onMouseEnter={(e) => {
					if (collapsed) {
						hoveredElementRef.current = e.currentTarget;
						setHoveredItem('logout');
					}
				}}
				onMouseLeave={() => {
					if (hoveredItem === 'logout') {
						setHoveredItem(null);
						hoveredElementRef.current = null;
					}
				}}
			>
				<div className="relative">
					<button
						onClick={handleLogout}
						className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-[3px] text-sm font-medium text-white/90 hover:bg-red-600 hover:text-white transition-all duration-200 ${
							collapsed ? 'justify-center' : ''
						}`}
					>
						<ArrowLeftOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
						{!collapsed && <span>Logout</span>}
					</button>
				</div>
			</div>

			{/* Single tooltip that moves based on hovered item - appears above scrollbar */}
			{collapsed && hoveredItem && tooltipPosition && (
				<div 
					className="fixed px-3 py-2 bg-primary-700 text-white text-sm rounded-[3px] whitespace-nowrap shadow-xl transition-all duration-200 pointer-events-none"
					style={{ 
						zIndex: 99999,
						left: `${tooltipPosition.left}px`,
						top: `${tooltipPosition.top}px`,
						transform: 'translateY(-50%)',
					}}
				>
					{hoveredItem === 'logout' ? 'Logout' : navigationItems.find(item => item.path === hoveredItem)?.name || ''}
					{/* Arrow pointing to the icon */}
					<div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-primary-700"></div>
				</div>
			)}
		</aside>
		</>
	);
}

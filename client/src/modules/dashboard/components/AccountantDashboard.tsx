import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { getArrayFromResponse } from '../../../utils/apiHelpers';
import AcademicYearFilter from './AcademicYearFilter';
import { 
	BanknotesIcon,
	CurrencyDollarIcon,
	ChartBarIcon,
	DocumentTextIcon,
	ArrowTrendingUpIcon,
	ArrowTrendingDownIcon,
	InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface FinancialStats {
	totalFees: number;
	paidFees: number;
	pendingFees: number;
	totalFeeAmount: number;
	paidFeeAmount: number;
	pendingFeeAmount: number;
	totalExpenses: number;
	approvedExpenses: number;
	pendingExpenses: number;
	totalExpenseAmount: number;
	netBalance: number;
}

interface StatCardProps {
	title: string;
	value: string;
	subtitle: string;
	description: string;
	icon: React.ReactNode;
	color: string;
	onClick?: () => void;
}

function StatCard({ title, value, subtitle, description, icon, color, onClick }: StatCardProps) {
	// Extract border color from icon color - handle both static and dynamic colors
	const getBorderColor = (colorClass: string): string => {
		if (colorClass.includes('bg-green-100')) return 'bg-green-600';
		if (colorClass.includes('bg-orange-100')) return 'bg-orange-600';
		if (colorClass.includes('bg-red-100')) return 'bg-red-600';
		return 'bg-gray-600';
	};
	const borderColor = getBorderColor(color);

	return (
		<div
			onClick={onClick}
			className={`bg-white rounded-[3px] shadow-card p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 relative overflow-hidden ${
				onClick ? 'cursor-pointer hover:scale-105' : ''
			}`}
		>
			<div className={`absolute top-0 left-0 right-0 h-1 ${borderColor}`}></div>
			<div className="flex items-start justify-between mb-3">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<p className="text-sm font-medium text-gray-600">{title}</p>
						<div className="group relative">
							<InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
							<div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
								{description}
							</div>
						</div>
					</div>
					<p className="text-3xl font-bold text-gray-900">{value}</p>
					<p className="text-xs text-gray-500 mt-1">{subtitle}</p>
				</div>
				<div className={`w-12 h-12 rounded-[3px] ${color} flex items-center justify-center shadow-sm`}>
					{icon}
				</div>
			</div>
		</div>
	);
}

export default function AccountantDashboard() {
	const navigate = useNavigate();
	const [schoolId, setSchoolId] = useState<string | null>(null);
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | null>(null);
	const [stats, setStats] = useState<FinancialStats>({
		totalFees: 0,
		paidFees: 0,
		pendingFees: 0,
		totalFeeAmount: 0,
		paidFeeAmount: 0,
		pendingFeeAmount: 0,
		totalExpenses: 0,
		approvedExpenses: 0,
		pendingExpenses: 0,
		totalExpenseAmount: 0,
		netBalance: 0,
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const storedStaff = localStorage.getItem('staff');
		if (storedStaff) {
			try {
				const staff = JSON.parse(storedStaff);
				if (staff.school_id) {
					setSchoolId(staff.school_id);
				}
			} catch {
				// Keep null
			}
		}
	}, []);

	useEffect(() => {
		if (!schoolId) {
			setLoading(false);
			return;
		}

		async function fetchFinancialStats() {
			try {
				setLoading(true);
				
				// Build fee management params with optional academic year filter
				const feeParams: any = { school_id: schoolId };
				if (selectedAcademicYearId) {
					feeParams.academic_id = selectedAcademicYearId;
				}
				
				// Add pagination params for endpoints that support it
				const feeParamsWithPagination = { ...feeParams, page: 1, page_size: 100 };
				const expenseParams = { school_id: schoolId, page: 1, page_size: 100 };
				
				const [feesRes, expensesRes, feeTypesRes] = await Promise.all([
					api.get(`/fee-management/`, { params: feeParamsWithPagination }).catch(() => ({ data: [] })),
					api.get(`/expenses/?school_id=${schoolId}&page=1&page_size=100`).catch(() => ({ data: [] })),
					api.get(`/fee-types/?school_id=${schoolId}`).catch(() => ({ data: [] })),
				]);
				
				console.log('Accountant Dashboard - Financial Data:', {
					feesCount: getArrayFromResponse(feesRes.data).length,
					expensesCount: getArrayFromResponse(expensesRes.data).length,
					feesResponse: feesRes.data,
					expensesResponse: expensesRes.data,
				});

				const fees = getArrayFromResponse(feesRes.data);
				const expenses = getArrayFromResponse(expensesRes.data);
				const feeTypes = getArrayFromResponse(feeTypesRes.data);

				// Calculate fee statistics
				const totalFees = fees.length;
				const paidFees = fees.filter((f: any) => f.status === 'paid' || f.status === 'completed').length;
				const pendingFees = totalFees - paidFees;
				
				// Calculate fee amounts - use amount_paid from fee management records
				const totalFeeAmount = fees.reduce((sum: number, f: any) => sum + (f.amount_paid || 0), 0);
				const paidFeeAmount = fees
					.filter((f: any) => f.status === 'paid' || f.status === 'completed')
					.reduce((sum: number, f: any) => sum + (f.amount_paid || 0), 0);
				const pendingFeeAmount = totalFeeAmount - paidFeeAmount;

				// Calculate expense statistics
				const totalExpenses = expenses.length;
				const approvedExpenses = expenses.filter((e: any) => e.status === 'APPROVED' || e.status === 'PAID').length;
				const pendingExpenses = expenses.filter((e: any) => e.status === 'PENDING').length;
				const totalExpenseAmount = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

				// Calculate net balance (Revenue - Expenses)
				// Revenue = money collected from paid fees
				// Expenses = total expenses recorded
				const netBalance = paidFeeAmount - totalExpenseAmount;

				setStats({
					totalFees,
					paidFees,
					pendingFees,
					totalFeeAmount,
					paidFeeAmount,
					pendingFeeAmount,
					totalExpenses,
					approvedExpenses,
					pendingExpenses,
					totalExpenseAmount,
					netBalance,
				});
			} catch (error) {} finally {
				setLoading(false);
			}
		}

		fetchFinancialStats();
	}, [schoolId, selectedAcademicYearId]);

	const paidPercentage = stats.totalFees > 0 ? (stats.paidFees / stats.totalFees) * 100 : 0;
	const pendingPercentage = stats.totalFees > 0 ? (stats.pendingFees / stats.totalFees) * 100 : 0;

	if (loading) {
		return (
			<>
				<div className="mb-6">
					<h2 className="text-2xl font-bold text-gray-900">Accountant Dashboard</h2>
					<p className="text-gray-600 mt-1">Financial overview and management.</p>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-gray-300"></div>
							<div className="animate-pulse">
								<div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
								<div className="h-8 bg-gray-200 rounded w-1/2"></div>
							</div>
						</div>
					))}
				</div>
			</>
		);
	}

	return (
		<>
			<div className="mb-6">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h2 className="text-2xl font-bold text-gray-900">Accountant Dashboard</h2>
						<p className="text-gray-600 mt-1">Financial overview, fee collections, and expense management.</p>
					</div>
					<div className="w-full sm:w-64">
						<AcademicYearFilter
							schoolId={schoolId}
							selectedAcademicYearId={selectedAcademicYearId}
							onChange={setSelectedAcademicYearId}
							placeholder="Filter by Academic Year"
						/>
					</div>
				</div>
			</div>

			{/* Financial Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatCard
					title="Total Revenue"
					value={`$${stats.paidFeeAmount.toLocaleString()}`}
					subtitle={`From ${stats.paidFees} paid fees`}
					description="Paid fees revenue"
					icon={<CurrencyDollarIcon className="w-6 h-6" />}
					color="bg-green-100 text-green-600"
					onClick={() => navigate('/dashboard/fee-management')}
				/>

				<StatCard
					title="Pending Fees"
					value={`$${stats.pendingFeeAmount.toLocaleString()}`}
					subtitle={`${stats.pendingFees} unpaid fee records`}
					description="Unpaid fees"
					icon={<BanknotesIcon className="w-6 h-6" />}
					color="bg-orange-100 text-orange-600"
					onClick={() => navigate('/dashboard/fee-management')}
				/>

				<StatCard
					title="Total Expenses"
					value={`$${stats.totalExpenseAmount.toLocaleString()}`}
					subtitle={`${stats.totalExpenses} expense records`}
					description="All expenses"
					icon={<ArrowTrendingDownIcon className="w-6 h-6" />}
					color="bg-red-100 text-red-600"
					onClick={() => navigate('/dashboard/expenses')}
				/>

				<StatCard
					title="Net Balance"
					value={`$${stats.netBalance.toLocaleString()}`}
					subtitle={stats.netBalance >= 0 ? 'Profit' : 'Loss'}
					description={`Net balance: $${stats.netBalance.toLocaleString()}`}
					icon={stats.netBalance >= 0 ? <ArrowTrendingUpIcon className="w-6 h-6" /> : <ArrowTrendingDownIcon className="w-6 h-6" />}
					color={stats.netBalance >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
				/>
			</div>

			{/* Fee Analytics */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
				<div className="xl:col-span-2 bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden">
					<div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
					<div className="flex items-center gap-2 mb-6">
						<div>
							<h3 className="text-lg font-semibold text-gray-800">Fee Collection Status</h3>
							<p className="text-xs text-gray-500 mt-1">Breakdown of paid vs pending fee collections</p>
						</div>
						<div className="group relative">
							<InformationCircleIcon className="w-5 h-5 text-gray-400 cursor-help" />
							<div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
								Shows the breakdown of paid vs pending fees. Paid fees represent money collected, while pending fees are still awaiting payment.
							</div>
						</div>
					</div>
					
					<div className="space-y-6">
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-gray-700">Paid Fees</span>
								<span className="text-sm font-semibold text-green-600">
									{stats.paidFees} ({paidPercentage.toFixed(1)}%)
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
								<div
									className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
									style={{ width: `${paidPercentage}%` }}
								/>
							</div>
							<p className="text-xs text-gray-500 mt-1">${stats.paidFeeAmount.toLocaleString()} successfully collected</p>
						</div>

						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-gray-700">Pending Fees</span>
								<span className="text-sm font-semibold text-orange-600">
									{stats.pendingFees} ({pendingPercentage.toFixed(1)}%)
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
								<div
									className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
									style={{ width: `${pendingPercentage}%` }}
								/>
							</div>
							<p className="text-xs text-gray-500 mt-1">${stats.pendingFeeAmount.toLocaleString()} awaiting payment</p>
						</div>

						<div className="pt-4 border-t border-gray-200">
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-gray-600">Total Fee Records</span>
								<span className="text-lg font-bold text-gray-900">{stats.totalFees}</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-gray-600">Total Fee Amount</span>
								<span className="text-lg font-bold text-gray-900">${stats.totalFeeAmount.toLocaleString()}</span>
							</div>
							<p className="text-xs text-gray-500 mt-1">Combined amount of all fee records</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 relative overflow-hidden">
					<div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
					<div className="flex items-center gap-2 mb-6">
						<div>
							<h3 className="text-lg font-semibold text-gray-800">Expense Status</h3>
							<p className="text-xs text-gray-500 mt-1">Overview of expense records by status</p>
						</div>
						<div className="group relative">
							<InformationCircleIcon className="w-5 h-5 text-gray-400 cursor-help" />
							<div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
								Breakdown of expenses by status. Approved/Paid expenses are finalized, while Pending expenses await approval.
							</div>
						</div>
					</div>
					
					<div className="space-y-4">
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-gray-700">Total Expenses</span>
								<span className="text-sm font-semibold text-gray-900">{stats.totalExpenses}</span>
							</div>
							<p className="text-xs text-gray-500">All expense records in the system</p>
						</div>
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-gray-700">Approved/Paid</span>
								<span className="text-sm font-semibold text-green-600">{stats.approvedExpenses}</span>
							</div>
							<p className="text-xs text-gray-500">Expenses that have been finalized and processed</p>
						</div>
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-gray-700">Pending</span>
								<span className="text-sm font-semibold text-orange-600">{stats.pendingExpenses}</span>
							</div>
							<p className="text-xs text-gray-500">Expenses awaiting approval or payment</p>
						</div>
						<div className="pt-4 border-t border-gray-200">
							<div className="flex items-center justify-between mb-1">
								<span className="text-sm font-medium text-gray-600">Total Expense Amount</span>
								<span className="text-lg font-bold text-gray-900">${stats.totalExpenseAmount.toLocaleString()}</span>
							</div>
							<p className="text-xs text-gray-500">Sum of all expense amounts</p>
						</div>
					</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
				<button
					onClick={() => navigate('/dashboard/fee-management')}
					className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 hover:shadow-lg transition-all text-left"
				>
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 rounded-[3px] bg-blue-100 text-blue-600 flex items-center justify-center">
							<BanknotesIcon className="w-6 h-6" />
						</div>
						<div>
							<h3 className="font-semibold text-gray-900">Fee Management</h3>
							<p className="text-sm text-gray-600 mt-1">Manage fee collections</p>
						</div>
					</div>
				</button>

				<button
					onClick={() => navigate('/dashboard/expenses')}
					className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 hover:shadow-lg transition-all text-left"
				>
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 rounded-[3px] bg-red-100 text-red-600 flex items-center justify-center">
							<DocumentTextIcon className="w-6 h-6" />
						</div>
						<div>
							<h3 className="font-semibold text-gray-900">Expense Management</h3>
							<p className="text-sm text-gray-600 mt-1">Track and manage expenses</p>
						</div>
					</div>
				</button>

				<button
					onClick={() => navigate('/dashboard/fees')}
					className="bg-white rounded-[3px] shadow-card p-6 border border-gray-100 hover:shadow-lg transition-all text-left"
				>
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 rounded-[3px] bg-green-100 text-green-600 flex items-center justify-center">
							<ChartBarIcon className="w-6 h-6" />
						</div>
						<div>
							<h3 className="font-semibold text-gray-900">Fee Types</h3>
							<p className="text-sm text-gray-600 mt-1">Configure fee types</p>
						</div>
					</div>
				</button>
			</div>
		</>
	);
}



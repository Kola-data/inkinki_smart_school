import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	type?: 'danger' | 'warning' | 'info';
	loading?: boolean;
}

export default function ConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	type = 'info',
	loading = false,
}: ConfirmModalProps) {
	if (!isOpen) return null;

	const bgColors = {
		danger: 'bg-red-600 hover:bg-red-700',
		warning: 'bg-yellow-600 hover:bg-yellow-700',
		info: 'bg-primary-600 hover:bg-primary-700',
	};

	const iconColors = {
		danger: 'text-red-600',
		warning: 'text-yellow-600',
		info: 'text-primary-600',
	};

	const IconComponent = type === 'danger' || type === 'warning' ? ExclamationTriangleIcon : InformationCircleIcon;

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			<div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
				<div
					className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
					onClick={onClose}
				/>

				<span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
					&#8203;
				</span>

				<div className="inline-block align-bottom bg-white rounded-[3px] text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
					<div className="bg-white">
						<div className="px-4 py-4 sm:px-6 sm:py-4 bg-primary-600 text-white">
							<div className="sm:flex sm:items-center sm:gap-4">
								<div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-[3px] ${
									type === 'danger' ? 'bg-red-100' : type === 'warning' ? 'bg-yellow-100' : 'bg-white bg-opacity-20'
								} sm:mx-0 sm:h-10 sm:w-10`}>
									<IconComponent className={`w-6 h-6 ${
										type === 'danger' ? 'text-red-600' : type === 'warning' ? 'text-yellow-600' : 'text-white'
									}`} />
								</div>
								<div className="mt-3 text-center sm:mt-0 sm:text-left flex-1">
									<h3 className="text-lg leading-6 font-medium text-white">{title}</h3>
								</div>
							</div>
						</div>
						<div className="px-4 pt-4 pb-4 sm:px-6 sm:pb-6">
							<p className="text-sm text-gray-600">{message}</p>
						</div>
					</div>
					<div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
						<button
							type="button"
							onClick={onConfirm}
							disabled={loading}
							className={`w-full inline-flex justify-center rounded-[3px] border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white ${bgColors[type]} focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
						>
							{loading ? (
								<>
									<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Processing...
								</>
							) : (
								confirmText
							)}
						</button>
						<button
							type="button"
							onClick={onClose}
							disabled={loading}
							className="mt-3 w-full inline-flex justify-center rounded-[3px] border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{cancelText}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}


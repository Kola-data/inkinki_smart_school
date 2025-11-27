import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
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

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) {
				onClose();
			}
		};

		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const sizeClasses = {
		sm: 'sm:max-w-md',
		md: 'sm:max-w-lg',
		lg: 'sm:max-w-2xl',
		xl: 'sm:max-w-4xl',
		'2xl': 'sm:max-w-6xl',
		'3xl': 'sm:max-w-7xl',
		'4xl': 'sm:max-w-[90vw]',
	};

	return (
		<div className="fixed inset-0 z-[110] overflow-y-auto">
			<div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
				<div
					className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
					onClick={onClose}
				/>

				<span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
					&#8203;
				</span>

				<div className={`inline-block align-bottom bg-white rounded-[3px] text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} w-full`}>
					<div className="bg-white">
						<div className="flex items-center justify-between px-6 py-4 bg-primary-600 text-white">
							<h3 className="text-lg font-semibold">{title}</h3>
							<button
								onClick={onClose}
								className="text-white hover:text-gray-200 focus:outline-none focus:text-gray-200 transition-colors rounded-[3px] p-1"
								aria-label="Close"
							>
								<XMarkIcon className="w-6 h-6" />
							</button>
						</div>
						<div className="px-6 py-4 max-h-[calc(100vh-180px)] overflow-y-auto">
							{children}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}


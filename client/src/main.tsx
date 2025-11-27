import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './modules/App';
import './styles/index.css';

// Suppress React DevTools warning in production
if (import.meta.env.PROD) {
	console.clear = () => {};
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<BrowserRouter
			future={{
				v7_startTransition: true,
				v7_relativeSplatPath: true,
			}}
		>
			<App />
			<Toaster
				position="top-right"
				reverseOrder={false}
				gutter={8}
				toastOptions={{
					duration: 4000,
					style: {
						background: '#363636',
						color: '#fff',
						borderRadius: '3px',
						padding: '12px 16px',
						fontSize: '14px',
					},
					success: {
						duration: 3000,
						iconTheme: {
							primary: '#10b981',
							secondary: '#fff',
						},
						style: {
							background: '#10b981',
							color: '#fff',
						},
					},
					error: {
						duration: 5000,
						iconTheme: {
							primary: '#ef4444',
							secondary: '#fff',
						},
						style: {
							background: '#ef4444',
							color: '#fff',
						},
					},
				}}
			/>
		</BrowserRouter>
	</React.StrictMode>
);



import type { Config } from 'tailwindcss';

export default {
	content: ['./index.html', './src/**/*.{ts,tsx}'],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: '#5850EC',
					50: '#EEF2FF',
					100: '#E0E7FF',
					600: '#5850EC',
					700: '#5145CD',
				},
				accent: '#7C3AED',
			},
			boxShadow: {
				card: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.05)',
			},
		}
	},
	plugins: [],
} satisfies Config;



/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          500: '#0891b2',
          600: '#0e7490',
          700: '#155e75',
        },
      },
      boxShadow: {
        soft: '0 16px 50px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};

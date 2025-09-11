/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#111827',      // Darker gray for better contrast
        'secondary': '#6b7280',    // Medium gray for secondary text
        'accent': '#4f46e5',       // A modern indigo for accents
        'background': '#ffffff',   // Pure white background
        'surface': '#ffffff',      // White for card backgrounds
        'border': '#e5e7eb',       // A very light gray for borders
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      }
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors for the app
        positive: {
          DEFAULT: '#10b981', // green for owed money
          light: '#d1fae5',
          dark: '#059669',
        },
        negative: {
          DEFAULT: '#ef4444', // red for owes money
          light: '#fee2e2',
          dark: '#dc2626',
        },
        neutral: {
          DEFAULT: '#3b82f6', // blue for actions
          light: '#dbeafe',
          dark: '#2563eb',
        }
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tanda: {
          blue: '#0057A8',
          'blue-dark': '#003d7a',
          'blue-light': '#e6f0fa',
          orange: '#F08000',
          'orange-dark': '#c06800',
          'orange-light': '#fff3e6',
          dark: '#0F172A',
          muted: '#64748B',
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: '#10B981', light: '#34D399', dark: '#059669' },
        secondary:{ DEFAULT: '#3B82F6', light: '#60A5FA', dark: '#2563EB' },
        ev:       { green: '#22C55E', blue: '#0EA5E9', yellow: '#F59E0B', red: '#EF4444' }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':  'spin 3s linear infinite'
      }
    }
  },
  plugins: []
}

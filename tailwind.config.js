/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          950: '#060a14',
          900: '#0a0e1a',
          800: '#111827',
          700: '#1a2236',
          600: '#243049',
        },
        sky: {
          400: '#60a5fa',
          500: '#3b82f6',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}

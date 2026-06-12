/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--c-white) / <alpha-value>)',
        black: 'rgb(var(--c-black) / <alpha-value>)',
        night: {
          950: 'var(--c-night-950)',
          900: 'var(--c-night-900)',
          800: 'var(--c-night-800)',
          700: 'var(--c-night-700)',
          600: 'var(--c-night-600)',
        },
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
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

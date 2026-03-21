/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dce7ff',
          200: '#b9cffe',
          300: '#84a9fc',
          400: '#4d7ef8',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#1e2f6b',
          950: '#111827',
        },
        neon: '#22d3ee',
        accent: '#a855f7',
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
      },
      backgroundImage: {
        'hero-mesh': 'radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.25) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.2) 0%, transparent 60%)',
        'card-glow': 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.15) 0%, transparent 70%)',
      },
      animation: {
        'gradient-x': 'gradient-x 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          pink:   '#ec4899',
          orange: '#f97316',
          teal:   '#14b8a6',
          yellow: '#eab308',
          green:  '#22c55e',
        },
      },
      backgroundImage: {
        'gradient-app':    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-card':   'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        'gradient-purple': 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
        'gradient-blue':   'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
        'gradient-pink':   'linear-gradient(135deg, #f9a8d4 0%, #db2777 100%)',
        'gradient-green':  'linear-gradient(135deg, #6ee7b7 0%, #059669 100%)',
        'gradient-orange': 'linear-gradient(135deg, #fdba74 0%, #ea580c 100%)',
        'gradient-teal':   'linear-gradient(135deg, #5eead4 0%, #0d9488 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glow':  '0 0 20px rgba(99, 102, 241, 0.4)',
        'card':  '0 4px 24px rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

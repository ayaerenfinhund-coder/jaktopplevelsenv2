/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary - Sophisticated Forest Green
        primary: {
          50: '#f2fcf5',
          100: '#e1f8e8',
          200: '#c3eed2',
          300: '#95deb3',
          400: '#5cc58e',
          500: '#34a86f',
          600: '#248756',
          700: '#1d6c45', // Main primary - Deep, rich green
          800: '#1a563a',
          900: '#164731',
          950: '#0b281d',
        },
        // Secondary - Warm Earth / Gold
        secondary: {
          50: '#fbf8f1',
          100: '#f5eedb',
          200: '#ebdcb0',
          300: '#dec27d',
          400: '#d1a44f',
          500: '#c68a32',
          600: '#aa6b26',
          700: '#884f21', // Main secondary
          800: '#703f20',
          900: '#5c341d',
          950: '#341b0d',
        },
        // Accent - Burnt Orange / Rust
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Main accent - Vibrant orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Background colors for PREMIUM dark mode (Zinc based)
        background: {
          DEFAULT: '#09090b', // Zinc 950 - Deepest background
          light: '#18181b',   // Zinc 900 - Card background
          lighter: '#27272a', // Zinc 800 - Borders / Hover
          dark: '#000000',    // Pure black
        },
        // Text colors
        text: {
          primary: '#fafafa',   // Zinc 50 - Almost white
          secondary: '#a1a1aa', // Zinc 400 - Muted text
          muted: '#52525b',     // Zinc 600 - Very muted
        },
        // Status colors - Refined
        success: {
          DEFAULT: '#10b981', // Emerald 500
          dark: '#059669',    // Emerald 600
        },
        warning: {
          DEFAULT: '#f59e0b', // Amber 500
          dark: '#d97706',    // Amber 600
        },
        error: {
          DEFAULT: '#ef4444', // Red 500
          dark: '#dc2626',    // Red 600
        },
        info: {
          DEFAULT: '#3b82f6', // Blue 500
          dark: '#2563eb',    // Blue 600
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
        112: '28rem',
        128: '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'inner-lg': 'inset 0 4px 6px -1px rgb(0 0 0 / 0.3)',
        glow: '0 0 20px rgb(29 108 69 / 0.2)', // Updated glow color
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      screens: {
        xs: '475px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [],
};

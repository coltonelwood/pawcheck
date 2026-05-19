import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FAF7F2',
          200: '#F2EBDF',
          300: '#E5D9C3',
        },
        forest: {
          50: '#EFF4F2',
          100: '#D8E4DE',
          200: '#B1C9BD',
          300: '#7FA493',
          400: '#5A8270',
          500: '#3D6655',
          600: '#2D5A4E',
          700: '#244840',
          800: '#1B3631',
          900: '#122421',
        },
        amber: {
          50: '#FDF6E9',
          100: '#FAE8C8',
          200: '#F5D08F',
          300: '#EFB85B',
          400: '#E8A547',
          500: '#D48E2E',
          600: '#A86E22',
          700: '#7C521A',
          800: '#523612',
          900: '#291B09',
        },
        ink: {
          DEFAULT: '#1A1614',
          soft: '#4A423E',
          mute: '#7C736D',
        },
        urgency: {
          green: '#3D8B5F',
          yellow: '#D48E2E',
          red: '#B83A2B',
        },
        border: '#E5D9C3',
        input: '#E5D9C3',
        ring: '#2D5A4E',
        background: '#FAF7F2',
        foreground: '#1A1614',
        primary: {
          DEFAULT: '#2D5A4E',
          foreground: '#FAF7F2',
        },
        secondary: {
          DEFAULT: '#F2EBDF',
          foreground: '#1A1614',
        },
        muted: {
          DEFAULT: '#F2EBDF',
          foreground: '#7C736D',
        },
        accent: {
          DEFAULT: '#E8A547',
          foreground: '#1A1614',
        },
        destructive: {
          DEFAULT: '#B83A2B',
          foreground: '#FAF7F2',
        },
        card: {
          DEFAULT: '#FDFBF7',
          foreground: '#1A1614',
        },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        lg: '0.875rem',
        md: '0.625rem',
        sm: '0.375rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'subtle-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'subtle-pulse': 'subtle-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config

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
        background: '#000000',
        card: {
          DEFAULT: '#09090B',
          hover: '#121215',
          subtle: '#050505',
        },
        border: {
          DEFAULT: '#27272A',
          muted: '#18181B',
          subtle: '#121215',
        },
        primary: {
          DEFAULT: '#FFFFFF',
          foreground: '#000000',
        },
        accent: {
          white: '#FFFFFF',
          silver: '#E4E4E7',
          gray: '#A1A1AA',
          charcoal: '#3F3F46',
          dark: '#18181B',
        },
        status: {
          healthy: '#FFFFFF',
          warning: '#A1A1AA',
          critical: '#FFFFFF',
          neutral: '#71717A',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'glow-white': '0 0 20px -5px rgba(255, 255, 255, 0.25)',
        'inner-dark': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
}

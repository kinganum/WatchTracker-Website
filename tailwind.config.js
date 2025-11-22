/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
    "!./node_modules/**",
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(0 0% 100%)', // White
        foreground: 'hsl(240 10% 3.9%)', // Almost Black
        card: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(240 10% 3.9%)',
        },
        primary: {
          DEFAULT: 'hsl(240 5.9% 10%)',
          foreground: 'hsl(0 0% 98%)',
        },
        secondary: {
          DEFAULT: 'hsl(240 4.8% 95.9%)',
          foreground: 'hsl(240 5.9% 10%)',
        },
        destructive: {
          DEFAULT: 'hsl(0 84.2% 60.2%)',
          foreground: 'hsl(0 0% 98%)',
        },
        muted: {
          DEFAULT: 'hsl(240 4.8% 95.9%)',
          foreground: 'hsl(240 3.8% 46.1%)',
        },
        accent: {
          DEFAULT: 'hsl(240 4.8% 95.9%)',
          foreground: 'hsl(240 5.9% 10%)',
        },
        border: 'hsl(240 5.9% 90%)',
        input: 'hsl(240 5.9% 90%)',
        ring: 'hsl(240 5.9% 10%)',
      },
      borderRadius: {
        '2xl': '1rem',
      },
      animation: {
        'glow-neutral': 'glow-neutral 2.5s ease-out forwards',
        'glow-anime': 'glow-anime 2.5s ease-out forwards',
        'slide-up': 'slide-up 0.3s ease-out forwards',
        'fade-in-scale': 'fade-in-scale 0.3s ease-out forwards',
      },
      keyframes: {
        'glow-neutral': {
          '0%': { boxShadow: '0 0 0px transparent' },
          '50%': { boxShadow: '0 0 15px 3px hsl(145 63% 49% / 0.6)' },
          '100%': { boxShadow: '0 0 0px transparent' },
        },
        'glow-anime': {
          '0%': { boxShadow: '0 0 0px transparent' },
          '50%': { boxShadow: '0 0 15px 3px hsl(221 83% 53% / 0.6)' },
          '100%': { boxShadow: '0 0 0px transparent' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in-scale': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}


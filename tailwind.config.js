/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Warm & Earthy Palette - Option A from STYLE_PROMPT.md
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Brand Colors - Warm & Inviting
        coral: {
          DEFAULT: '#E76F51',
          50: '#FCF1EE',
          100: '#F9E3DD',
          200: '#F4C7BA',
          300: '#EEAB98',
          400: '#E98F75',
          500: '#E76F51',
          600: '#E2522D',
          700: '#C33D17',
          800: '#923011',
          900: '#61200B',
        },
        sage: {
          DEFAULT: '#6A994E',
          50: '#EFF4EA',
          100: '#DFE9D5',
          200: '#BFD2AB',
          300: '#9FBC81',
          400: '#85AD67',
          500: '#6A994E',
          600: '#55783E',
          700: '#405A2F',
          800: '#2B3C1F',
          900: '#151E10',
        },
        gold: {
          DEFAULT: '#F4A261',
          50: '#FEF7F0',
          100: '#FDEFE1',
          200: '#FBE7C3',
          300: '#F9CFA6',
          400: '#F7B883',
          500: '#F4A261',
          600: '#F18633',
          700: '#E76A0B',
          800: '#B05108',
          900: '#793706',
        },

        // Semantic Colors
        positive: {
          DEFAULT: '#90BE6D', // Soft green for balances
          light: '#D8ECCC',
          dark: '#6D9750',
        },
        negative: {
          DEFAULT: '#F77F00', // Warm orange for debts
          light: '#FEDFC5',
          dark: '#C56500',
        },

        // shadcn/ui semantic tokens
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      fontSize: {
        base: ['16px', { lineHeight: '1.5' }],
      },
      fontFeatureSettings: {
        'tnum': 'tnum',
        'tabular-nums': '"tnum"',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'soft-md': '0 4px 12px rgba(0, 0, 0, 0.10)',
        'soft-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

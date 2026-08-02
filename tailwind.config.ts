import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fffaf3',
        ink: '#292524',
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      fontFamily: {
        sans: [
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px rgba(41,37,36,0.06), 0 4px 16px rgba(41,37,36,0.06)',
        'card-hover': '0 2px 6px rgba(41,37,36,0.08), 0 10px 28px rgba(41,37,36,0.10)',
      },
    },
  },
  plugins: [],
};

export default config;

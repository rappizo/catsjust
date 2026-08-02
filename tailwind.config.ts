import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // 深色霓虹底色
        cream: '#0a0a12',
        // 霓虹夜色文字
        ink: '#f0f0ff',
        // 荧光绿（主色）
        brand: {
          50: 'rgba(46,255,140,0.14)',
          100: 'rgba(46,255,140,0.20)',
          200: 'rgba(46,255,140,0.36)',
          300: '#86ffb8',
          400: '#4dff9d',
          500: '#2eff8c',
          600: '#0fd974',
          700: '#0cb25f',
          800: '#0a8a49',
          900: '#086b39',
        },
        // 荧光紫（辅色）
        accent: {
          50: 'rgba(191,90,242,0.14)',
          100: 'rgba(191,90,242,0.20)',
          200: 'rgba(191,90,242,0.36)',
          300: '#d8a1ff',
          400: '#c47aff',
          500: '#b45af7',
          600: '#9a3cf0',
          700: '#7e2bd0',
          800: '#6420a8',
          900: '#4e1a83',
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
        card: '0 1px 3px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.40)',
        'card-hover':
          '0 2px 6px rgba(0,0,0,0.50), 0 10px 28px rgba(0,0,0,0.45), 0 0 20px rgba(46,255,140,0.10)',
        'neon-green': '0 0 10px rgba(46,255,140,0.50), 0 0 30px rgba(46,255,140,0.25)',
        'neon-purple': '0 0 10px rgba(180,90,247,0.50), 0 0 30px rgba(180,90,247,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;

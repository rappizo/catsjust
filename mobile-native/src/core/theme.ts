/**
 * 深色霓虹主题 token（从 Web 端 tailwind.config.ts 迁移）。
 * 约定与 Web 一致：
 * - 荧光绿(brand-500=#2eff8c)亮度高，其上白色文字对比度差 → 荧光绿底一律用深绿黑文字 `#04281a`
 * - 白字只用于紫色/深色底
 */
export const colors = {
  /** 深色霓虹底色 */
  bg: '#0a0a12',
  /** 霓虹夜色文字 */
  ink: '#f0f0ff',
  /** 次级文字 */
  inkMuted: '#8a8aa3',
  /** 卡片底 */
  card: '#14141f',
  /** 卡片描边（深色下让圆角轮廓清晰） */
  cardBorder: '#2b2b44',
  /** 分割线 */
  border: '#23233a',

  /** 荧光绿（主色） */
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

  /** 荧光紫（辅色） */
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

  /** 荧光绿底上的深绿黑文字（对比度约定） */
  onBrand: '#04281a',

  /** 状态色 */
  danger: '#ff5c5c',
  warn: '#ffb84d',
} as const;

/** 阴影（近似 Web boxShadow token） */
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  neonGreen: {
    shadowColor: '#2eff8c',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
} as const;

/** 圆角 */
export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

/** 间距 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

// theme.ts - Profiti Design System 🌿

export const COLORS = {
  primary: '#2E7D32',
  primaryDark: '#1B5E20',
  primaryLight: '#A5D6A7',

  secondary: '#EFEBE9',
  secondaryDark: '#D7CCC8',
  secondaryLight: '#F5F5F5',

  accent: '#FF8A65',
  accentDark: '#E64A19',
  accentLight: '#FFCCBC',

  success: '#4CAF50',
  warning: '#FFA000',
  error: '#F44336',
  info: '#29B6F6',

  black: '#263238',
  white: '#FFFFFF',

  gray100: '#F9FAFB',
  gray200: '#F1F5F9',
  gray300: '#E2E8F0',
  gray400: '#CBD5E1',
  gray500: '#94A3B8',
  gray600: '#64748B',
  gray700: '#475569',
  gray800: '#334155',
  gray900: '#1E293B',

  background: '#FFFFFF',
  backgroundAlt: '#F8F9FA',
  backgroundDark: '#263238',

  textPrimary: '#263238',
  textSecondary: '#475569',
  textLight: '#64748B',
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  borderFocus: '#2E7D32',
};

export const FONTS = {
  primary: 'System',
  heading: 'System',
  mono: 'Courier',

  thin: 100,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,

  sizeXs: '12',
  sizeSm: '14',
  sizeMd: '16',
  sizeLg: '18',
  sizeXl: '20',
  size2xl: '24',
  size3xl: '30',
  size4xl: '36',
  size5xl: '48',

  lineHeightTight: 1.25,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
};

export const SIZES = {
  base: '4',
  xxs: '2',
  xs: '4',
  sm: '8',
  md: '16',
  lg: '24',
  xl: '32',
  xxl: '48',

  radiusNone: '0',
  radiusSm: '2',
  radiusMd: '6',
  radiusLg: '12',
  radiusXl: '16',
  radiusFull: '9999',
};

export const SHADOWS = {
  md: {
    shadowColor: '#263238',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sm: {
    shadowColor: '#263238',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
};

export const theme = {
  COLORS,
  FONTS,
  SIZES,
  SHADOWS,
};

export default theme;

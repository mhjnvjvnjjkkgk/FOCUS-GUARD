/**
 * FocusGuard Design System - Theme Configuration
 * A beautiful, soft, professional color palette with animations
 */

// Color Palette
export const Colors = {
  // Primary Blue
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',  // Main brand color
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Accent Colors for Features
  accent: {
    orange: '#F97316',   // Alarms
    purple: '#8B5CF6',   // Focus Mode
    pink: '#EC4899',     // Reminders
    green: '#10B981',    // Success/Health
    red: '#EF4444',      // Blocking/Error
    cyan: '#06B6D4',     // Statistics
    amber: '#F59E0B',    // Warning
  },

  // Neutrals
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Backgrounds
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
  },

  // Text
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },
};

// Dark Theme Colors
export const DarkColors = {
  ...Colors,
  background: {
    primary: '#111827',
    secondary: '#1F2937',
    tertiary: '#374151',
  },
  text: {
    primary: '#F9FAFB',
    secondary: '#9CA3AF',
    tertiary: '#6B7280',
    inverse: '#111827',
  },
};

// Typography
export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 28,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
    '5xl': 48,
  },
};

// Spacing
export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
};

// Border Radius - More generous for modern feel
export const BorderRadius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  '3xl': 36,
  full: 9999,
};

// Shadows - Soft, premium feel
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
  },
  // Colored shadows for feature accents
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  }),
};

// Animation Configurations
export const Animations = {
  spring: {
    gentle: {
      damping: 15,
      stiffness: 100,
      mass: 1,
    },
    bouncy: {
      damping: 10,
      stiffness: 150,
      mass: 0.8,
    },
    snappy: {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    },
    smooth: {
      damping: 20,
      stiffness: 180,
      mass: 1,
    },
  },

  timing: {
    fast: 150,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },

  // Entry animation delays for staggered lists
  stagger: {
    fast: 30,
    normal: 50,
    slow: 80,
  },
};

// Component Sizes
export const ComponentSizes = {
  button: {
    sm: { height: 36, paddingHorizontal: 12, fontSize: 14 },
    md: { height: 44, paddingHorizontal: 20, fontSize: 16 },
    lg: { height: 52, paddingHorizontal: 24, fontSize: 18 },
    xl: { height: 60, paddingHorizontal: 32, fontSize: 20 },
  },

  input: {
    sm: { height: 40, paddingHorizontal: 12 },
    md: { height: 48, paddingHorizontal: 16 },
    lg: { height: 56, paddingHorizontal: 20 },
  },

  card: {
    padding: 16,
    borderRadius: 16,
  },

  iconButton: {
    sm: 32,
    md: 44,
    lg: 56,
  },
};

// Feature Colors (for easy access)
export const FeatureColors = {
  alarm: {
    primary: Colors.accent.orange,
    light: '#FFF7ED',
    gradient: ['#F97316', '#EA580C'],
  },
  reminder: {
    primary: Colors.accent.pink,
    light: '#FDF2F8',
    gradient: ['#EC4899', '#DB2777'],
  },
  blocker: {
    primary: Colors.accent.red,
    light: '#FEF2F2',
    gradient: ['#EF4444', '#DC2626'],
  },
  focus: {
    primary: Colors.accent.purple,
    light: '#F5F3FF',
    gradient: ['#8B5CF6', '#7C3AED'],
  },
  stats: {
    primary: Colors.accent.cyan,
    light: '#ECFEFF',
    gradient: ['#06B6D4', '#0891B2'],
  },
};

export default {
  Colors,
  DarkColors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Animations,
  ComponentSizes,
  FeatureColors,
};

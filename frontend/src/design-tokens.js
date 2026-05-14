/**
 * Design Tokens for AlumNet Platform
 * 
 * This file defines the design system tokens used across the application.
 * Tokens are organized by category and can be used in CSS-in-JS or imported
 * for consistency in component development.
 */

export const colors = {
  // Brand colors (primary)
  brand: {
    50: '#eef3ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#2554d8', // primary brand
    600: '#1d46bc',
    700: '#163795',
    800: '#1e3a8a',
    900: '#1e3a8a',
  },

  // Semantic colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Vibrant accent families for module identity and decorative surfaces
  accent: {
    violet: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
    teal: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    coral: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
    },
    amber: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    cyan: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4',
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
    },
    rose: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#e11d48',
      600: '#be123c',
      700: '#9f1239',
      800: '#881337',
      900: '#4c0519',
    },
    emerald: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
  },

  // Module role aliases keep page refreshes consistent across the app
  modules: {
    platform: {
      accent: '#2554d8',
      accentStrong: '#163795',
      surface: '#eef3ff',
      border: '#c7d2fe',
      shadow: 'rgba(37, 84, 216, 0.22)',
    },
    alumni: {
      accent: '#8b5cf6',
      accentStrong: '#6d28d9',
      surface: '#f5f3ff',
      border: '#ddd6fe',
      shadow: 'rgba(139, 92, 246, 0.22)',
    },
    feed: {
      accent: '#f43f5e',
      accentStrong: '#be123c',
      surface: '#fff1f2',
      border: '#fecdd3',
      shadow: 'rgba(244, 63, 94, 0.2)',
    },
    events: {
      accent: '#f59e0b',
      accentStrong: '#b45309',
      surface: '#fffbeb',
      border: '#fde68a',
      shadow: 'rgba(245, 158, 11, 0.2)',
    },
    careers: {
      accent: '#10b981',
      accentStrong: '#047857',
      surface: '#ecfdf5',
      border: '#a7f3d0',
      shadow: 'rgba(16, 185, 129, 0.2)',
    },
    groups: {
      accent: '#14b8a6',
      accentStrong: '#0f766e',
      surface: '#f0fdfa',
      border: '#99f6e4',
      shadow: 'rgba(20, 184, 166, 0.2)',
    },
    gallery: {
      accent: '#06b6d4',
      accentStrong: '#0e7490',
      surface: '#ecfeff',
      border: '#a5f3fc',
      shadow: 'rgba(6, 182, 212, 0.2)',
    },
    newsroom: {
      accent: '#e11d48',
      accentStrong: '#9f1239',
      surface: '#fff1f2',
      border: '#fecdd3',
      shadow: 'rgba(225, 29, 72, 0.2)',
    },
    directory: {
      accent: '#0d9488',
      accentStrong: '#115e59',
      surface: '#f0fdfa',
      border: '#99f6e4',
      shadow: 'rgba(13, 148, 136, 0.2)',
    },
    admin: {
      accent: '#3b82f6',
      accentStrong: '#1d4ed8',
      surface: '#eff6ff',
      border: '#bfdbfe',
      shadow: 'rgba(59, 130, 246, 0.18)',
    },
  },

  // Neutral colors (surface/ink)
  surface: {
    50: '#f8fbff',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  ink: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#28405f',
    800: '#14213d',
    900: '#121a31',
  },

  // Dark mode colors (inverted)
  dark: {
    surface: {
      50: '#0f172a',
      100: '#1e293b',
      200: '#334155',
      300: '#475569',
      400: '#64748b',
      500: '#94a3b8',
      600: '#cbd5e1',
      700: '#e2e8f0',
      800: '#f1f5f9',
      900: '#f8fbff',
    },
    ink: {
      50: '#121a31',
      100: '#14213d',
      200: '#28405f',
      300: '#475569',
      400: '#64748b',
      500: '#94a3b8',
      600: '#cbd5e1',
      700: '#e2e8f0',
      800: '#f1f5f9',
      900: '#f8fafc',
    },
  },
};

export const typography = {
  fontFamily: {
    sans: '"Outfit", "Segoe UI", system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
};

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  32: '8rem',      // 128px
  40: '10rem',     // 160px
  48: '12rem',     // 192px
  56: '14rem',     // 224px
  64: '16rem',     // 256px
};

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  '4xl': '2rem',    // 32px
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  premium: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
  none: 'none',
};

export const transitions = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  timing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};

// Export a complete theme object for convenience
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
};

// CSS custom property string generation
export function generateCSSVariables(prefix = 'al') {
  const variables = {};
  
  // Color variables
  ['brand', 'success', 'warning', 'error', 'info', 'surface', 'ink'].forEach((groupName) => {
    Object.entries(colors[groupName]).forEach(([key, value]) => {
      variables[`--${prefix}-color-${groupName}-${key}`] = value;
    });
  });

  Object.entries(colors.accent).forEach(([accentName, palette]) => {
    Object.entries(palette).forEach(([key, value]) => {
      variables[`--${prefix}-color-accent-${accentName}-${key}`] = value;
    });
  });

  Object.entries(colors.modules).forEach(([moduleName, roleValues]) => {
    Object.entries(roleValues).forEach(([roleName, value]) => {
      variables[`--${prefix}-module-${moduleName}-${roleName}`] = value;
    });
  });
  
  // Dark mode color variables
  Object.entries(colors.dark.surface).forEach(([key, value]) => {
    variables[`--${prefix}-color-surface-dark-${key}`] = value;
  });
  
  Object.entries(colors.dark.ink).forEach(([key, value]) => {
    variables[`--${prefix}-color-ink-dark-${key}`] = value;
  });
  
  // Spacing variables
  Object.entries(spacing).forEach(([key, value]) => {
    variables[`--${prefix}-spacing-${key}`] = value;
  });
  
  // Border radius variables
  Object.entries(borderRadius).forEach(([key, value]) => {
    variables[`--${prefix}-radius-${key}`] = value;
  });
  
  return variables;
}

/**
 * Get theme-aware color value
 * @param {string} colorType - 'surface' or 'ink'
 * @param {number} shade - Shade number (50-900)
 * @param {boolean} isDarkMode - Whether dark mode is active
 * @returns {string} CSS variable reference
 */
export function getThemeColor(colorType, shade, isDarkMode = false) {
  const prefix = 'al';
  if (isDarkMode && (colorType === 'surface' || colorType === 'ink')) {
    return `var(--${prefix}-color-${colorType}-dark-${shade})`;
  }
  return `var(--${prefix}-color-${colorType}-${shade})`;
}

/**
 * Generate CSS for dark mode
 * @returns {string} CSS string for dark mode
 */
export function generateDarkModeCSS() {
  return `
    .dark {
      --color-surface-50: var(--al-color-surface-dark-50);
      --color-surface-100: var(--al-color-surface-dark-100);
      --color-surface-200: var(--al-color-surface-dark-200);
      --color-surface-300: var(--al-color-surface-dark-300);
      --color-surface-400: var(--al-color-surface-dark-400);
      --color-surface-500: var(--al-color-surface-dark-500);
      --color-surface-600: var(--al-color-surface-dark-600);
      --color-surface-700: var(--al-color-surface-dark-700);
      --color-surface-800: var(--al-color-surface-dark-800);
      --color-surface-900: var(--al-color-surface-dark-900);
      
      --color-ink-50: var(--al-color-ink-dark-50);
      --color-ink-100: var(--al-color-ink-dark-100);
      --color-ink-200: var(--al-color-ink-dark-200);
      --color-ink-300: var(--al-color-ink-dark-300);
      --color-ink-400: var(--al-color-ink-dark-400);
      --color-ink-500: var(--al-color-ink-dark-500);
      --color-ink-600: var(--al-color-ink-dark-600);
      --color-ink-700: var(--al-color-ink-dark-700);
      --color-ink-800: var(--al-color-ink-dark-800);
      --color-ink-900: var(--al-color-ink-dark-900);
      
      color-scheme: dark;
    }
    
    @media (prefers-color-scheme: dark) {
      :root:not(.light) {
        --color-surface-50: var(--al-color-surface-dark-50);
        --color-surface-100: var(--al-color-surface-dark-100);
        --color-surface-200: var(--al-color-surface-dark-200);
        --color-surface-300: var(--al-color-surface-dark-300);
        --color-surface-400: var(--al-color-surface-dark-400);
        --color-surface-500: var(--al-color-surface-dark-500);
        --color-surface-600: var(--al-color-surface-dark-600);
        --color-surface-700: var(--al-color-surface-dark-700);
        --color-surface-800: var(--al-color-surface-dark-800);
        --color-surface-900: var(--al-color-surface-dark-900);
        
        --color-ink-50: var(--al-color-ink-dark-50);
        --color-ink-100: var(--al-color-ink-dark-100);
        --color-ink-200: var(--al-color-ink-dark-200);
        --color-ink-300: var(--al-color-ink-dark-300);
        --color-ink-400: var(--al-color-ink-dark-400);
        --color-ink-500: var(--al-color-ink-dark-500);
        --color-ink-600: var(--al-color-ink-dark-600);
        --color-ink-700: var(--al-color-ink-dark-700);
        --color-ink-800: var(--al-color-ink-dark-800);
        --color-ink-900: var(--al-color-ink-dark-900);
        
        color-scheme: dark;
      }
    }
  `;
}

export default theme;

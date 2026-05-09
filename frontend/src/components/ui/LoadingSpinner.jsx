/**
 * Loading Spinner Component
 * Provides optimized loading indicators with performance considerations
 */

import { useTheme } from '../../context/ThemeContext.jsx';

const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'primary',
  className = '',
  showLabel = false,
  label = 'Loading...'
}) => {
  const { isDarkMode } = useTheme();

  const sizeClasses = {
    xs: 'w-4 h-4 border-2',
    sm: 'w-6 h-6 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  };

  const variantClasses = {
    primary: isDarkMode 
      ? 'border-surface-700 border-t-brand-400' 
      : 'border-surface-200 border-t-brand-600',
    secondary: isDarkMode
      ? 'border-surface-600 border-t-ink-300'
      : 'border-surface-300 border-t-ink-600',
    success: isDarkMode
      ? 'border-surface-700 border-t-success-400'
      : 'border-surface-200 border-t-success-600',
    warning: isDarkMode
      ? 'border-surface-700 border-t-warning-400'
      : 'border-surface-200 border-t-warning-600',
    error: isDarkMode
      ? 'border-surface-700 border-t-error-400'
      : 'border-surface-200 border-t-error-600'
  };

  return (
    <div 
      className={`inline-flex flex-col items-center justify-center ${className}`}
      role="status"
      aria-label={showLabel ? label : undefined}
    >
      <div 
        className={`
          rounded-full animate-spin
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          will-change-transform
        `}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="mt-2 text-sm font-medium text-ink-600 dark:text-ink-300">
          {label}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
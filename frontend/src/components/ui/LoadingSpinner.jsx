/**
 * Loading Spinner Component
 * Provides optimized loading indicators with performance considerations
 */

import { useTheme } from "../../context/ThemeContext.jsx";

const LoadingSpinner = ({
  size = "md",
  variant = "primary",
  className = "",
  showLabel = false,
  label = "Loading..."
}) => {
  const { isDarkMode } = useTheme();

  const sizeClasses = {
    xs: "w-4 h-4 border-2",
    sm: "w-6 h-6 border-2",
    md: "w-8 h-8 border-[3px]",
    lg: "w-12 h-12 border-4",
    xl: "w-16 h-16 border-4"
  };

  const variantClasses = {
    primary: isDarkMode
      ? "border-surface-700 border-t-brand-400"
      : "border-surface-200 border-t-brand-600",
    secondary: isDarkMode
      ? "border-surface-600 border-t-ink-300"
      : "border-surface-300 border-t-ink-600",
    success: isDarkMode
      ? "border-surface-700 border-t-success-400"
      : "border-surface-200 border-t-success-600",
    warning: isDarkMode
      ? "border-surface-700 border-t-warning-400"
      : "border-surface-200 border-t-warning-600",
    error: isDarkMode
      ? "border-surface-700 border-t-error-400"
      : "border-surface-200 border-t-error-600",
    violet: isDarkMode
      ? "border-surface-700 border-t-accent-violet-400"
      : "border-accent-violet-100 border-t-accent-violet-600",
    teal: isDarkMode
      ? "border-surface-700 border-t-accent-teal-400"
      : "border-accent-teal-100 border-t-accent-teal-600",
    coral: isDarkMode
      ? "border-surface-700 border-t-accent-coral-400"
      : "border-accent-coral-100 border-t-accent-coral-600",
    amber: isDarkMode
      ? "border-surface-700 border-t-accent-amber-400"
      : "border-accent-amber-100 border-t-accent-amber-600",
    cyan: isDarkMode
      ? "border-surface-700 border-t-accent-cyan-400"
      : "border-accent-cyan-100 border-t-accent-cyan-600",
    emerald: isDarkMode
      ? "border-surface-700 border-t-accent-emerald-400"
      : "border-accent-emerald-100 border-t-accent-emerald-600",
    rose: isDarkMode
      ? "border-surface-700 border-t-accent-rose-400"
      : "border-accent-rose-100 border-t-accent-rose-600"
  };

  const resolvedSize = sizeClasses[size] ? size : "md";
  const resolvedVariant = variantClasses[variant] ? variant : "primary";

  return (
    <div 
      className={`inline-flex flex-col items-center justify-center ${className}`}
      role="status"
      aria-label={showLabel ? label : undefined}
    >
      <div 
        className={`
          rounded-full animate-spin
          ${sizeClasses[resolvedSize]}
          ${variantClasses[resolvedVariant]}
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

export const LoadingSkeleton = ({ className = "", rounded = "rounded-xl" }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-slate-100 via-brand-50 to-slate-100 dark:from-surface-800 dark:via-surface-700 dark:to-surface-800 ${rounded} ${className}`}
    aria-hidden="true"
  />
);

export default LoadingSpinner;

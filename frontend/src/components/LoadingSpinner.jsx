/**
 * Reusable loading spinner component with consistent styling
 * Supports different sizes and colors
 */
function LoadingSpinner({ 
  size = "md", 
  color = "brand", 
  className = "",
  label = "Loading..."
}) {
  const sizeClasses = {
    xs: "h-3 w-3 border-2",
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-3",
    lg: "h-8 w-8 border-4",
    xl: "h-12 w-12 border-4"
  };

  const colorClasses = {
    brand: "border-brand-600 border-t-transparent",
    gradient: "border-accent-violet-500 border-r-accent-coral-500 border-b-accent-teal-500 border-t-transparent",
    white: "border-white border-t-transparent",
    slate: "border-slate-600 border-t-transparent",
    primary: "border-brand-600 border-t-transparent",
    success: "border-success-600 border-t-transparent",
    warning: "border-warning-600 border-t-transparent",
    danger: "border-error-600 border-t-transparent",
    violet: "border-accent-violet-600 border-t-transparent",
    teal: "border-accent-teal-600 border-t-transparent",
    coral: "border-accent-coral-600 border-t-transparent",
    amber: "border-accent-amber-600 border-t-transparent",
    cyan: "border-accent-cyan-600 border-t-transparent",
    emerald: "border-accent-emerald-600 border-t-transparent",
    rose: "border-accent-rose-600 border-t-transparent"
  };

  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label={label}
    >
      <div 
        className={`
          ${sizeClasses[size] || sizeClasses.md}
          ${colorClasses[color] || colorClasses.brand}
          rounded-full animate-spin
        `}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Button loading spinner - designed to be used inside buttons
 */
function ButtonLoadingSpinner({ size = "sm", color = "white" }) {
  return <LoadingSpinner size={size} color={color} className="mr-2" />;
}

/**
 * Page loading overlay - full screen loading indicator
 */
function PageLoadingOverlay({ label = "Loading..." }) {
  return (
    <div className="fixed inset-0 bg-white/82 dark:bg-surface-900/82 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="rounded-2xl border border-brand-100 bg-white/90 px-8 py-7 text-center shadow-xl shadow-brand-500/10 dark:border-surface-700 dark:bg-surface-800/90">
        <LoadingSpinner size="lg" color="gradient" />
        <p className="mt-4 text-slate-600 font-semibold dark:text-ink-300">{label}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading text with spinner
 */
function InlineLoading({ text = "Loading...", size = "sm", color = "brand" }) {
  return (
    <div className="inline-flex items-center gap-2">
      <LoadingSpinner size={size} color={color} />
      <span className="text-slate-600 text-sm font-medium dark:text-ink-300">{text}</span>
    </div>
  );
}

export default LoadingSpinner;
export { LoadingSpinner, ButtonLoadingSpinner, PageLoadingOverlay, InlineLoading };

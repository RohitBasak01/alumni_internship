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
    white: "border-white border-t-transparent",
    slate: "border-slate-600 border-t-transparent",
    primary: "border-[#6366f1] border-t-transparent",
    success: "border-emerald-600 border-t-transparent",
    warning: "border-amber-600 border-t-transparent",
    danger: "border-rose-600 border-t-transparent"
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
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" color="brand" />
        <p className="mt-4 text-slate-600 font-medium">{label}</p>
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
      <span className="text-slate-600 text-sm font-medium">{text}</span>
    </div>
  );
}

export default LoadingSpinner;
export { ButtonLoadingSpinner, PageLoadingOverlay, InlineLoading };
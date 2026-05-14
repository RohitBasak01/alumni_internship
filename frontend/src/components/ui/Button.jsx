import PropTypes from "prop-types";

/**
 * A versatile button component with multiple variants and sizes.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Visual button style
 * @param {string} props.size - 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {boolean} props.loading - Shows a loading spinner
 * @param {string} props.leftIcon - Material icon name to display on the left
 * @param {string} props.rightIcon - Material icon name to display on the right
 * @param {boolean} props.iconOnly - Whether this is an icon-only button
 * @param {boolean} props.fullWidth - Whether the button should fill its container
 * @param {function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Other props passed to the button element
 */
const Button = ({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  iconOnly = false,
  fullWidth = false,
  onClick,
  className = "",
  ...rest
}) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none";

  const variantClasses = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98] shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 focus-visible:ring-brand-500",
    gradient: "bg-gradient-to-r from-brand-600 via-accent-violet-500 to-accent-coral-500 text-white hover:shadow-xl hover:shadow-brand-500/25 active:scale-[0.98] focus-visible:ring-accent-violet-500",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-[0.98] focus-visible:ring-slate-300 dark:bg-surface-800 dark:text-ink-100 dark:border-surface-700 dark:hover:bg-surface-700",
    soft: "bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100 active:scale-[0.98] focus-visible:ring-brand-400 dark:bg-brand-500/15 dark:text-brand-100 dark:border-brand-400/20",
    outline: "bg-transparent text-brand-600 border border-brand-300 hover:bg-brand-50 active:scale-[0.98] focus-visible:ring-brand-300 dark:text-brand-200 dark:border-brand-400/40 dark:hover:bg-brand-500/10",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 active:scale-[0.98] focus-visible:ring-slate-300 dark:text-ink-200 dark:hover:bg-surface-700",
    danger: "bg-error-600 text-white hover:bg-error-700 active:scale-[0.98] shadow-lg shadow-error-500/20 hover:shadow-error-500/30 focus-visible:ring-error-500",
    success: "bg-success-600 text-white hover:bg-success-700 active:scale-[0.98] shadow-lg shadow-success-500/20 hover:shadow-success-500/30 focus-visible:ring-success-500",
    warning: "bg-warning-500 text-white hover:bg-warning-600 active:scale-[0.98] shadow-lg shadow-warning-500/20 hover:shadow-warning-500/30 focus-visible:ring-warning-500",
    icon: "bg-white text-slate-700 border border-slate-200 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.96] focus-visible:ring-brand-400 dark:bg-surface-800 dark:text-ink-100 dark:border-surface-700 dark:hover:bg-surface-700",
  };

  const sizeClasses = {
    xs: iconOnly ? "h-8 w-8 text-xs" : "px-3 py-1.5 text-xs",
    sm: iconOnly ? "h-9 w-9 text-sm" : "px-4 py-2 text-sm",
    md: iconOnly ? "h-11 w-11 text-base" : "px-5 py-2.5 text-base",
    lg: iconOnly ? "h-12 w-12 text-lg" : "px-7 py-3.5 text-lg",
    xl: iconOnly ? "h-14 w-14 text-xl" : "px-9 py-4 text-xl",
  };

  const loadingSpinner = (
    <svg className="h-4 w-4 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  const resolvedVariant = variantClasses[variant] ? variant : "primary";
  const resolvedSize = sizeClasses[size] ? size : "md";
  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses[resolvedVariant]} ${sizeClasses[resolvedSize]} ${widthClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading && loadingSpinner}
      {leftIcon && !loading && (
        <span className="material-symbols-outlined" style={{ fontSize: "1.125em" }}>
          {leftIcon}
        </span>
      )}
      {!iconOnly && children}
      {rightIcon && !loading && (
        <span className="material-symbols-outlined" style={{ fontSize: "1.125em" }}>
          {rightIcon}
        </span>
      )}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["primary", "gradient", "secondary", "soft", "outline", "ghost", "danger", "success", "warning", "icon"]),
  size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  leftIcon: PropTypes.string,
  rightIcon: PropTypes.string,
  iconOnly: PropTypes.bool,
  fullWidth: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default Button;

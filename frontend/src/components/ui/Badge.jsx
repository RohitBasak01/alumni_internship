import PropTypes from "prop-types";

/**
 * A small status badge for labeling, notifications, or status indicators.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Badge content
 * @param {string} props.variant - Visual badge style
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 * @param {boolean} props.pill - Whether the badge should be pill-shaped (fully rounded)
 * @param {string} props.leftIcon - Material icon name to display on the left
 * @param {string} props.rightIcon - Material icon name to display on the right
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Other props passed to the span element
 */
const Badge = ({
  children,
  variant = "default",
  size = "md",
  pill = false,
  leftIcon,
  rightIcon,
  className = "",
  ...rest
}) => {
  const baseClasses = "inline-flex items-center justify-center gap-1 font-bold whitespace-nowrap border";

  const variantClasses = {
    default: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-surface-700 dark:text-ink-100 dark:border-surface-600",
    primary: "bg-brand-100 text-brand-800 border-brand-200 dark:bg-brand-500/15 dark:text-brand-100 dark:border-brand-400/20",
    success: "bg-success-100 text-success-800 border-success-200 dark:bg-success-500/15 dark:text-success-100 dark:border-success-400/20",
    warning: "bg-warning-100 text-warning-800 border-warning-200 dark:bg-warning-500/15 dark:text-warning-100 dark:border-warning-400/20",
    danger: "bg-error-100 text-error-800 border-error-200 dark:bg-error-500/15 dark:text-error-100 dark:border-error-400/20",
    outline: "bg-transparent text-slate-700 border-slate-300 dark:text-ink-200 dark:border-surface-600",
    role: "bg-accent-violet-50 text-accent-violet-800 border-accent-violet-200 dark:bg-accent-violet-500/15 dark:text-accent-violet-100 dark:border-accent-violet-400/20",
    status: "bg-accent-teal-50 text-accent-teal-800 border-accent-teal-200 dark:bg-accent-teal-500/15 dark:text-accent-teal-100 dark:border-accent-teal-400/20",
    category: "bg-accent-cyan-50 text-accent-cyan-800 border-accent-cyan-200 dark:bg-accent-cyan-500/15 dark:text-accent-cyan-100 dark:border-accent-cyan-400/20",
    count: "bg-accent-coral-50 text-accent-coral-800 border-accent-coral-200 dark:bg-accent-coral-500/15 dark:text-accent-coral-100 dark:border-accent-coral-400/20",
    violet: "bg-accent-violet-50 text-accent-violet-800 border-accent-violet-200 dark:bg-accent-violet-500/15 dark:text-accent-violet-100 dark:border-accent-violet-400/20",
    teal: "bg-accent-teal-50 text-accent-teal-800 border-accent-teal-200 dark:bg-accent-teal-500/15 dark:text-accent-teal-100 dark:border-accent-teal-400/20",
    coral: "bg-accent-coral-50 text-accent-coral-800 border-accent-coral-200 dark:bg-accent-coral-500/15 dark:text-accent-coral-100 dark:border-accent-coral-400/20",
    amber: "bg-accent-amber-50 text-accent-amber-800 border-accent-amber-200 dark:bg-accent-amber-500/15 dark:text-accent-amber-100 dark:border-accent-amber-400/20",
    cyan: "bg-accent-cyan-50 text-accent-cyan-800 border-accent-cyan-200 dark:bg-accent-cyan-500/15 dark:text-accent-cyan-100 dark:border-accent-cyan-400/20",
    emerald: "bg-accent-emerald-50 text-accent-emerald-800 border-accent-emerald-200 dark:bg-accent-emerald-500/15 dark:text-accent-emerald-100 dark:border-accent-emerald-400/20",
    rose: "bg-accent-rose-50 text-accent-rose-800 border-accent-rose-200 dark:bg-accent-rose-500/15 dark:text-accent-rose-100 dark:border-accent-rose-400/20",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  const roundedClass = pill ? "rounded-full" : "rounded-lg";

  const iconSize = size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base";
  const resolvedVariant = variantClasses[variant] ? variant : "default";
  const resolvedSize = sizeClasses[size] ? size : "md";

  return (
    <span
      className={`${baseClasses} ${variantClasses[resolvedVariant]} ${sizeClasses[resolvedSize]} ${roundedClass} ${className}`}
      {...rest}
    >
      {leftIcon && (
        <span className={`material-symbols-outlined ${iconSize}`} style={{ fontSize: "1em" }}>
          {leftIcon}
        </span>
      )}
      {children}
      {rightIcon && (
        <span className={`material-symbols-outlined ${iconSize}`} style={{ fontSize: "1em" }}>
          {rightIcon}
        </span>
      )}
    </span>
  );
};

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    "default", "primary", "success", "warning", "danger", "outline",
    "role", "status", "category", "count",
    "violet", "teal", "coral", "amber", "cyan", "emerald", "rose",
  ]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  pill: PropTypes.bool,
  leftIcon: PropTypes.string,
  rightIcon: PropTypes.string,
  className: PropTypes.string,
};

export default Badge;

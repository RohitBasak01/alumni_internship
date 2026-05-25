import PropTypes from "prop-types";

/**
 * A versatile button component with multiple variants and sizes.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Visual button style
 * @param {string} props.tone - Color tone for token-aware variants
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
  tone = "brand",
  size = "md",
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  iconOnly = false,
  fullWidth = false,
  onClick,
  className = "",
  style,
  ...rest
}) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl border border-transparent transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--btn-accent)] focus-visible:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none dark:focus-visible:ring-offset-surface-900";

  const variantClasses = {
    primary: "bg-[var(--btn-accent)] text-white shadow-[0_16px_32px_-16px_var(--btn-shadow)] hover:bg-[var(--btn-strong)] hover:shadow-[0_18px_38px_-14px_var(--btn-shadow)] active:scale-[0.98]",
    gradient: "bg-[linear-gradient(135deg,var(--btn-accent),var(--btn-mid),var(--btn-strong))] text-white shadow-[0_16px_32px_-16px_var(--btn-shadow)] hover:shadow-[0_18px_38px_-14px_var(--btn-shadow)] active:scale-[0.98]",
    secondary: "border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-ink-soft)] shadow-sm hover:border-[var(--ui-border-strong)] hover:bg-[var(--ui-surface-strong)] hover:text-[var(--ui-ink)] active:scale-[0.98]",
    soft: "border-[var(--btn-border)] bg-[var(--btn-soft)] text-[var(--btn-strong)] hover:bg-[var(--btn-soft-strong)] active:scale-[0.98] dark:bg-[var(--btn-dark-soft)] dark:text-white/90 dark:border-[var(--btn-dark-border)]",
    outline: "border-[var(--btn-border)] bg-transparent text-[var(--btn-strong)] hover:bg-[var(--btn-soft)] active:scale-[0.98] dark:text-white/90 dark:border-[var(--btn-dark-border)] dark:hover:bg-[var(--btn-dark-soft)]",
    ghost: "bg-transparent text-[var(--ui-ink-soft)] hover:bg-[var(--btn-soft)] hover:text-[var(--btn-strong)] active:scale-[0.98] dark:text-ink-200 dark:hover:bg-[var(--btn-dark-soft)]",
    danger: "bg-error-600 text-white hover:bg-error-700 active:scale-[0.98] shadow-lg shadow-error-500/20 hover:shadow-error-500/30 focus-visible:ring-error-500",
    success: "bg-success-600 text-white hover:bg-success-700 active:scale-[0.98] shadow-lg shadow-success-500/20 hover:shadow-success-500/30 focus-visible:ring-success-500",
    warning: "bg-warning-500 text-white hover:bg-warning-600 active:scale-[0.98] shadow-lg shadow-warning-500/20 hover:shadow-warning-500/30 focus-visible:ring-warning-500",
    icon: "border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-ink-soft)] shadow-sm hover:border-[var(--btn-border)] hover:bg-[var(--btn-soft)] hover:text-[var(--btn-strong)] active:scale-[0.96] dark:bg-surface-800 dark:text-ink-100 dark:border-surface-700 dark:hover:bg-[var(--btn-dark-soft)]",
  };

  const toneStyles = {
    brand: {
      "--btn-accent": "var(--ui-brand)",
      "--btn-mid": "var(--ui-violet)",
      "--btn-strong": "var(--ui-brand-strong)",
      "--btn-soft": "var(--ui-brand-soft)",
      "--btn-soft-strong": "var(--al-color-brand-100, #e0e7ff)",
      "--btn-border": "var(--al-color-brand-200, #c7d2fe)",
      "--btn-shadow": "rgba(37, 84, 216, 0.24)",
      "--btn-dark-soft": "rgba(37, 84, 216, 0.18)",
      "--btn-dark-border": "rgba(129, 140, 248, 0.28)",
    },
    violet: {
      "--btn-accent": "var(--ui-violet)",
      "--btn-mid": "var(--al-color-accent-cyan-500, #06b6d4)",
      "--btn-strong": "var(--al-color-accent-violet-700, #6d28d9)",
      "--btn-soft": "var(--al-color-accent-violet-50, #f5f3ff)",
      "--btn-soft-strong": "var(--al-color-accent-violet-100, #ede9fe)",
      "--btn-border": "var(--al-color-accent-violet-200, #ddd6fe)",
      "--btn-shadow": "rgba(139, 92, 246, 0.24)",
      "--btn-dark-soft": "rgba(139, 92, 246, 0.18)",
      "--btn-dark-border": "rgba(167, 139, 250, 0.3)",
    },
    teal: {
      "--btn-accent": "var(--ui-teal)",
      "--btn-mid": "var(--ui-cyan)",
      "--btn-strong": "var(--al-color-accent-teal-700, #0f766e)",
      "--btn-soft": "var(--al-color-accent-teal-50, #f0fdfa)",
      "--btn-soft-strong": "var(--al-color-accent-teal-100, #ccfbf1)",
      "--btn-border": "var(--al-color-accent-teal-200, #99f6e4)",
      "--btn-shadow": "rgba(20, 184, 166, 0.22)",
      "--btn-dark-soft": "rgba(20, 184, 166, 0.18)",
      "--btn-dark-border": "rgba(94, 234, 212, 0.28)",
    },
    coral: {
      "--btn-accent": "var(--ui-coral)",
      "--btn-mid": "var(--al-color-accent-amber-500, #f59e0b)",
      "--btn-strong": "var(--al-color-accent-coral-700, #be123c)",
      "--btn-soft": "var(--al-color-accent-coral-50, #fff1f2)",
      "--btn-soft-strong": "var(--al-color-accent-coral-100, #ffe4e6)",
      "--btn-border": "var(--al-color-accent-coral-200, #fecdd3)",
      "--btn-shadow": "rgba(244, 63, 94, 0.22)",
      "--btn-dark-soft": "rgba(244, 63, 94, 0.18)",
      "--btn-dark-border": "rgba(251, 113, 133, 0.3)",
    },
    amber: {
      "--btn-accent": "var(--al-color-accent-amber-500, #f59e0b)",
      "--btn-mid": "var(--ui-coral)",
      "--btn-strong": "var(--al-color-accent-amber-700, #b45309)",
      "--btn-soft": "var(--al-color-accent-amber-50, #fffbeb)",
      "--btn-soft-strong": "var(--al-color-accent-amber-100, #fef3c7)",
      "--btn-border": "var(--al-color-accent-amber-200, #fde68a)",
      "--btn-shadow": "rgba(245, 158, 11, 0.22)",
      "--btn-dark-soft": "rgba(245, 158, 11, 0.18)",
      "--btn-dark-border": "rgba(251, 191, 36, 0.3)",
    },
    cyan: {
      "--btn-accent": "var(--ui-cyan)",
      "--btn-mid": "var(--ui-teal)",
      "--btn-strong": "var(--al-color-accent-cyan-700, #0e7490)",
      "--btn-soft": "var(--al-color-accent-cyan-50, #ecfeff)",
      "--btn-soft-strong": "var(--al-color-accent-cyan-100, #cffafe)",
      "--btn-border": "var(--al-color-accent-cyan-200, #a5f3fc)",
      "--btn-shadow": "rgba(6, 182, 212, 0.22)",
      "--btn-dark-soft": "rgba(6, 182, 212, 0.18)",
      "--btn-dark-border": "rgba(103, 232, 249, 0.28)",
    },
    emerald: {
      "--btn-accent": "var(--al-color-accent-emerald-500, #10b981)",
      "--btn-mid": "var(--ui-teal)",
      "--btn-strong": "var(--al-color-accent-emerald-700, #047857)",
      "--btn-soft": "var(--al-color-accent-emerald-50, #ecfdf5)",
      "--btn-soft-strong": "var(--al-color-accent-emerald-100, #d1fae5)",
      "--btn-border": "var(--al-color-accent-emerald-200, #a7f3d0)",
      "--btn-shadow": "rgba(16, 185, 129, 0.22)",
      "--btn-dark-soft": "rgba(16, 185, 129, 0.18)",
      "--btn-dark-border": "rgba(52, 211, 153, 0.28)",
    },
    rose: {
      "--btn-accent": "var(--al-color-accent-rose-500, #e11d48)",
      "--btn-mid": "var(--ui-violet)",
      "--btn-strong": "var(--al-color-accent-rose-700, #9f1239)",
      "--btn-soft": "var(--al-color-accent-rose-50, #fff1f2)",
      "--btn-soft-strong": "var(--al-color-accent-rose-100, #ffe4e6)",
      "--btn-border": "var(--al-color-accent-rose-200, #fecdd3)",
      "--btn-shadow": "rgba(225, 29, 72, 0.22)",
      "--btn-dark-soft": "rgba(225, 29, 72, 0.18)",
      "--btn-dark-border": "rgba(251, 113, 133, 0.3)",
    },
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
  const resolvedToneStyles = toneStyles[tone] || toneStyles.brand;
  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses[resolvedVariant]} ${sizeClasses[resolvedSize]} ${widthClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      style={{ ...resolvedToneStyles, ...style }}
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
  tone: PropTypes.oneOf(["brand", "violet", "teal", "coral", "amber", "cyan", "emerald", "rose"]),
  size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  leftIcon: PropTypes.string,
  rightIcon: PropTypes.string,
  iconOnly: PropTypes.bool,
  fullWidth: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Button;

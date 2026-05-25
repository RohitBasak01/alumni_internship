import PropTypes from "prop-types";

/**
 * A small status badge for labeling, notifications, or status indicators.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Badge content
 * @param {string} props.variant - Visual badge style
 * @param {string} props.tone - Color tone for token-aware variants
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
  tone = "brand",
  size = "md",
  pill = false,
  leftIcon,
  rightIcon,
  className = "",
  style,
  ...rest
}) => {
  const baseClasses = "inline-flex items-center justify-center gap-1 font-bold whitespace-nowrap border";

  const variantClasses = {
    default: "bg-[var(--ui-surface-muted)] text-[var(--ui-ink-soft)] border-[var(--ui-border)] dark:bg-surface-700 dark:text-ink-100 dark:border-surface-600",
    primary: "bg-[var(--badge-soft)] text-[var(--badge-strong)] border-[var(--badge-border)] dark:bg-[var(--badge-dark-soft)] dark:text-white/90 dark:border-[var(--badge-dark-border)]",
    soft: "bg-[var(--badge-soft)] text-[var(--badge-strong)] border-[var(--badge-border)] dark:bg-[var(--badge-dark-soft)] dark:text-white/90 dark:border-[var(--badge-dark-border)]",
    solid: "bg-[var(--badge-accent)] text-white border-transparent shadow-[0_8px_18px_-12px_var(--badge-shadow)]",
    gradient: "bg-[linear-gradient(135deg,var(--badge-accent),var(--badge-strong))] text-white border-transparent shadow-[0_8px_18px_-12px_var(--badge-shadow)]",
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

  const toneStyles = {
    brand: {
      "--badge-accent": "var(--ui-brand)",
      "--badge-strong": "var(--ui-brand-strong)",
      "--badge-soft": "var(--ui-brand-soft)",
      "--badge-border": "var(--al-color-brand-200, #c7d2fe)",
      "--badge-shadow": "rgba(37, 84, 216, 0.2)",
      "--badge-dark-soft": "rgba(37, 84, 216, 0.18)",
      "--badge-dark-border": "rgba(129, 140, 248, 0.28)",
    },
    violet: {
      "--badge-accent": "var(--ui-violet)",
      "--badge-strong": "var(--al-color-accent-violet-700, #6d28d9)",
      "--badge-soft": "var(--al-color-accent-violet-50, #f5f3ff)",
      "--badge-border": "var(--al-color-accent-violet-200, #ddd6fe)",
      "--badge-shadow": "rgba(139, 92, 246, 0.2)",
      "--badge-dark-soft": "rgba(139, 92, 246, 0.18)",
      "--badge-dark-border": "rgba(167, 139, 250, 0.3)",
    },
    teal: {
      "--badge-accent": "var(--ui-teal)",
      "--badge-strong": "var(--al-color-accent-teal-700, #0f766e)",
      "--badge-soft": "var(--al-color-accent-teal-50, #f0fdfa)",
      "--badge-border": "var(--al-color-accent-teal-200, #99f6e4)",
      "--badge-shadow": "rgba(20, 184, 166, 0.2)",
      "--badge-dark-soft": "rgba(20, 184, 166, 0.18)",
      "--badge-dark-border": "rgba(94, 234, 212, 0.28)",
    },
    coral: {
      "--badge-accent": "var(--ui-coral)",
      "--badge-strong": "var(--al-color-accent-coral-700, #be123c)",
      "--badge-soft": "var(--al-color-accent-coral-50, #fff1f2)",
      "--badge-border": "var(--al-color-accent-coral-200, #fecdd3)",
      "--badge-shadow": "rgba(244, 63, 94, 0.2)",
      "--badge-dark-soft": "rgba(244, 63, 94, 0.18)",
      "--badge-dark-border": "rgba(251, 113, 133, 0.3)",
    },
    amber: {
      "--badge-accent": "var(--al-color-accent-amber-500, #f59e0b)",
      "--badge-strong": "var(--al-color-accent-amber-700, #b45309)",
      "--badge-soft": "var(--al-color-accent-amber-50, #fffbeb)",
      "--badge-border": "var(--al-color-accent-amber-200, #fde68a)",
      "--badge-shadow": "rgba(245, 158, 11, 0.2)",
      "--badge-dark-soft": "rgba(245, 158, 11, 0.18)",
      "--badge-dark-border": "rgba(251, 191, 36, 0.3)",
    },
    cyan: {
      "--badge-accent": "var(--ui-cyan)",
      "--badge-strong": "var(--al-color-accent-cyan-700, #0e7490)",
      "--badge-soft": "var(--al-color-accent-cyan-50, #ecfeff)",
      "--badge-border": "var(--al-color-accent-cyan-200, #a5f3fc)",
      "--badge-shadow": "rgba(6, 182, 212, 0.2)",
      "--badge-dark-soft": "rgba(6, 182, 212, 0.18)",
      "--badge-dark-border": "rgba(103, 232, 249, 0.28)",
    },
    emerald: {
      "--badge-accent": "var(--al-color-accent-emerald-500, #10b981)",
      "--badge-strong": "var(--al-color-accent-emerald-700, #047857)",
      "--badge-soft": "var(--al-color-accent-emerald-50, #ecfdf5)",
      "--badge-border": "var(--al-color-accent-emerald-200, #a7f3d0)",
      "--badge-shadow": "rgba(16, 185, 129, 0.2)",
      "--badge-dark-soft": "rgba(16, 185, 129, 0.18)",
      "--badge-dark-border": "rgba(52, 211, 153, 0.28)",
    },
    rose: {
      "--badge-accent": "var(--al-color-accent-rose-500, #e11d48)",
      "--badge-strong": "var(--al-color-accent-rose-700, #9f1239)",
      "--badge-soft": "var(--al-color-accent-rose-50, #fff1f2)",
      "--badge-border": "var(--al-color-accent-rose-200, #fecdd3)",
      "--badge-shadow": "rgba(225, 29, 72, 0.2)",
      "--badge-dark-soft": "rgba(225, 29, 72, 0.18)",
      "--badge-dark-border": "rgba(251, 113, 133, 0.3)",
    },
  };

  const iconSize = size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base";
  const resolvedVariant = variantClasses[variant] ? variant : "default";
  const resolvedSize = sizeClasses[size] ? size : "md";
  const resolvedToneStyles = toneStyles[tone] || toneStyles.brand;

  return (
    <span
      className={`${baseClasses} ${variantClasses[resolvedVariant]} ${sizeClasses[resolvedSize]} ${roundedClass} ${className}`}
      style={{ ...resolvedToneStyles, ...style }}
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
    "soft", "solid", "gradient",
    "role", "status", "category", "count",
    "violet", "teal", "coral", "amber", "cyan", "emerald", "rose",
  ]),
  tone: PropTypes.oneOf(["brand", "violet", "teal", "coral", "amber", "cyan", "emerald", "rose"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  pill: PropTypes.bool,
  leftIcon: PropTypes.string,
  rightIcon: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Badge;

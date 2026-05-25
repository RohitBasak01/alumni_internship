import PropTypes from "prop-types";

/**
 * A flexible card component with multiple variants.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.variant - 'default' | 'premium' | 'glass' | 'elevated' | 'flat'
 * @param {string} props.tone - Color tone for vibrant/tinted cards
 * @param {boolean} props.hoverable - Whether the card should have hover effects
 * @param {boolean} props.padding - Whether to include padding (can be true, false, or size string)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Other props passed to the div element
 */
const Card = ({
  children,
  variant = "default",
  tone = "brand",
  hoverable = false,
  padding = true,
  className = "",
  ...rest
}) => {
  const baseClasses = "rounded-2xl transition-all duration-300";

  const variantClasses = {
    default: "bg-[var(--ui-surface-strong)] border border-[var(--ui-border)] shadow-sm dark:bg-surface-800 dark:border-surface-700",
    premium: "bg-[var(--ui-surface-strong)] border border-[var(--ui-border)] shadow-[var(--ui-shadow-md)] dark:bg-surface-800 dark:border-surface-700 dark:shadow-black/20",
    glass: "bg-white/72 backdrop-blur-md border border-white/40 shadow-[var(--ui-shadow-sm)] dark:bg-surface-800/72 dark:border-surface-700/50",
    elevated: "bg-[var(--ui-surface-strong)] border border-[var(--ui-border-strong)] shadow-[var(--ui-shadow-lg)] dark:bg-surface-800 dark:border-surface-700 dark:shadow-black/25",
    flat: "bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] dark:bg-surface-800/70 dark:border-surface-700",
    surface: "bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-[var(--ui-shadow-sm)] backdrop-blur-sm dark:bg-surface-800/80 dark:border-surface-700",
    vibrant: "border border-[var(--card-border)] shadow-[0_18px_42px_-26px_var(--card-shadow)] bg-[linear-gradient(135deg,var(--card-soft),rgba(255,255,255,0.96)_58%)] dark:bg-[linear-gradient(135deg,var(--card-dark-soft),rgba(15,23,42,0.96)_62%)]",
    tinted: "border border-[var(--card-border)] bg-[var(--card-soft)] shadow-sm dark:bg-[var(--card-dark-soft)] dark:border-[var(--card-dark-border)]",
    gradient: "border border-white/20 text-white shadow-xl shadow-slate-900/20 bg-[linear-gradient(135deg,var(--card-accent),var(--card-strong))]",
  };

  const toneClasses = {
    brand: "[--card-accent:var(--ui-brand)] [--card-strong:var(--ui-brand-strong)] [--card-soft:var(--ui-brand-soft)] [--card-border:var(--al-color-brand-200,#c7d2fe)] [--card-shadow:rgba(37,84,216,0.22)] [--card-dark-soft:rgba(37,84,216,0.14)] [--card-dark-border:rgba(129,140,248,0.28)]",
    violet: "[--card-accent:var(--ui-violet)] [--card-strong:var(--al-color-accent-violet-700,#6d28d9)] [--card-soft:var(--al-color-accent-violet-50,#f5f3ff)] [--card-border:var(--al-color-accent-violet-200,#ddd6fe)] [--card-shadow:rgba(139,92,246,0.22)] [--card-dark-soft:rgba(139,92,246,0.16)] [--card-dark-border:rgba(167,139,250,0.3)]",
    teal: "[--card-accent:var(--ui-teal)] [--card-strong:var(--al-color-accent-teal-700,#0f766e)] [--card-soft:var(--al-color-accent-teal-50,#f0fdfa)] [--card-border:var(--al-color-accent-teal-200,#99f6e4)] [--card-shadow:rgba(20,184,166,0.22)] [--card-dark-soft:rgba(20,184,166,0.16)] [--card-dark-border:rgba(94,234,212,0.28)]",
    coral: "[--card-accent:var(--ui-coral)] [--card-strong:var(--al-color-accent-coral-700,#be123c)] [--card-soft:var(--al-color-accent-coral-50,#fff1f2)] [--card-border:var(--al-color-accent-coral-200,#fecdd3)] [--card-shadow:rgba(244,63,94,0.2)] [--card-dark-soft:rgba(244,63,94,0.15)] [--card-dark-border:rgba(251,113,133,0.3)]",
    amber: "[--card-accent:var(--al-color-accent-amber-500,#f59e0b)] [--card-strong:var(--al-color-accent-amber-700,#b45309)] [--card-soft:var(--al-color-accent-amber-50,#fffbeb)] [--card-border:var(--al-color-accent-amber-200,#fde68a)] [--card-shadow:rgba(245,158,11,0.2)] [--card-dark-soft:rgba(245,158,11,0.16)] [--card-dark-border:rgba(251,191,36,0.3)]",
    cyan: "[--card-accent:var(--ui-cyan)] [--card-strong:var(--al-color-accent-cyan-700,#0e7490)] [--card-soft:var(--al-color-accent-cyan-50,#ecfeff)] [--card-border:var(--al-color-accent-cyan-200,#a5f3fc)] [--card-shadow:rgba(6,182,212,0.2)] [--card-dark-soft:rgba(6,182,212,0.16)] [--card-dark-border:rgba(103,232,249,0.28)]",
    emerald: "[--card-accent:var(--al-color-accent-emerald-500,#10b981)] [--card-strong:var(--al-color-accent-emerald-700,#047857)] [--card-soft:var(--al-color-accent-emerald-50,#ecfdf5)] [--card-border:var(--al-color-accent-emerald-200,#a7f3d0)] [--card-shadow:rgba(16,185,129,0.2)] [--card-dark-soft:rgba(16,185,129,0.16)] [--card-dark-border:rgba(52,211,153,0.28)]",
    rose: "[--card-accent:var(--al-color-accent-rose-500,#e11d48)] [--card-strong:var(--al-color-accent-rose-700,#9f1239)] [--card-soft:var(--al-color-accent-rose-50,#fff1f2)] [--card-border:var(--al-color-accent-rose-200,#fecdd3)] [--card-shadow:rgba(225,29,72,0.2)] [--card-dark-soft:rgba(225,29,72,0.15)] [--card-dark-border:rgba(251,113,133,0.3)]",
  };

  const resolvedVariant = variantClasses[variant] ? variant : "default";
  const resolvedTone = toneClasses[tone] ? tone : "brand";
  const hoverClasses = hoverable ? "hover:shadow-xl hover:-translate-y-1 hover:border-[var(--card-border)]" : "";
  const paddingClasses = padding === true ? "p-6" : padding === false ? "" : padding;

  return (
    <div
      className={`${baseClasses} ${toneClasses[resolvedTone]} ${variantClasses[resolvedVariant]} ${hoverClasses} ${paddingClasses} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["default", "premium", "glass", "elevated", "flat", "surface", "vibrant", "tinted", "gradient"]),
  tone: PropTypes.oneOf(["brand", "violet", "teal", "coral", "amber", "cyan", "emerald", "rose"]),
  hoverable: PropTypes.bool,
  padding: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  className: PropTypes.string,
};

/**
 * CardHeader component for card titles and actions.
 */
export const CardHeader = ({ children, className = "", ...rest }) => (
  <div className={`pb-4 border-b border-slate-100 dark:border-surface-700 ${className}`} {...rest}>
    {children}
  </div>
);

CardHeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * CardTitle component for card headings.
 */
export const CardTitle = ({ children, className = "", ...rest }) => (
  <h3 className={`text-xl font-bold text-slate-900 dark:text-ink-50 ${className}`} {...rest}>
    {children}
  </h3>
);

CardTitle.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * CardDescription component for card subtitles.
 */
export const CardDescription = ({ children, className = "", ...rest }) => (
  <p className={`text-slate-600 mt-1 dark:text-ink-300 ${className}`} {...rest}>
    {children}
  </p>
);

CardDescription.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * CardContent component for main card content.
 */
export const CardContent = ({ children, className = "", ...rest }) => (
  <div className={`pt-4 ${className}`} {...rest}>
    {children}
  </div>
);

CardContent.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * CardFooter component for card actions and metadata.
 */
export const CardFooter = ({ children, className = "", ...rest }) => (
  <div className={`pt-4 border-t border-slate-100 dark:border-surface-700 ${className}`} {...rest}>
    {children}
  </div>
);

CardFooter.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Card;

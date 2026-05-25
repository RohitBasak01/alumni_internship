import PropTypes from "prop-types";

/**
 * A customizable input component with various states and sizes.
 * 
 * @param {Object} props
 * @param {string} props.type - Input type (text, email, password, etc.)
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 * @param {string} props.tone - Color tone for focus and success states
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {boolean} props.error - Whether the input has an error state
 * @param {boolean} props.success - Whether the input has a success state
 * @param {string} props.leftIcon - Material icon name to display on the left
 * @param {string} props.rightIcon - Material icon name to display on the right
 * @param {string} props.label - Label text (if provided, renders with label)
 * @param {string} props.helperText - Helper text below the input
 * @param {string} props.errorText - Error text (overrides helperText when error is true)
 * @param {string} props.className - Additional CSS classes for the input wrapper
 * @param {string} props.inputClassName - Additional CSS classes for the input
 * @param {Object} props.rest - Other props passed to the input element
 */
const Input = ({
  type = "text",
  size = "md",
  tone = "brand",
  disabled = false,
  error = false,
  success = false,
  leftIcon,
  rightIcon,
  label,
  helperText,
  errorText,
  successText,
  className = "",
  inputClassName = "",
  style,
  ...rest
}) => {
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-5 py-4 text-lg",
  };

  const baseInputClasses = "w-full bg-transparent border-none outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-ink-500";
  const stateClasses = error
    ? "text-error-700 dark:text-error-200"
    : "text-[var(--ui-ink)] dark:text-ink-50";

  const stateWrapperClasses = error
    ? "border-error-300 bg-error-50/60 focus-within:border-error-500 focus-within:ring-error-500 dark:border-error-400/30 dark:bg-error-500/10"
    : success
      ? "border-success-300 bg-success-50/60 focus-within:border-success-500 focus-within:ring-success-500 dark:border-success-400/30 dark:bg-success-500/10"
      : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)] focus-within:border-[var(--input-accent)] focus-within:ring-[var(--input-accent)] dark:border-surface-700 dark:bg-surface-800";

  const wrapperClasses = `flex items-center border rounded-xl shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-offset-2 focus-within:shadow-md focus-within:ring-offset-white dark:focus-within:ring-offset-surface-900 ${
    error
      ? "focus-within:shadow-error-500/10"
    : success
        ? "focus-within:shadow-success-500/10"
        : "focus-within:shadow-[var(--input-shadow)]"
  } ${stateWrapperClasses} ${disabled ? "cursor-not-allowed opacity-70" : ""} ${sizeClasses[size] || sizeClasses.md} ${className}`;

  const iconClasses = error
    ? "flex-shrink-0 text-error-500"
    : success
      ? "flex-shrink-0 text-success-600"
      : "flex-shrink-0 text-[var(--input-accent)] dark:text-ink-400";
  const leftIconSize = size === "sm" ? 18 : size === "md" ? 20 : 24;
  const rightIconSize = size === "sm" ? 18 : size === "md" ? 20 : 24;

  const toneStyles = {
    brand: { "--input-accent": "var(--ui-brand)", "--input-shadow": "0 12px 24px rgba(37, 84, 216, 0.12)" },
    violet: { "--input-accent": "var(--ui-violet)", "--input-shadow": "0 12px 24px rgba(139, 92, 246, 0.12)" },
    teal: { "--input-accent": "var(--ui-teal)", "--input-shadow": "0 12px 24px rgba(20, 184, 166, 0.12)" },
    coral: { "--input-accent": "var(--ui-coral)", "--input-shadow": "0 12px 24px rgba(244, 63, 94, 0.12)" },
    amber: { "--input-accent": "var(--al-color-accent-amber-500, #f59e0b)", "--input-shadow": "0 12px 24px rgba(245, 158, 11, 0.12)" },
    cyan: { "--input-accent": "var(--ui-cyan)", "--input-shadow": "0 12px 24px rgba(6, 182, 212, 0.12)" },
    emerald: { "--input-accent": "var(--al-color-accent-emerald-500, #10b981)", "--input-shadow": "0 12px 24px rgba(16, 185, 129, 0.12)" },
    rose: { "--input-accent": "var(--al-color-accent-rose-500, #e11d48)", "--input-shadow": "0 12px 24px rgba(225, 29, 72, 0.12)" },
  };
  const resolvedToneStyles = toneStyles[tone] || toneStyles.brand;

  const renderHelperText = () => {
    if (error && errorText) {
      return <p className="mt-1.5 text-sm font-medium text-error-600 dark:text-error-300">{errorText}</p>;
    }
    if (success && successText) {
      return <p className="mt-1.5 text-sm font-medium text-success-700 dark:text-success-300">{successText}</p>;
    }
    if (helperText) {
      return <p className="mt-1.5 text-sm text-slate-500 dark:text-ink-400">{helperText}</p>;
    }
    return null;
  };

  const inputElement = (
    <div className={wrapperClasses} style={{ ...resolvedToneStyles, ...style }}>
      {leftIcon && (
        <span className={`material-symbols-outlined mr-3 ${iconClasses}`} style={{ fontSize: leftIconSize }}>
          {leftIcon}
        </span>
      )}
      <input
        type={type}
        className={`${baseInputClasses} ${stateClasses} ${inputClassName}`}
        disabled={disabled}
        aria-invalid={error || undefined}
        {...rest}
      />
      {rightIcon && (
        <span className={`material-symbols-outlined ml-3 ${iconClasses}`} style={{ fontSize: rightIconSize }}>
          {rightIcon}
        </span>
      )}
    </div>
  );

  if (label) {
    return (
      <div className="w-full">
        <label className="block text-sm font-semibold text-[var(--ui-ink-soft)] mb-2 dark:text-ink-200">
          {label}
          {rest.required && <span className="text-error-500 ml-1">*</span>}
        </label>
        {inputElement}
        {renderHelperText()}
      </div>
    );
  }

  return (
    <>
      {inputElement}
      {renderHelperText()}
    </>
  );
};

Input.propTypes = {
  type: PropTypes.string,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  tone: PropTypes.oneOf(["brand", "violet", "teal", "coral", "amber", "cyan", "emerald", "rose"]),
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  success: PropTypes.bool,
  leftIcon: PropTypes.string,
  rightIcon: PropTypes.string,
  label: PropTypes.string,
  helperText: PropTypes.string,
  errorText: PropTypes.string,
  successText: PropTypes.string,
  className: PropTypes.string,
  inputClassName: PropTypes.string,
  style: PropTypes.object,
};

export default Input;

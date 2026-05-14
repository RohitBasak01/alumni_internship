import PropTypes from "prop-types";

/**
 * A customizable input component with various states and sizes.
 * 
 * @param {Object} props
 * @param {string} props.type - Input type (text, email, password, etc.)
 * @param {string} props.size - 'sm' | 'md' | 'lg'
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
    : "text-slate-900 dark:text-ink-50";

  const stateWrapperClasses = error
    ? "border-error-300 bg-error-50/60 focus-within:border-error-500 focus-within:ring-error-500 dark:border-error-400/30 dark:bg-error-500/10"
    : success
      ? "border-success-300 bg-success-50/60 focus-within:border-success-500 focus-within:ring-success-500 dark:border-success-400/30 dark:bg-success-500/10"
      : "border-slate-200 bg-slate-50/80 focus-within:border-brand-500 focus-within:ring-brand-500 dark:border-surface-700 dark:bg-surface-800";

  const wrapperClasses = `flex items-center border rounded-xl shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-offset-2 focus-within:shadow-md focus-within:ring-offset-white dark:focus-within:ring-offset-surface-900 ${
    error
      ? "focus-within:shadow-error-500/10"
      : success
        ? "focus-within:shadow-success-500/10"
        : "focus-within:shadow-brand-500/10"
  } ${stateWrapperClasses} ${disabled ? "cursor-not-allowed opacity-70" : ""} ${sizeClasses[size] || sizeClasses.md} ${className}`;

  const iconClasses = error
    ? "flex-shrink-0 text-error-500"
    : success
      ? "flex-shrink-0 text-success-600"
      : "flex-shrink-0 text-slate-500 dark:text-ink-400";
  const leftIconSize = size === "sm" ? 18 : size === "md" ? 20 : 24;
  const rightIconSize = size === "sm" ? 18 : size === "md" ? 20 : 24;

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
    <div className={wrapperClasses}>
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
        <label className="block text-sm font-semibold text-slate-700 mb-2 dark:text-ink-200">
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
};

export default Input;

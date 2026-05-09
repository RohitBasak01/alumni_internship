import React from 'react';
import PropTypes from 'prop-types';

/**
 * A customizable input component with various states and sizes.
 * 
 * @param {Object} props
 * @param {string} props.type - Input type (text, email, password, etc.)
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {boolean} props.error - Whether the input has an error state
 * @param {string} props.leftIcon - Material icon name to display on the left
 * @param {string} props.rightIcon - Material icon name to display on the right
 * @param {string} props.label - Label text (if provided, renders with label)
 * @param {string} props.helperText - Helper text below the input
 * @param {string} props.errorText - Error text (overrides helperText when error is true)
 * @param {string} props.className - Additional CSS classes for the input wrapper
 * @param {Object} props.rest - Other props passed to the input element
 */
const Input = ({
  type = 'text',
  size = 'md',
  disabled = false,
  error = false,
  leftIcon,
  rightIcon,
  label,
  helperText,
  errorText,
  className = '',
  ...rest
}) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg',
  };

  const baseInputClasses = 'w-full bg-transparent border-none outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50';
  const stateClasses = error
    ? 'text-red-600 focus:ring-red-500'
    : 'text-slate-900 focus:ring-brand-500';

  const wrapperClasses = `flex items-center border rounded-2xl transition-all duration-200 focus-within:ring-2 focus-within:ring-offset-2 ${
    error
      ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500'
      : 'border-slate-300 focus-within:border-brand-500 focus-within:ring-brand-500'
  } ${disabled ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'} ${sizeClasses[size]} ${className}`;

  const iconClasses = 'flex-shrink-0 text-slate-500';
  const leftIconSize = size === 'sm' ? 18 : size === 'md' ? 20 : 24;
  const rightIconSize = size === 'sm' ? 18 : size === 'md' ? 20 : 24;

  const renderHelperText = () => {
    if (error && errorText) {
      return <p className="mt-1 text-sm text-red-600">{errorText}</p>;
    }
    if (helperText) {
      return <p className="mt-1 text-sm text-slate-500">{helperText}</p>;
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
        className={`${baseInputClasses} ${stateClasses}`}
        disabled={disabled}
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
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
          {rest.required && <span className="text-red-500 ml-1">*</span>}
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
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  leftIcon: PropTypes.string,
  rightIcon: PropTypes.string,
  label: PropTypes.string,
  helperText: PropTypes.string,
  errorText: PropTypes.string,
  className: PropTypes.string,
};

export default Input;
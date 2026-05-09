import React from 'react';
import PropTypes from 'prop-types';

/**
 * A versatile button component with multiple variants and sizes.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * @param {string} props.size - 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {boolean} props.loading - Shows a loading spinner
 * @param {string} props.leftIcon - Material icon name to display on the left
 * @param {string} props.rightIcon - Material icon name to display on the right
 * @param {function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Other props passed to the button element
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  onClick,
  className = '',
  ...rest
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98] shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 focus:ring-brand-500',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-[0.98] focus:ring-slate-300',
    outline: 'bg-transparent text-brand-600 border border-brand-300 hover:bg-brand-50 active:scale-[0.98] focus:ring-brand-300',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 active:scale-[0.98] focus:ring-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] shadow-lg shadow-red-500/20 hover:shadow-red-500/30 focus:ring-red-500',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
  };

  const loadingSpinner = (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading && loadingSpinner}
      {leftIcon && !loading && (
        <span className="material-symbols-outlined mr-2" style={{ fontSize: '1.125em' }}>
          {leftIcon}
        </span>
      )}
      {children}
      {rightIcon && !loading && (
        <span className="material-symbols-outlined ml-2" style={{ fontSize: '1.125em' }}>
          {rightIcon}
        </span>
      )}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'ghost', 'danger']),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  leftIcon: PropTypes.string,
  rightIcon: PropTypes.string,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default Button;
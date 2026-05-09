import React from 'react';
import PropTypes from 'prop-types';

/**
 * A small status badge for labeling, notifications, or status indicators.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Badge content
 * @param {string} props.variant - 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline'
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 * @param {boolean} props.pill - Whether the badge should be pill-shaped (fully rounded)
 * @param {string} props.leftIcon - Material icon name to display on the left
 * @param {string} props.rightIcon - Material icon name to display on the right
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Other props passed to the span element
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  pill = false,
  leftIcon,
  rightIcon,
  className = '',
  ...rest
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium whitespace-nowrap';

  const variantClasses = {
    default: 'bg-slate-100 text-slate-800',
    primary: 'bg-brand-100 text-brand-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    outline: 'bg-transparent text-slate-700 border border-slate-300',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const roundedClass = pill ? 'rounded-full' : 'rounded-lg';

  const iconSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${roundedClass} ${className}`}
      {...rest}
    >
      {leftIcon && (
        <span className={`material-symbols-outlined mr-1 ${iconSize}`} style={{ fontSize: '1em' }}>
          {leftIcon}
        </span>
      )}
      {children}
      {rightIcon && (
        <span className={`material-symbols-outlined ml-1 ${iconSize}`} style={{ fontSize: '1em' }}>
          {rightIcon}
        </span>
      )}
    </span>
  );
};

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger', 'outline']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  pill: PropTypes.bool,
  leftIcon: PropTypes.string,
  rightIcon: PropTypes.string,
  className: PropTypes.string,
};

export default Badge;
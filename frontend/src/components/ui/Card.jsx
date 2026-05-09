import React from 'react';
import PropTypes from 'prop-types';

/**
 * A flexible card component with multiple variants.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.variant - 'default' | 'premium' | 'glass' | 'elevated' | 'flat'
 * @param {boolean} props.hoverable - Whether the card should have hover effects
 * @param {boolean} props.padding - Whether to include padding (can be true, false, or size string)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Other props passed to the div element
 */
const Card = ({
  children,
  variant = 'default',
  hoverable = false,
  padding = true,
  className = '',
  ...rest
}) => {
  const baseClasses = 'rounded-3xl transition-all duration-300';

  const variantClasses = {
    default: 'bg-white border border-slate-200/60 shadow-sm',
    premium: 'bg-white border border-slate-200/60 shadow-premium',
    glass: 'bg-white/70 backdrop-blur-md border border-white/20 shadow-glass',
    elevated: 'bg-white border border-slate-200 shadow-xl',
    flat: 'bg-slate-50 border border-slate-100',
  };

  const hoverClasses = hoverable ? 'hover:shadow-lg hover:-translate-y-1' : '';
  const paddingClasses = padding === true ? 'p-6' : padding === false ? '' : padding;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${paddingClasses} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'premium', 'glass', 'elevated', 'flat']),
  hoverable: PropTypes.bool,
  padding: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  className: PropTypes.string,
};

/**
 * CardHeader component for card titles and actions.
 */
export const CardHeader = ({ children, className = '', ...rest }) => (
  <div className={`pb-4 border-b border-slate-100 ${className}`} {...rest}>
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
export const CardTitle = ({ children, className = '', ...rest }) => (
  <h3 className={`text-xl font-bold text-slate-900 ${className}`} {...rest}>
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
export const CardDescription = ({ children, className = '', ...rest }) => (
  <p className={`text-slate-600 mt-1 ${className}`} {...rest}>
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
export const CardContent = ({ children, className = '', ...rest }) => (
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
export const CardFooter = ({ children, className = '', ...rest }) => (
  <div className={`pt-4 border-t border-slate-100 ${className}`} {...rest}>
    {children}
  </div>
);

CardFooter.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Card;
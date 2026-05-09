/**
 * Theme Toggle Component
 * Provides a button to switch between light and dark modes
 */

import { useTheme } from '../context/ThemeContext.jsx';

const ThemeToggle = ({ size = 'md', showLabel = false, className = '' }) => {
  const { theme, toggleTheme, isDarkMode } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex items-center justify-center
        rounded-full bg-surface-200 dark:bg-surface-700
        text-ink-700 dark:text-ink-300
        hover:bg-surface-300 dark:hover:bg-surface-600
        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-surface-800
        transition-all duration-300 ease-in-out
        ${sizeClasses[size]}
        ${className}
      `}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun icon (light mode) */}
      <span
        className={`
          absolute transition-all duration-300 ease-in-out
          ${isDarkMode ? 'opacity-0 scale-0 rotate-90' : 'opacity-100 scale-100 rotate-0'}
          ${iconSize[size]}
        `}
        aria-hidden="true"
      >
        ☀️
      </span>
      
      {/* Moon icon (dark mode) */}
      <span
        className={`
          absolute transition-all duration-300 ease-in-out
          ${isDarkMode ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-90'}
          ${iconSize[size]}
        `}
        aria-hidden="true"
      >
        🌙
      </span>

      {/* Optional label */}
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
/**
 * Theme Context for Dark Mode Support
 * Provides theme state and toggle functionality across the application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or system preference
  const getInitialTheme = () => {
    if (typeof window === 'undefined') return 'light';
    
    const storedTheme = localStorage.getItem('alumnet-theme');
    if (storedTheme) return storedTheme;
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);
  const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');

  // Update theme in localStorage and on document element
  useEffect(() => {
    localStorage.setItem('alumnet-theme', theme);
    setIsDarkMode(theme === 'dark');
    
    // Update data-theme attribute on document element
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update Tailwind dark mode class
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only change if user hasn't manually set a preference
      if (!localStorage.getItem('alumnet-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setLightTheme = () => setTheme('light');
  const setDarkTheme = () => setTheme('dark');

  const value = {
    theme,
    isDarkMode,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
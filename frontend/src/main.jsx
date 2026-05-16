import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { initializeAccessibility } from "./utils/accessibility.js";
import { generateCSSVariables, generateDarkModeCSS } from "./design-tokens.js";
import "./styles.css";
import "./styles/animations.css";
import "./styles/dark-mode.css";
import "./styles/responsive.css";
import "./styles/performance.css";

const queryClient = new QueryClient();

// Initialize accessibility features on app load
if (typeof window !== 'undefined') {
  try {
    initializeAccessibility();
    
    // Inject design tokens as CSS variables
    const style = document.createElement('style');
    const cssVariables = generateCSSVariables();
    let css = ':root {\n';
    
    Object.entries(cssVariables).forEach(([key, value]) => {
      css += `  ${key}: ${value};\n`;
    });
    
    css += '}\n\n';
    css += generateDarkModeCSS();
    
    style.textContent = css;
    document.head.appendChild(style);
  } catch (err) {
    console.error("Failed to inject design tokens:", err);
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

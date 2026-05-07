/** @type {import('eslint').Linter.Config[]} */
export default [
  // Base configuration for all JavaScript files
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        // Node.js globals
        process: "readonly",
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        // ES2021 globals
        Promise: "readonly",
        Map: "readonly",
        Set: "readonly",
        WeakMap: "readonly",
        WeakSet: "readonly",
        Symbol: "readonly",
        Proxy: "readonly",
        Reflect: "readonly",
      },
    },
    rules: {
      "indent": ["warn", 2],
      "linebreak-style": "off",
      "quotes": ["warn", "double"],
      "semi": ["warn", "always"],
      "no-unused-vars": ["warn"],
      "no-console": ["warn"],
      "eqeqeq": ["warn", "always"],
      "curly": ["warn", "all"],
      "brace-style": ["warn", "1tbs"],
      "comma-dangle": "off",
      "arrow-parens": ["warn", "always"],
      "object-curly-spacing": ["warn", "always"],
      "array-bracket-spacing": ["warn", "never"],
    },
  },
  
  // JSX/React files configuration
  {
    files: ["**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        React: "readonly",
      },
    },
    rules: {
      "indent": ["warn", 2],
      "linebreak-style": "off",
      "quotes": ["warn", "double"],
      "semi": ["warn", "always"],
      "no-unused-vars": ["warn"],
      "no-console": ["warn"],
      "eqeqeq": ["warn", "always"],
      "curly": ["warn", "all"],
      "brace-style": ["warn", "1tbs"],
      "comma-dangle": "off",
      "arrow-parens": ["warn", "always"],
      "object-curly-spacing": ["warn", "always"],
      "array-bracket-spacing": ["warn", "never"],
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  
  // Backend-specific configuration (Node.js)
  {
    files: ["backend/**/*.js"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  
  // Ignore patterns
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      ".husky/",
      "backend/scratch/",
      "backend/scripts/dev-utils/",
      "**/*.test.js",
      "**/*.spec.js",
      "frontend/dist/", // Exclude frontend dist folder
    ],
  },
];
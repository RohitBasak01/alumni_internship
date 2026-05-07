#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * 
 * This script validates that all required environment variables are set
 * and have appropriate values for the current environment.
 * 
 * Usage:
 *   node scripts/validate-env.js
 *   node scripts/validate-env.js --env production
 *   node scripts/validate-env.js --env development
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';
const isTest = NODE_ENV === 'test';

// Define validation rules for environment variables
const validationRules = {
  // Required in all environments
  JWT_SECRET: {
    required: true,
    description: 'JWT signing secret',
    validation: (value) => {
      if (!value || value.trim() === '') {
        return 'JWT_SECRET cannot be empty';
      }
      if (isProduction && value.length < 32) {
        return 'JWT_SECRET must be at least 32 characters in production';
      }
      if (value === 'change-this-secret') {
        return 'JWT_SECRET must be changed from the default value';
      }
      return null;
    }
  },

  // Database configuration
  MONGODB_URI: {
    required: !isTest,
    description: 'MongoDB connection URI',
    validation: (value) => {
      if (!value || value.trim() === '') {
        return 'MONGODB_URI cannot be empty';
      }
      if (!value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
        return 'MONGODB_URI must start with mongodb:// or mongodb+srv://';
      }
      return null;
    }
  },

  CENTRAL_MONGODB_URI: {
    required: false,
    description: 'Central MongoDB URI for tenant metadata',
    validation: (value) => {
      if (value && !value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
        return 'CENTRAL_MONGODB_URI must start with mongodb:// or mongodb+srv://';
      }
      return null;
    }
  },

  // URLs for production
  CLIENT_URL: {
    required: isProduction,
    description: 'Frontend client URL',
    validation: (value) => {
      if (isProduction && (!value || value.trim() === '')) {
        return 'CLIENT_URL is required in production';
      }
      if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
        return 'CLIENT_URL must start with http:// or https://';
      }
      return null;
    }
  },

  FRONTEND_URL: {
    required: false,
    description: 'Alternative frontend URL',
    validation: (value) => {
      if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
        return 'FRONTEND_URL must start with http:// or https://';
      }
      return null;
    }
  },

  CORS_ALLOWED_ORIGINS: {
    required: isProduction,
    description: 'Comma-separated CORS allowed origins',
    validation: (value) => {
      if (isProduction && (!value || value.trim() === '')) {
        return 'CORS_ALLOWED_ORIGINS is required in production';
      }
      return null;
    }
  },

  // Email configuration (required if email functionality is needed)
  SMTP_HOST: {
    required: false,
    description: 'SMTP server hostname',
    validation: (value) => {
      // If any SMTP variable is set, all should be set
      const hasSomeSmtp = process.env.SMTP_HOST || process.env.SMTP_USER || process.env.SMTP_PASS;
      const hasAllSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
      
      if (hasSomeSmtp && !hasAllSmtp) {
        return 'SMTP_HOST, SMTP_USER, and SMTP_PASS must all be set together';
      }
      return null;
    }
  },

  SMTP_USER: {
    required: false,
    description: 'SMTP username',
    validation: null // Handled by SMTP_HOST validation
  },

  SMTP_PASS: {
    required: false,
    description: 'SMTP password',
    validation: null // Handled by SMTP_HOST validation
  },

  // Development-specific
  ENABLE_DEV_MOCK_MODE: {
    required: false,
    description: 'Enable mock data mode',
    validation: (value) => {
      if (isProduction && value === 'true') {
        return 'ENABLE_DEV_MOCK_MODE must not be enabled in production';
      }
      return null;
    }
  },

  ALLOW_TENANT_HEADER_OVERRIDE: {
    required: false,
    description: 'Allow tenant header override',
    validation: (value) => {
      if (isProduction && value === 'true') {
        console.warn('⚠️  WARNING: ALLOW_TENANT_HEADER_OVERRIDE=true in production may be a security risk');
      }
      return null;
    }
  },

  // File upload limits
  MAX_FILE_SIZE: {
    required: false,
    description: 'Maximum file upload size in bytes',
    validation: (value) => {
      if (value) {
        const size = parseInt(value, 10);
        if (isNaN(size) || size <= 0) {
          return 'MAX_FILE_SIZE must be a positive number';
        }
        if (size > 100 * 1024 * 1024) { // 100MB
          return 'MAX_FILE_SIZE cannot exceed 100MB';
        }
      }
      return null;
    }
  },

  // Storage configuration
  STORAGE_PROVIDER: {
    required: false,
    description: 'Storage provider (local, cloudinary, s3-compatible)',
    validation: (value) => {
      if (value && !['local', 'cloudinary', 's3-compatible'].includes(value)) {
        return 'STORAGE_PROVIDER must be one of: local, cloudinary, s3-compatible';
      }
      return null;
    }
  },

  CLOUDINARY_URL: {
    required: false,
    description: 'Cloudinary connection URL',
    validation: (value) => {
      if (process.env.STORAGE_PROVIDER === 'cloudinary' && (!value || value.trim() === '')) {
        return 'CLOUDINARY_URL is required when STORAGE_PROVIDER=cloudinary';
      }
      return null;
    }
  },

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: {
    required: false,
    description: 'Rate limit window in milliseconds',
    validation: (value) => {
      if (value) {
        const ms = parseInt(value, 10);
        if (isNaN(ms) || ms <= 0) {
          return 'RATE_LIMIT_WINDOW_MS must be a positive number';
        }
      }
      return null;
    }
  },

  RATE_LIMIT_MAX_REQUESTS: {
    required: false,
    description: 'Maximum requests per rate limit window',
    validation: (value) => {
      if (value) {
        const max = parseInt(value, 10);
        if (isNaN(max) || max <= 0) {
          return 'RATE_LIMIT_MAX_REQUESTS must be a positive number';
        }
      }
      return null;
    }
  }
};

// Additional production-only checks
const productionChecks = [
  {
    check: () => {
      const secret = process.env.JWT_SECRET || '';
      return secret.length >= 32;
    },
    message: 'JWT_SECRET should be at least 32 characters in production (64+ recommended)',
    warning: true
  },
  {
    check: () => {
      const origins = process.env.CORS_ALLOWED_ORIGINS || '';
      return origins.includes('https://');
    },
    message: 'CORS_ALLOWED_ORIGINS should use HTTPS in production',
    warning: true
  },
  {
    check: () => {
      return process.env.ENABLE_DEV_MOCK_MODE !== 'true';
    },
    message: 'ENABLE_DEV_MOCK_MODE should be false in production',
    warning: false
  }
];

function validateEnvironment() {
  console.log(`🔍 Validating environment: ${NODE_ENV}`);
  console.log(`📁 Loaded from: ${join(__dirname, '..', '.env')}`);
  console.log('─'.repeat(60));

  const errors = [];
  const warnings = [];
  const validated = {};

  // Validate each variable
  for (const [varName, rule] of Object.entries(validationRules)) {
    const value = process.env[varName];
    const isSet = value !== undefined && value !== '';
    
    // Check if required
    if (rule.required && !isSet) {
      errors.push(`❌ ${varName}: Required but not set (${rule.description})`);
      continue;
    }

    // Skip validation if not set and not required
    if (!isSet) {
      validated[varName] = { status: 'optional', value: null };
      continue;
    }

    // Run validation function if provided
    if (rule.validation) {
      const validationError = rule.validation(value);
      if (validationError) {
        errors.push(`❌ ${varName}: ${validationError}`);
      } else {
        validated[varName] = { status: 'valid', value: maskSensitiveValue(varName, value) };
      }
    } else {
      validated[varName] = { status: 'valid', value: maskSensitiveValue(varName, value) };
    }
  }

  // Run production-specific checks
  if (isProduction) {
    for (const check of productionChecks) {
      if (!check.check()) {
        if (check.warning) {
          warnings.push(`⚠️  ${check.message}`);
        } else {
          errors.push(`❌ ${check.message}`);
        }
      }
    }
  }

  // Check for common issues
  if (isDevelopment) {
    const jwtSecret = process.env.JWT_SECRET || '';
    if (jwtSecret === 'change-this-secret') {
      warnings.push('⚠️  JWT_SECRET is using the default value. Change it for security.');
    }
    
    if (process.env.ENABLE_DEV_MOCK_MODE === 'true') {
      console.log('ℹ️  Development mock mode is enabled');
    }
  }

  // Display results
  console.log('\n📋 Validation Results:');
  console.log('─'.repeat(60));

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All environment variables are valid!\n');
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(warning));
  }

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(error => console.log(error));
    console.log('\n💡 Fix the errors above and try again.');
    process.exit(1);
  }

  // Show validated variables
  console.log('\n✅ Validated Variables:');
  console.log('─'.repeat(60));
  
  const categories = {
    'Server': ['PORT', 'NODE_ENV', 'LOG_LEVEL'],
    'Database': ['MONGODB_URI', 'CENTRAL_MONGODB_URI', 'TENANT_MONGODB_BASE_URI', 'TENANT_DATABASE_MODE'],
    'Authentication': ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'AUTH_COOKIE_DOMAIN'],
    'URLs': ['CLIENT_URL', 'FRONTEND_URL', 'CORS_ALLOWED_ORIGINS'],
    'Email': ['SMTP_HOST', 'SMTP_USER', 'EMAIL_FROM'],
    'Security': ['ALLOW_TENANT_HEADER_OVERRIDE', 'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX_REQUESTS'],
    'Storage': ['STORAGE_PROVIDER', 'MAX_FILE_SIZE'],
    'Development': ['ENABLE_DEV_MOCK_MODE', 'DEBUG']
  };

  for (const [category, vars] of Object.entries(categories)) {
    const categoryVars = vars.filter(v => validated[v]);
    if (categoryVars.length > 0) {
      console.log(`\n${category}:`);
      categoryVars.forEach(varName => {
        const info = validated[varName];
        const statusIcon = info.status === 'valid' ? '✅' : '⚪';
        console.log(`  ${statusIcon} ${varName}=${info.value}`);
      });
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`🎉 Environment validation passed for ${NODE_ENV}!`);
  
  // Additional recommendations
  if (isProduction) {
    console.log('\n💡 Production Recommendations:');
    console.log('  • Use a strong JWT_SECRET (64+ characters)');
    console.log('  • Enable HTTPS for all URLs');
    console.log('  • Set up proper email configuration');
    console.log('  • Configure monitoring (Sentry, Prometheus)');
    console.log('  • Use environment-specific database');
  }
}

function maskSensitiveValue(varName, value) {
  const sensitivePatterns = [
    /SECRET/i,
    /PASS/i,
    /KEY/i,
    /TOKEN/i,
    /PRIVATE/i
  ];
  
  if (sensitivePatterns.some(pattern => pattern.test(varName))) {
    if (value.length <= 8) {
      return '***';
    }
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  }
  
  // Truncate long values
  if (value.length > 50) {
    return `${value.substring(0, 47)}...`;
  }
  
  return value;
}

// Parse command line arguments
const args = process.argv.slice(2);
let envOverride = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--env' && i + 1 < args.length) {
    envOverride = args[i + 1];
    process.env.NODE_ENV = envOverride;
    break;
  }
  if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Environment Variable Validation Script

Usage:
  node scripts/validate-env.js [options]

Options:
  --env <environment>    Set environment to validate (production, development, test)
  --help, -h             Show this help message

Examples:
  node scripts/validate-env.js
  node scripts/validate-env.js --env production
  node scripts/validate-env.js --env development
    `);
    process.exit(0);
  }
}

// Run validation
try {
  validateEnvironment();
} catch (error) {
  console.error('💥 Validation script failed:', error.message);
  process.exit(1);
}
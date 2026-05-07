// Jest setup file
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({ path: ".env.test" });

// Set test environment variables if not already set
process.env.NODE_ENV = "test";

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
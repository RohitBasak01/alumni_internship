import request from 'supertest';
import app from '../app.js';
import { createMockStore } from '../mock/devData.js';

describe('OAuth Integration Tests', () => {
  let csrfToken = '';
  let csrfCookieString = '';

  beforeEach(async () => {
    // Enable mock mode for tests
    app.locals.mockMode = true;
    app.locals.mockStore = createMockStore();
    
    // Get CSRF token by making a GET request
    const response = await request(app).get('/api/health');
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      const csrfCookie = cookies.find(cookie => cookie.includes('csrfToken'));
      if (csrfCookie) {
        csrfCookieString = csrfCookie.split(';')[0]; // Get just the cookie key=value part
        // Extract token from cookie string
        const match = csrfCookie.match(/csrfToken=([^;]+)/);
        if (match) {
          csrfToken = match[1];
        }
      }
    }
  });

  afterEach(() => {
    // Clean up
    app.locals.mockMode = false;
    app.locals.mockStore = null;
    csrfToken = '';
    csrfCookieString = '';
  });

  // Helper to make requests with CSRF token
  const requestWithCsrf = (method, url) => {
    const req = request(app)[method](url);
    if (csrfCookieString) {
      req.set('Cookie', csrfCookieString);
    }
    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      req.set('X-CSRF-Token', csrfToken);
    }
    return req;
  };

  describe('OAuth session management', () => {
    it('should return null OAuth session when no session exists', async () => {
      const response = await requestWithCsrf('get', '/api/auth/oauth/session');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('oauthSession', null);
    });

    it('should clear OAuth session', async () => {
      const response = await requestWithCsrf('delete', '/api/auth/oauth/session');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'OAuth session cleared');
    });
  });

  describe('OAuth provider validation', () => {
    it('should accept any auth provider in registration (mock mode limitation)', async () => {
      // In mock mode, the registration endpoint doesn't validate authProvider
      // This is a limitation of mock mode, not the actual implementation
      const response = await requestWithCsrf('post', '/api/auth/alumni-registration').send({
        email: 'test@example.com',
        password: 'Test@123',
        name: 'Test User',
        instituteId: '65f000000000000000000001',
        authProvider: 'facebook' // Unsupported provider, but mock accepts it
      });

      // Mock registration returns 201 for any valid email
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Registration submitted successfully. Your institution admin will review it in mock mode.');
    });

    it('should accept Google as auth provider in registration (mock mode)', async () => {
      const response = await requestWithCsrf('post', '/api/auth/alumni-registration').send({
        email: 'testgoogle@example.com',
        password: 'Test@123',
        name: 'Test User',
        instituteId: '65f000000000000000000001',
        authProvider: 'google'
      });

      // Mock registration doesn't require OAuth session
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Registration submitted successfully. Your institution admin will review it in mock mode.');
    });

    it('should accept LinkedIn as auth provider in registration (mock mode)', async () => {
      const response = await requestWithCsrf('post', '/api/auth/alumni-registration').send({
        email: 'testlinkedin@example.com',
        password: 'Test@123',
        name: 'Test User',
        instituteId: '65f000000000000000000001',
        authProvider: 'linkedin'
      });

      // Mock registration doesn't require OAuth session
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Registration submitted successfully. Your institution admin will review it in mock mode.');
    });

    it('should accept email as auth provider in registration', async () => {
      const response = await requestWithCsrf('post', '/api/auth/alumni-registration').send({
        email: 'testemail@example.com',
        password: 'Test@123',
        name: 'Test User',
        instituteId: '65f000000000000000000001',
        authProvider: 'email'
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Registration submitted successfully. Your institution admin will review it in mock mode.');
    });
  });

  describe('OAuth flow endpoints', () => {
    it('should reject unsupported OAuth provider in start endpoint', async () => {
      const response = await requestWithCsrf('get', '/api/auth/oauth/facebook/start');
      // In mock mode, this falls through to real auth routes which validate provider
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      // Actual error message is "Validation failed" with details in validationErrors
      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject unsupported OAuth provider in callback endpoint', async () => {
      const response = await requestWithCsrf('get', '/api/auth/oauth/facebook/callback');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should handle Google OAuth start (requires credentials)', async () => {
      // In test environment, OAuth credentials are not configured
      const response = await requestWithCsrf('get', '/api/auth/oauth/google/start');
      
      // Returns 503 Service Unavailable because credentials are missing
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('google OAuth is not configured yet');
    });

    it('should handle LinkedIn OAuth start (requires credentials)', async () => {
      const response = await requestWithCsrf('get', '/api/auth/oauth/linkedin/start');
      
      // Returns 503 Service Unavailable because credentials are missing
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('linkedin OAuth is not configured yet');
    });

    it('should handle Google OAuth callback (requires code)', async () => {
      // Callback without code parameter
      const response = await requestWithCsrf('get', '/api/auth/oauth/google/callback');
      
      // Without code, it redirects to error page (302 redirect)
      expect(response.status).toBe(302);
      expect(response.headers.location).toBeDefined();
    });

    it('should handle LinkedIn OAuth callback (requires code)', async () => {
      // Callback without code parameter
      const response = await requestWithCsrf('get', '/api/auth/oauth/linkedin/callback');
      
      // Without code, it redirects to error page (302 redirect)
      expect(response.status).toBe(302);
      expect(response.headers.location).toBeDefined();
    });
  });

  describe('OAuth registration flow validation', () => {
    it('should not require OAuth session for Google registration in mock mode', async () => {
      // In mock mode, OAuth session validation is skipped
      const response = await requestWithCsrf('post', '/api/auth/alumni-registration').send({
        email: 'testgoogle2@example.com',
        password: 'Test@123',
        name: 'Test Google User',
        instituteId: '65f000000000000000000001',
        authProvider: 'google'
      });

      // Mock registration accepts Google without OAuth session
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Registration submitted successfully. Your institution admin will review it in mock mode.');
    });

    it('should not require OAuth session for LinkedIn registration in mock mode', async () => {
      // In mock mode, OAuth session validation is skipped
      const response = await requestWithCsrf('post', '/api/auth/alumni-registration').send({
        email: 'testlinkedin2@example.com',
        password: 'Test@123',
        name: 'Test LinkedIn User',
        instituteId: '65f000000000000000000001',
        authProvider: 'linkedin'
      });

      // Mock registration accepts LinkedIn without OAuth session
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Registration submitted successfully. Your institution admin will review it in mock mode.');
    });
  });
});
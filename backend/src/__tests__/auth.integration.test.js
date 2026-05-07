import request from 'supertest';
import app from '../app.js';
import { createMockStore } from '../mock/devData.js';

describe('Authentication Integration Tests', () => {
  // Test data from mock/devData.js
  const validUser = {
    email: 'aarav@spit.edu',
    password: 'Alumni@123',
  };
  const invalidUser = {
    email: 'nonexistent@example.com',
    password: 'wrongpassword',
  };

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
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
      req.set('X-CSRF-Token', csrfToken);
    }
    return req;
  };

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return user data', async () => {
      const response = await requestWithCsrf('post', '/api/auth/login')
        .send(validUser)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', validUser.email);
      expect(response.body.user).toHaveProperty('name');
      expect(response.body.user).toHaveProperty('role', 'alumni');
      expect(response.body).toHaveProperty('mockMode', true);

      // Check that cookies are set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('authToken'))).toBe(true);
    });

    it('should return 401 with invalid credentials', async () => {
      const response = await requestWithCsrf('post', '/api/auth/login')
        .send(invalidUser)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Invalid credentials');
      expect(response.body).toHaveProperty('requestId');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and clear auth cookies', async () => {
      // First login to get a token
      const loginResponse = await requestWithCsrf('post', '/api/auth/login')
        .send(validUser);

      const authToken = loginResponse.body.token;
      expect(authToken).toBeDefined();

      // Logout
      const logoutResponse = await requestWithCsrf('post', '/api/auth/logout')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('message', 'Logged out successfully');

      // Verify cookies are cleared (check for empty or expired cookies)
      const cookies = logoutResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();
      // The logout endpoint sets authToken to empty string and expires in the past
      const authCookie = cookies.find(cookie => cookie.includes('authToken'));
      expect(authCookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      // Login first
      const loginResponse = await requestWithCsrf('post', '/api/auth/login')
        .send(validUser);

      const authToken = loginResponse.body.token;

      // Get current user
      const meResponse = await requestWithCsrf('get', '/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(meResponse.body).toHaveProperty('email', validUser.email);
      expect(meResponse.body).toHaveProperty('name');
      expect(meResponse.body).toHaveProperty('role', 'alumni');
      expect(meResponse.body).toHaveProperty('institute');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await requestWithCsrf('get', '/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentication required');
      expect(response.body).toHaveProperty('requestId');
    });
  });

  describe('POST /api/auth/alumni-registration', () => {
    it('should register a new alumni in mock mode', async () => {
      const newAlumni = {
        instituteId: '65f000000000000000000001', // SPIT Demo Institute
        email: 'newalumni@example.com',
        firstName: 'John',
        lastName: 'Doe',
        batch: 2023,
        department: 'Computer Engineering',
        currentEducation: 'Master\'s',
        currentInstitution: 'MIT',
        occupation: 'Software Engineer',
        company: 'Tech Corp',
        designation: 'Senior Developer',
        currentCity: 'Boston',
      };

      const response = await requestWithCsrf('post', '/api/auth/alumni-registration')
        .send(newAlumni)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Registration submitted successfully. Your institution admin will review it in mock mode.');
    });

    it('should return 409 if email already exists', async () => {
      const existingAlumni = {
        instituteId: '65f000000000000000000001',
        email: 'aarav@spit.edu', // already exists
        firstName: 'Aarav',
        lastName: 'Shah',
        batch: 2020,
        department: 'Computer Engineering',
      };

      const response = await requestWithCsrf('post', '/api/auth/alumni-registration')
        .send(existingAlumni)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('message', 'An account with this email already exists');
    });
  });
});
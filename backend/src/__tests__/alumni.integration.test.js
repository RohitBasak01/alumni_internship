import request from 'supertest';
import app from '../app.js';
import { createMockStore } from '../mock/devData.js';

describe('Alumni Profile Integration Tests', () => {
  // Test data from mock/devData.js
  const validUser = {
    email: 'aarav@spit.edu',
    password: 'Alumni@123',
  };

  let csrfToken = '';
  let csrfCookieString = '';
  let authToken = '';

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

    // Login to get auth token for authenticated requests
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('Cookie', csrfCookieString)
      .set('X-CSRF-Token', csrfToken)
      .send(validUser);
    
    authToken = loginResponse.body.token;
  });

  afterEach(() => {
    // Clean up
    app.locals.mockMode = false;
    app.locals.mockStore = null;
    csrfToken = '';
    csrfCookieString = '';
    authToken = '';
  });

  // Helper to make requests with CSRF token and auth
  const requestWithAuth = (method, url) => {
    const req = request(app)[method](url);
    if (csrfCookieString) {
      req.set('Cookie', csrfCookieString);
    }
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
      req.set('X-CSRF-Token', csrfToken);
    }
    if (authToken) {
      req.set('Authorization', `Bearer ${authToken}`);
    }
    return req;
  };

  describe('GET /api/alumni', () => {
    it('should return list of alumni profiles', async () => {
      const response = await requestWithAuth('get', '/api/alumni')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check structure of first alumni
      const firstAlumni = response.body[0];
      expect(firstAlumni).toHaveProperty('_id');
      expect(firstAlumni).toHaveProperty('name');
      expect(firstAlumni).toHaveProperty('email');
      expect(firstAlumni).toHaveProperty('batch');
      expect(firstAlumni).toHaveProperty('department');
    });

    it('should filter alumni by batch', async () => {
      const response = await requestWithAuth('get', '/api/alumni?batch=2020')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // All returned alumni should have batch 2020
      response.body.forEach(alumni => {
        expect(alumni.batch).toBe(2020);
      });
    });

    it('should filter alumni by department', async () => {
      const response = await requestWithAuth('get', '/api/alumni?department=Computer')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // All returned alumni should have department containing "Computer"
      response.body.forEach(alumni => {
        expect(alumni.department.toLowerCase()).toContain('computer');
      });
    });

    it('should search alumni by query', async () => {
      const response = await requestWithAuth('get', '/api/alumni?q=Aarav')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should find Aarav Shah
      expect(response.body.length).toBeGreaterThan(0);
      const aarav = response.body.find(a => a.name.includes('Aarav'));
      expect(aarav).toBeDefined();
    });
  });

  describe('GET /api/alumni/me', () => {
    it('should return current user alumni profile', async () => {
      const response = await requestWithAuth('get', '/api/alumni/me')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('email', validUser.email);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('batch');
      expect(response.body).toHaveProperty('department');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/alumni/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentication required');
    });
  });

  describe('PATCH /api/alumni/me', () => {
    it('should update current user profile', async () => {
      const updateData = {
        bio: 'Updated bio for testing',
        skills: ['JavaScript', 'Node.js', 'Testing'],
        location: 'Mumbai, India',
        company: 'Test Corp',
        designation: 'Senior Test Engineer'
      };

      const response = await requestWithAuth('patch', '/api/alumni/me')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('bio', updateData.bio);
      expect(response.body).toHaveProperty('skills');
      expect(response.body.skills).toEqual(updateData.skills);
      expect(response.body).toHaveProperty('location', updateData.location);
      expect(response.body).toHaveProperty('company', updateData.company);
      expect(response.body).toHaveProperty('designation', updateData.designation);
    });

    it('should update batch and department', async () => {
      const updateData = {
        batch: 2021,
        department: 'Information Technology',
        currentEducation: 'PhD',
        currentInstitution: 'Stanford University'
      };

      const response = await requestWithAuth('patch', '/api/alumni/me')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('batch', updateData.batch);
      expect(response.body).toHaveProperty('department', updateData.department);
      expect(response.body).toHaveProperty('currentEducation', updateData.currentEducation);
      expect(response.body).toHaveProperty('currentInstitution', updateData.currentInstitution);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .patch('/api/alumni/me')
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', csrfCookieString)
        .send({ bio: 'test' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentication required');
    });

    it('should return 403 for non-alumni users', async () => {
      // Note: This test would require a non-alumni user (e.g., admin)
      // For now, we'll skip as mock data only has alumni users
      // This is a placeholder for future testing
    });
  });
});
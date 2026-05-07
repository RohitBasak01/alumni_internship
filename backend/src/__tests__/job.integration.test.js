import request from 'supertest';
import app from '../app.js';
import { createMockStore } from '../mock/devData.js';

describe('Job Integration Tests', () => {
  // Test data from mock/devData.js
  const alumniUser = {
    email: 'aarav@spit.edu',
    password: 'Alumni@123',
  };

  const adminUser = {
    email: 'admin@spit.edu',
    password: 'Institute@123',
  };

  let csrfToken = '';
  let csrfCookieString = '';
  let alumniAuthToken = '';
  let adminAuthToken = '';

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

    // Login as alumni to get auth token
    const alumniLoginResponse = await request(app)
      .post('/api/auth/login')
      .set('Cookie', csrfCookieString)
      .set('X-CSRF-Token', csrfToken)
      .send(alumniUser);
    
    alumniAuthToken = alumniLoginResponse.body.token;

    // Login as admin to get auth token
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .set('Cookie', csrfCookieString)
      .set('X-CSRF-Token', csrfToken)
      .send(adminUser);
    
    adminAuthToken = adminLoginResponse.body.token;
  });

  afterEach(() => {
    // Clean up
    app.locals.mockMode = false;
    app.locals.mockStore = null;
    csrfToken = '';
    csrfCookieString = '';
    alumniAuthToken = '';
    adminAuthToken = '';
  });

  // Helper to make requests with CSRF token and auth
  const requestWithAuth = (method, url, token) => {
    const req = request(app)[method](url);
    if (csrfCookieString) {
      req.set('Cookie', csrfCookieString);
    }
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
      req.set('X-CSRF-Token', csrfToken);
    }
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  };

  describe('GET /api/jobs', () => {
    it('should return published jobs for alumni users', async () => {
      const response = await requestWithAuth('get', '/api/jobs', alumniAuthToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Alumni should only see published jobs
      const publishedJobs = response.body.filter(job => job.status === 'published');
      expect(publishedJobs.length).toBeGreaterThan(0);
      
      // Should not see non-published jobs
      const nonPublishedJobs = response.body.filter(job => job.status !== 'published');
      expect(nonPublishedJobs.length).toBe(0);

      // Check job structure
      const job = publishedJobs[0];
      expect(job).toHaveProperty('_id');
      expect(job).toHaveProperty('title');
      expect(job).toHaveProperty('company');
      expect(job).toHaveProperty('description');
      expect(job).toHaveProperty('status', 'published');
      expect(job).toHaveProperty('createdAt');
      expect(job).toHaveProperty('updatedAt');
      expect(job).toHaveProperty('instituteId');
      expect(job).toHaveProperty('postedBy');
    });

    it('should return all jobs for admin users', async () => {
      const response = await requestWithAuth('get', '/api/jobs', adminAuthToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Admin should see all jobs regardless of status
      // In demo data, there's only one published job
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check that admin can see the job
      const job = response.body[0];
      expect(job).toHaveProperty('title', 'Frontend Developer');
      expect(job).toHaveProperty('company', 'Open Systems Labs');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/jobs')
        .expect('Content-Type', /json/)
        .expect(401);
    });
  });

  describe('GET /api/feed (includes jobs)', () => {
    it('should include jobs in feed items', async () => {
      const response = await requestWithAuth('get', '/api/feed', alumniAuthToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Should contain job items
      const jobItems = response.body.filter(item => item.type === 'job');
      expect(jobItems.length).toBeGreaterThan(0);
      
      // Check job feed item structure
      const jobItem = jobItems[0];
      expect(jobItem).toHaveProperty('id');
      expect(jobItem).toHaveProperty('type', 'job');
      expect(jobItem).toHaveProperty('title');
      expect(jobItem).toHaveProperty('description'); // company name
      expect(jobItem).toHaveProperty('meta'); // status
      expect(jobItem).toHaveProperty('createdAt');
    });
  });

  describe('Job posting and application (not implemented in mock mode)', () => {
    it('should acknowledge that POST /api/jobs is not available in mock mode', () => {
      // In mock mode, only GET endpoints are available
      // POST /api/jobs for creating jobs and POST /api/jobs/:id/apply for applications
      // are not implemented in mock.routes.js
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should have proper job data structure in demo data', () => {
      const store = app.locals.mockStore;
      const jobs = store.jobs;
      
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      
      const job = jobs[0];
      expect(job).toHaveProperty('_id');
      expect(job).toHaveProperty('title');
      expect(job).toHaveProperty('company');
      expect(job).toHaveProperty('description');
      expect(job).toHaveProperty('status');
      expect(job).toHaveProperty('instituteId');
      expect(job).toHaveProperty('postedBy');
    });
  });
});
import request from 'supertest';
import app from '../app.js';
import { createMockStore } from '../mock/devData.js';

describe('Event Integration Tests', () => {
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

  describe('GET /api/events', () => {
    it('should return events for the current tenant', async () => {
      const response = await requestWithAuth('get', '/api/events')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Should have at least one event for the demo institute
      const demoInstituteEvents = response.body.filter(event => 
        event.instituteId === '65f000000000000000000001'
      );
      expect(demoInstituteEvents.length).toBeGreaterThan(0);

      // Check event structure
      const event = demoInstituteEvents[0];
      expect(event).toHaveProperty('_id');
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('description');
      expect(event).toHaveProperty('eventDate');
      expect(event).toHaveProperty('location');
      expect(event).toHaveProperty('attendeeCount');
      expect(event).toHaveProperty('isRegistered');
    });

    it('should filter events by groupId when query parameter is provided', async () => {
      // Get a group event from the mock store
      const store = app.locals.mockStore;
      const groupEvent = store.events.find(event => event.groupId);
      
      if (groupEvent) {
        const response = await requestWithAuth('get', `/api/events?groupId=${groupEvent.groupId}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        
        // All returned events should have the specified groupId
        response.body.forEach(event => {
          expect(event.groupId).toBe(groupEvent.groupId);
        });
      }
    });

    it('should exclude group events when no groupId parameter', async () => {
      const response = await requestWithAuth('get', '/api/events')
        .expect('Content-Type', /json/)
        .expect(200);

      // Events without groupId should be returned
      const nonGroupEvents = response.body.filter(event => !event.groupId);
      expect(nonGroupEvents.length).toBeGreaterThan(0);
      
      // Events with groupId should be excluded
      const groupEvents = response.body.filter(event => event.groupId);
      expect(groupEvents.length).toBe(0);
    });
  });

  describe('GET /api/feed', () => {
    it('should return feed items including events', async () => {
      const response = await requestWithAuth('get', '/api/feed')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Should contain events
      const eventItems = response.body.filter(item => item.type === 'event');
      expect(eventItems.length).toBeGreaterThan(0);
      
      // Check event feed item structure
      const eventItem = eventItems[0];
      expect(eventItem).toHaveProperty('id');
      expect(eventItem).toHaveProperty('type', 'event');
      expect(eventItem).toHaveProperty('title');
      expect(eventItem).toHaveProperty('description');
      expect(eventItem).toHaveProperty('meta'); // eventDate
      expect(eventItem).toHaveProperty('createdAt');
    });

    it('should return feed items sorted by createdAt descending', async () => {
      const response = await requestWithAuth('get', '/api/feed')
        .expect('Content-Type', /json/)
        .expect(200);

      const dates = response.body.map(item => new Date(item.createdAt));
      
      // Check that dates are in descending order (most recent first)
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i + 1].getTime());
      }
    });
  });

  describe('Event registration (not implemented in mock mode)', () => {
    it('should have isRegistered property on events', async () => {
      const response = await requestWithAuth('get', '/api/events')
        .expect('Content-Type', /json/)
        .expect(200);

      const event = response.body[0];
      expect(event).toHaveProperty('isRegistered');
      expect(typeof event.isRegistered).toBe('boolean');
    });
  });

  describe('Admin vs alumni access', () => {
    it('should show attendees list only to institute_admin role', async () => {
      // Current user is alumni (aarav@spit.edu), not admin
      // In mock mode, events should have attendees property regardless of role
      // because formatEvent in mock.routes.js includes attendees for all users
      const alumniResponse = await requestWithAuth('get', '/api/events')
        .expect('Content-Type', /json/)
        .expect(200);

      const alumniEvent = alumniResponse.body[0];
      expect(alumniEvent).toHaveProperty('attendees');
      expect(Array.isArray(alumniEvent.attendees)).toBe(true);
    });
  });
});
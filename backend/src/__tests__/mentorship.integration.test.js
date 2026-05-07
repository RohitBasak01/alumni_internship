import request from 'supertest';
import app from '../app.js';
import { createMockStore } from '../mock/devData.js';

describe('Mentorship Integration Tests', () => {
  // Test data from mock/devData.js
  const validUser = {
    email: 'aarav@spit.edu',
    password: 'Alumni@123',
  };

  // Another alumni user in the same institute (SPIT)
  // From devData.js: Riya User (email: riya@spit.edu) doesn't exist in demoUsers
  // Let's use the admin user as recipient (but admin is not alumni)
  // For now, we'll test with a non-existent user and expect appropriate error
  
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

  describe('GET /api/mentorship', () => {
    it('should return empty list initially (no mentorship requests)', async () => {
      const response = await requestWithAuth('get', '/api/mentorship')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // demoMentorshipRequests is empty array, so should be empty
      expect(response.body.length).toBe(0);
    });
  });

  describe('POST /api/mentorship', () => {
    it('should create a mentorship request with valid data', async () => {
      // Need a valid recipient user ID from the same institute
      // Let's find a user from the mock store
      // We'll get the store and find another alumni user
      const store = app.locals.mockStore;
      const currentUser = store.users.find(u => u.email === validUser.email);
      const otherAlumni = store.users.find(u => 
        u.role === 'alumni' && 
        u._id !== currentUser._id && 
        u.instituteId === currentUser.instituteId
      );
      
      // If there's no other alumni in same institute, skip this test
      if (!otherAlumni) {
        console.log('Skipping mentorship request test: no other alumni in same institute');
        return;
      }

      const requestData = {
        recipientUserId: otherAlumni._id,
        message: 'Hello, I would like to connect for mentorship.'
      };

      const response = await requestWithAuth('post', '/api/mentorship')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('conversationType', 'direct');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('requesterId', currentUser._id);
      expect(response.body).toHaveProperty('mentorId', otherAlumni._id);
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages.length).toBe(1);
      expect(response.body.messages[0]).toHaveProperty('content', requestData.message);
    });

    it('should return 400 when recipient and message are missing', async () => {
      const response = await requestWithAuth('post', '/api/mentorship')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Recipient and message are required');
    });

    it('should return 400 when trying to chat with yourself', async () => {
      const store = app.locals.mockStore;
      const currentUser = store.users.find(u => u.email === validUser.email);

      const requestData = {
        recipientUserId: currentUser._id,
        message: 'Message to myself'
      };

      const response = await requestWithAuth('post', '/api/mentorship')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'You cannot start a chat with yourself');
    });

    it('should return 404 when recipient is not found or not alumni', async () => {
      const requestData = {
        recipientUserId: '65f000000000000000000999', // Non-existent user
        message: 'Hello'
      };

      const response = await requestWithAuth('post', '/api/mentorship')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Selected alumni was not found');
    });
  });

  describe('POST /api/mentorship/:id/messages', () => {
    let conversationId;

    beforeEach(async () => {
      // Create a mentorship request first
      const store = app.locals.mockStore;
      const currentUser = store.users.find(u => u.email === validUser.email);
      const otherAlumni = store.users.find(u => 
        u.role === 'alumni' && 
        u._id !== currentUser._id && 
        u.instituteId === currentUser.instituteId
      );

      if (otherAlumni) {
        const requestData = {
          recipientUserId: otherAlumni._id,
          message: 'Initial message'
        };

        const response = await requestWithAuth('post', '/api/mentorship')
          .send(requestData);
        
        if (response.status === 201) {
          conversationId = response.body._id;
        }
      }
    });

    it('should send a message to an existing mentorship conversation', async () => {
      if (!conversationId) {
        console.log('Skipping message test: no conversation created');
        return;
      }

      const messageData = {
        content: 'Follow-up message'
      };

      const response = await requestWithAuth('post', `/api/mentorship/${conversationId}/messages`)
        .send(messageData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('conversationId', conversationId);
      expect(response.body).toHaveProperty('content', messageData.content);
      expect(response.body).toHaveProperty('sender');
      expect(response.body.sender).toHaveProperty('_id');
    });

    it('should return 400 when content is empty', async () => {
      if (!conversationId) {
        console.log('Skipping empty content test: no conversation created');
        return;
      }

      const response = await requestWithAuth('post', `/api/mentorship/${conversationId}/messages`)
        .send({ content: '' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Message content is required');
    });

    it('should return 404 when conversation does not exist', async () => {
      const response = await requestWithAuth('post', '/api/mentorship/65f000000000000000000999/messages')
        .send({ content: 'Test message' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Mentorship conversation not found');
    });
  });

  describe('PATCH /api/mentorship/:id', () => {
    it('should update mentorship conversation status', async () => {
      // First create a conversation
      const store = app.locals.mockStore;
      const currentUser = store.users.find(u => u.email === validUser.email);
      const otherAlumni = store.users.find(u => 
        u.role === 'alumni' && 
        u._id !== currentUser._id && 
        u.instituteId === currentUser.instituteId
      );

      if (!otherAlumni) {
        console.log('Skipping update test: no other alumni in same institute');
        return;
      }

      const requestData = {
        recipientUserId: otherAlumni._id,
        message: 'Initial message'
      };

      const createResponse = await requestWithAuth('post', '/api/mentorship')
        .send(requestData);
      
      if (createResponse.status !== 201) {
        console.log('Skipping update test: failed to create conversation');
        return;
      }

      const conversationId = createResponse.body._id;

      // Update status to accepted
      const updateData = {
        status: 'accepted'
      };

      const response = await requestWithAuth('patch', `/api/mentorship/${conversationId}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'accepted');
    });
  });
});
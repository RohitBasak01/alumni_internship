# Alumni Network API Documentation

## Base URL

`http://localhost:5000/api` (development)
`https://api.yourdomain.com/api` (production)

## Authentication

Most endpoints require authentication via JWT token.

### Authentication Headers

```
Authorization: Bearer <jwt_token>
```

### Getting a Token

1. Login via `/auth/login` to receive access and refresh tokens
2. Access token is valid for 15 minutes
3. Refresh token is valid for 7 days
4. Use `/auth/refresh` to get a new access token

## Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Rate Limiting

- Public endpoints: 100 requests per 15 minutes
- Authenticated endpoints: 1000 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes

---

## 📋 Health Check

### GET `/health`

Check API health status.

**Response:**

```json
{
  "ok": true,
  "service": "alumni-network-api",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "requestId": "req_123456"
}
```

---

## 🔐 Authentication

### POST `/auth/login`

Authenticate user and get tokens.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "role": "alumni",
      "name": "John Doe"
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

### POST `/auth/register`

Register a new user.

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "Password123!",
  "name": "John Doe",
  "instituteId": "institute_id_optional"
}
```

### POST `/auth/refresh`

Refresh access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "jwt_refresh_token"
}
```

### POST `/auth/logout`

Logout user (invalidate refresh token).

**Headers:**

```
Authorization: Bearer <access_token>
```

### POST `/auth/forgot-password`

Request password reset email.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

### POST `/auth/reset-password`

Reset password with token.

**Request Body:**

```json
{
  "token": "reset_token",
  "password": "NewPassword123!"
}
```

---

## 👥 Alumni

### GET `/alumni`

Get alumni directory (paginated).

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name, email, or company
- `batch` (optional): Filter by graduation year
- `department` (optional): Filter by department

**Response:**

```json
{
  "success": true,
  "data": {
    "alumni": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

### GET `/alumni/:id`

Get alumni profile by ID.

### PUT `/alumni/:id`

Update alumni profile.

**Request Body:**

```json
{
  "name": "Updated Name",
  "bio": "Updated bio",
  "currentCompany": "New Company",
  "currentRole": "Senior Developer",
  "location": "New York, USA",
  "skills": ["JavaScript", "React", "Node.js"]
}
```

### GET `/alumni/me`

Get current user's alumni profile.

---

## 📝 Alumni Posts

### GET `/alumni-posts`

Get alumni feed posts.

**Query Parameters:**

- `page`, `limit`: Pagination
- `authorId` (optional): Filter by author

### POST `/alumni-posts`

Create a new post.

**Request Body:**

```json
{
  "content": "Post content with #hashtags",
  "visibility": "public", // or "connections", "private"
  "mediaUrls": ["url1", "url2"]
}
```

### PUT `/alumni-posts/:id`

Update a post.

### DELETE `/alumni-posts/:id`

Delete a post.

### POST `/alumni-posts/:id/like`

Like/unlike a post.

### POST `/alumni-posts/:id/comment`

Add comment to a post.

**Request Body:**

```json
{
  "content": "Comment text"
}
```

---

## 🏢 Institutes

### GET `/institutes`

Get all institutes (super admin only).

### GET `/institutes/:id`

Get institute by ID.

### POST `/institutes`

Create institute (super admin only).

### PUT `/institutes/:id`

Update institute.

### GET `/institutes/:id/alumni`

Get alumni for specific institute.

### GET `/institutes/:id/stats`

Get institute statistics.

---

## 📅 Events

### GET `/events`

Get events (paginated).

**Query Parameters:**

- `upcoming` (optional): true/false for upcoming events
- `instituteId` (optional): Filter by institute

### POST `/events`

Create event (institute admin only).

**Request Body:**

```json
{
  "title": "Annual Alumni Meet",
  "description": "Annual gathering of alumni",
  "date": "2024-12-25T18:00:00.000Z",
  "location": "Main Campus Auditorium",
  "type": "physical", // or "virtual"
  "maxAttendees": 100,
  "registrationDeadline": "2024-12-20T23:59:59.000Z"
}
```

### GET `/events/:id`

Get event details.

### PUT `/events/:id`

Update event.

### DELETE `/events/:id`

Delete event.

### POST `/events/:id/register`

Register for event.

### DELETE `/events/:id/register`

Cancel registration.

---

## 💼 Jobs

### GET `/jobs`

Get job listings.

**Query Parameters:**

- `page`, `limit`: Pagination
- `type` (optional): full_time, part_time, internship, contract
- `remote` (optional): true/false
- `location` (optional): Location filter

### POST `/jobs`

Create job posting (institute admin or verified alumni).

**Request Body:**

```json
{
  "title": "Senior Software Engineer",
  "company": "Tech Corp",
  "description": "Job description...",
  "requirements": ["5+ years experience", "React knowledge"],
  "type": "full_time",
  "location": "Remote",
  "salaryRange": {
    "min": 80000,
    "max": 120000,
    "currency": "USD"
  },
  "applicationDeadline": "2024-12-31T23:59:59.000Z"
}
```

### GET `/jobs/:id`

Get job details.

### POST `/jobs/:id/apply`

Apply for job.

**Request Body (multipart/form-data):**

- `coverLetter` (optional): Text
- `resume`: File upload

### GET `/jobs/applications`

Get user's job applications.

### GET `/jobs/:id/applications`

Get applications for a job (poster only).

---

## 🤝 Mentorship

### GET `/mentorship/requests`

Get mentorship requests.

**Query Parameters:**

- `status` (optional): pending, accepted, rejected, completed
- `type` (optional): mentor, mentee

### POST `/mentorship/requests`

Create mentorship request.

**Request Body:**

```json
{
  "type": "mentor", // or "mentee"
  "title": "Looking for React mentorship",
  "description": "I want to learn advanced React patterns",
  "topics": ["React", "State Management", "Performance"],
  "availability": "weekends",
  "duration": "3 months"
}
```

### PUT `/mentorship/requests/:id`

Update mentorship request.

### POST `/mentorship/requests/:id/accept`

Accept mentorship request.

### POST `/mentorship/requests/:id/reject`

Reject mentorship request.

### POST `/mentorship/requests/:id/complete`

Mark as completed.

### GET `/mentorship/conversations`

Get mentorship conversations.

### GET `/mentorship/conversations/:id/messages`

Get messages in a conversation.

### POST `/mentorship/conversations/:id/messages`

Send message in mentorship conversation.

**Request Body:**

```json
{
  "content": "Hello, I'd like to schedule our first session",
  "type": "text" // or "file"
}
```

---

## 🏢 Business Directory

### GET `/business-directory`

Get business listings.

**Query Parameters:**

- `category` (optional): Filter by category
- `location` (optional): Filter by location

### POST `/business-directory`

Create business listing (alumni only).

**Request Body:**

```json
{
  "businessName": "Tech Solutions Inc.",
  "description": "Software development company",
  "category": "technology",
  "website": "https://example.com",
  "contactEmail": "contact@example.com",
  "location": "San Francisco, CA",
  "services": ["Web Development", "Mobile Apps", "Consulting"]
}
```

### GET `/business-directory/:id`

Get business details.

### PUT `/business-directory/:id`

Update business listing.

### DELETE `/business-directory/:id`

Delete business listing.

---

## 👥 Community Groups

### GET `/community-groups`

Get community groups.

### POST `/community-groups`

Create community group (institute admin or alumni).

**Request Body:**

```json
{
  "name": "React Developers Group",
  "description": "Group for React enthusiasts",
  "category": "technology",
  "visibility": "public", // or "private"
  "rules": ["Be respectful", "No spam"]
}
```

### GET `/community-groups/:id`

Get group details.

### POST `/community-groups/:id/join`

Join group.

### POST `/community-groups/:id/leave`

Leave group.

### GET `/community-groups/:id/members`

Get group members.

### POST `/community-groups/:id/posts`

Create group post.

---

## 📢 Announcements

### GET `/announcements`

Get announcements.

**Query Parameters:**

- `important` (optional): true/false for important announcements

### POST `/announcements`

Create announcement (institute admin only).

**Request Body:**

```json
{
  "title": "Important Update",
  "content": "Campus will be closed on Monday",
  "importance": "high", // low, medium, high
  "targetAudience": "all" // or "alumni", "students", "faculty"
}
```

### GET `/announcements/:id`

Get announcement details.

### PUT `/announcements/:id`

Update announcement.

### DELETE `/announcements/:id`

Delete announcement.

---

## 🖼️ Gallery

### GET `/gallery`

Get gallery items.

**Query Parameters:**

- `album` (optional): Filter by album name
- `type` (optional): image, video

### POST `/gallery`

Upload gallery item (multipart/form-data).

**Form Data:**

- `file`: Image or video file
- `title`: Item title
- `description`: Item description
- `album`: Album name
- `tags`: Comma-separated tags

### DELETE `/gallery/:id`

Delete gallery item.

---

## 🔔 Notifications

### GET `/notifications`

Get user notifications.

**Query Parameters:**

- `unread` (optional): true/false

### PUT `/notifications/:id/read`

Mark notification as read.

### PUT `/notifications/read-all`

Mark all notifications as read.

### DELETE `/notifications/:id`

Delete notification.

---

## 👑 Admin Endpoints

### GET `/admin/users`

Get all users (super admin only).

### PUT `/admin/users/:id/role`

Update user role.

**Request Body:**

```json
{
  "role": "institute_admin"
}
```

### GET `/admin/institutes/pending`

Get pending institute requests.

### POST `/admin/institutes/:id/approve`

Approve institute request.

### POST `/admin/institutes/:id/reject`

Reject institute request.

### GET `/admin/analytics`

Get platform analytics (super admin only).

### GET `/admin/audit-logs`

Get audit logs (super admin only).

---

## ⚙️ Operations

### GET `/ops/health/detailed`

Detailed health check with service status.

### GET `/ops/metrics`

Application metrics (Prometheus format).

### POST `/ops/seed`

Seed database with demo data (development only).

### POST `/ops/clear-test-data`

Clear test data (development only).

---

## WebSocket Events

Connect to `ws://localhost:5000` for real-time updates.

### Events:

- `connect`: Connection established
- `disconnect`: Connection lost
- `notification`: New notification
- `message`: New chat message
- `post_like`: Post liked
- `post_comment`: New comment on post
- `mentorship_request`: New mentorship request

### Joining Rooms:

```javascript
socket.emit("join", { room: "user:userId" });
socket.emit("join", { room: "mentorship:conversationId" });
```

---

## Error Codes

| Code             | Description              |
| ---------------- | ------------------------ |
| `AUTH_001`       | Invalid credentials      |
| `AUTH_002`       | Token expired            |
| `AUTH_003`       | Insufficient permissions |
| `VALID_001`      | Validation failed        |
| `DB_001`         | Database error           |
| `NOT_FOUND_001`  | Resource not found       |
| `CONFLICT_001`   | Resource already exists  |
| `RATE_LIMIT_001` | Rate limit exceeded      |

---

## Examples

### cURL Example - Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### cURL Example - Get Alumni with Auth

```bash
curl -X GET http://localhost:5000/api/alumni \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript Fetch Example

```javascript
const response = await fetch("http://localhost:5000/api/alumni", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  }
});
const data = await response.json();
```

---

## Versioning

Current API version: v1

API version is included in the URL path for future versions:

- `/api/v1/alumni`
- `/api/v2/alumni` (future)

---

## Support

For API issues or questions:

1. Check the [GitHub repository](https://github.com/your-repo)
2. Contact: api-support@alumninetwork.com

---

_Last Updated: May 2026_  
_Documentation Version: 1.0_

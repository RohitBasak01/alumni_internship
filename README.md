# Alumni Network SaaS (MERN)

Multi-tenant alumni management platform built with MongoDB, Express, React, and Node.js.

## 📋 Project Status

**Current Version**: 1.0.0 (Development)
**Last Updated**: May 2026

### ✅ Implemented Features

- Multi-tenant architecture with shared/dedicated database support
- JWT authentication with role-based access control (super_admin, institute_admin, alumni)
- Alumni directory with profiles and search
- Advanced alumni search with skills, experience, and availability filters
- Mentorship system with real-time chat (Socket.IO)
- Event management and registration
- Job board with applications
- Business directory
- Community groups
- Newsroom/announcements
- Gallery/media management
- Notifications system
- File uploads with Multer
- OAuth integration (Google, LinkedIn)

### 🆕 Recent Enhancements (May 2026)

- **Advanced Alumni Filtering**: Added comprehensive search filters including skills (multi-select), experience range, company size, availability status, and saved searches functionality.

### 🚧 In Progress / Planned

- Advanced analytics dashboard
- Payment integration (Razorpay/Stripe)
- Mobile app (React Native)
- AI-powered recommendations
- White-labeling capabilities

## 🏗️ Architecture Overview

### Tech Stack

- **Frontend**: React 19 + Vite + React Router + TanStack Query + Tailwind CSS
- **Backend**: Node.js + Express + Mongoose + Socket.IO
- **Database**: MongoDB with multi-tenant support
- **Authentication**: JWT with refresh tokens, OAuth 2.0
- **Real-time**: Socket.IO for chat and notifications
- **Styling**: Tailwind CSS with component-specific CSS

### Multi-Tenant Approach

Start with a shared database and shared collections.

Every tenant-owned document stores:

- `instituteId`

Requests are resolved by:

1. reading the incoming host
2. finding the matching institute by `domain` or `subdomain`
3. attaching the tenant to `req.tenant`
4. filtering all business queries by `req.tenant._id`

This is the best tradeoff for an MVP because it is simple, affordable, and easy to operate.

Example tenants:

- `spit.yourplatform.com`
- `mit.yourplatform.com`
- `alumni.spit.ac.in`

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB 6+ (running locally or Atlas connection)
- Git

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd alumni_internship

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Setup

#### Backend Configuration

Copy the example environment file and update values:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/alumni-network
JWT_SECRET=your-super-secret-jwt-key-here
CLIENT_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

#### Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Database Setup

```bash
# Start MongoDB (if running locally)
# On Windows with MongoDB installed as service, it should already be running

# Seed demo data
cd backend
npm run seed
```

### 4. Start Development Servers

#### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

#### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/api/health

## 👥 Demo Accounts

Use these credentials to log in:

| Email                          | Password            | Role            |
| ------------------------------ | ------------------- | --------------- |
| `superadmin@alumninetwork.com` | `Admin@123`         | Super Admin     |
| `admin@spit.edu`               | `Institute@123`     | Institute Admin |
| `aarav@spit.edu`               | `Alumni@123`        | Alumni          |
| `admin@greenwoodschool.edu`    | `School@123`        | Institute Admin |
| `maya@greenwoodschool.edu`     | `FormerStudent@123` | Alumni          |

## 📁 Project Structure

```
alumni_internship/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   ├── db/             # Database connection management
│   │   ├── scripts/        # Database scripts and migrations
│   │   ├── app.js          # Express app configuration
│   │   └── server.js       # Server entry point
│   ├── uploads/            # File uploads directory
│   ├── .env.example        # Environment variables template
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # React context providers
│   │   ├── lib/            # Library utilities
│   │   ├── styles/         # CSS stylesheets
│   │   ├── utils/          # Utility functions
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # Entry point
│   ├── .env.example        # Frontend environment variables
│   └── package.json
├── docs/                   # Documentation
├── plans/                  # Project plans and assessments
└── README.md               # This file
```

## 🔧 Development

### Backend Development

```bash
cd backend
npm run dev        # Start with nodemon (auto-restart)
npm start          # Start without auto-restart
npm run seed       # Seed database with demo data
```

### Frontend Development

```bash
cd frontend
npm run dev        # Start Vite dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm test           # Run tests
```

### Key Backend Rule

Any tenant-owned query must include `instituteId`.

Examples:

```js
AlumniProfile.find({ instituteId: req.tenant._id });
Job.find({ instituteId: req.tenant._id, status: "published" });
```

## 🌐 API Documentation

### Base URL

`http://localhost:5000/api`

### Key Endpoints

| Method | Endpoint              | Description                                                                           | Authentication |
| ------ | --------------------- | ------------------------------------------------------------------------------------- | -------------- |
| GET    | `/health`             | Health check                                                                          | Public         |
| POST   | `/auth/login`         | User login                                                                            | Public         |
| POST   | `/auth/register`      | User registration                                                                     | Public         |
| GET    | `/alumni`             | Get alumni directory with advanced filtering (skills, experience, availability, etc.) | Required       |
| GET    | `/events`             | Get events                                                                            | Required       |
| GET    | `/jobs`               | Get job listings                                                                      | Required       |
| POST   | `/mentorship/request` | Create mentorship request                                                             | Required       |

### Authentication

Include JWT token in Authorization header:

```
Authorization: Bearer <token>
```

## 🛠️ Environment Variables

### Backend (.env)

| Variable                                           | Description                     | Default                                    |
| -------------------------------------------------- | ------------------------------- | ------------------------------------------ |
| `PORT`                                             | Server port                     | `5000`                                     |
| `MONGODB_URI`                                      | MongoDB connection URI          | `mongodb://127.0.0.1:27017/alumni-network` |
| `CENTRAL_MONGODB_URI`                              | Central database URI            | Same as MONGODB_URI                        |
| `JWT_SECRET`                                       | Secret for signing JWT tokens   | `change-this-secret`                       |
| `CLIENT_URL`                                       | Frontend URL for CORS           | `http://localhost:5173`                    |
| `CORS_ALLOWED_ORIGINS`                             | Comma-separated allowed origins | `http://localhost:5173`                    |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email configuration             | (Empty)                                    |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`         | Google OAuth credentials        | (Empty)                                    |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`     | LinkedIn OAuth credentials      | (Empty)                                    |

### Frontend (.env)

| Variable                | Description                      | Default                     |
| ----------------------- | -------------------------------- | --------------------------- |
| `VITE_API_URL`          | Backend API URL                  | `http://localhost:5000/api` |
| `VITE_TENANT_SUBDOMAIN` | Tenant subdomain for development | (Empty)                     |
| `VITE_TENANT_DOMAIN`    | Tenant domain for development    | (Empty)                     |
| `VITE_DEMO_ACCOUNTS`    | Demo accounts JSON               | `[]`                        |

## 🧪 Testing

### Frontend Tests

```bash
cd frontend
npm test
```

### Backend Tests

_(To be implemented)_

## 🐳 Docker Deployment

_(To be implemented)_

## 📈 Monitoring & Logging

- Backend uses Morgan for HTTP request logging
- Structured logging with request IDs
- Health check endpoint at `/api/health`
- Error tracking middleware

## 🔒 Security Features

- JWT authentication with refresh tokens
- CSRF protection middleware
- Rate limiting on API endpoints
- Input validation middleware
- Helmet.js security headers (to be implemented)
- Password hashing with bcryptjs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use ESLint and Prettier (configuration to be added)
- Follow existing code conventions
- Write meaningful commit messages

## 📄 License

This project is proprietary. All rights reserved.

## 🆘 Support

For issues and questions:

1. Check the [docs](docs/) directory
2. Review existing issues
3. Contact the development team

## 🎯 Roadmap

### Phase 1 (Completed)

- [x] Multi-tenant architecture
- [x] Core authentication system
- [x] Alumni directory
- [x] Basic admin dashboard

### Phase 2 (In Progress)

- [ ] Advanced analytics
- [ ] Payment integration
- [ ] Mobile responsiveness improvements
- [ ] Performance optimization

### Phase 3 (Planned)

- [ ] AI-powered features
- [ ] White-labeling
- [ ] Mobile app
- [ ] Marketplace integrations

---

**Last Updated**: May 2026  
**Maintained by**: Alumni Network Development Team

<!-- diagnostic push marker -->

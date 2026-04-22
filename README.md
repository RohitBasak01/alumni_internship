# Alumni Network SaaS (MERN)

Multi-tenant alumni management platform built with MongoDB, Express, React, and Node.js.

## Product Direction

This repo is set up for a SaaS model where:

- each institute gets its own portal
- all institutes share the same platform infrastructure
- tenant data is isolated using `instituteId`
- custom domains and subdomains resolve to the correct institute

Example tenants:

- `spit.yourplatform.com`
- `mit.yourplatform.com`
- `alumni.spit.ac.in`

## Suggested Stack

- Frontend: React + Vite + React Router + TanStack Query + Tailwind CSS
- Backend: Node.js + Express + Mongoose
- Database: MongoDB
- Auth: JWT with role-based access
- Payments: Razorpay for India, Stripe if needed later
- Hosting: Vercel or Netlify for frontend, Render/AWS/DigitalOcean for backend

## Multi-Tenant Approach

Start with a shared database and shared collections.

Every tenant-owned document stores:

- `instituteId`

Requests are resolved by:

1. reading the incoming host
2. finding the matching institute by `domain` or `subdomain`
3. attaching the tenant to `req.tenant`
4. filtering all business queries by `req.tenant._id`

This is the best tradeoff for an MVP because it is simple, affordable, and easy to operate.

## MVP Scope

Phase 1:

- institute signup request
- super admin approval
- tenant portal activation
- alumni profiles
- alumni directory
- institute admin dashboard

Phase 2:

- events
- jobs
- announcements
- email invites

Phase 3:

- donations
- mentorship
- analytics
- AI-powered alumni search

## Repo Layout

```text
backend/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    utils/
    app.js
    server.js
frontend/
```

## Backend Status

This starter includes:

- tenant resolver middleware
- role-aware auth middleware scaffold
- core Mongoose models for institutes, users, alumni, events, jobs
- API route skeletons for auth, institutes, alumni, events, jobs

## Next Build Steps

1. Start MongoDB locally
2. Seed demo data with `cd backend && npm.cmd run seed`
3. Start the API with `cd backend && npm.cmd run dev`
4. Start the frontend with `cd frontend && npm.cmd run dev`
5. Log in with the seeded demo accounts from the login page

## Email Invites

Alumni invites support SMTP delivery.

Add these values to [backend/.env](c:\Users\hp\Desktop\internship_2\alumni-network\backend.env):

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

If SMTP is not configured, the backend will still create the invite and log the setup link for local development.

## Core Roles

- `super_admin`: platform owner
- `institute_admin`: manages a single institute portal
- `alumni`: alumni user

## Key Backend Rule

Any tenant-owned query must include `instituteId`.

Examples:

```js
AlumniProfile.find({ instituteId: req.tenant._id });
Job.find({ instituteId: req.tenant._id, status: "published" });
```

## Recommended Frontend Structure

You can split the UI into:

- marketing site on root domain
- tenant portal UI for institute-specific pages
- super admin dashboard for approvals and subscriptions

If you want, the next step can be scaffolding the React frontend and wiring it to this backend.

## Demo Accounts

- `superadmin@alumninetwork.com` / `Admin@123`
- `admin@spit.edu` / `Institute@123`
- `aarav@spit.edu` / `Alumni@123`
- `admin@greenwoodschool.edu` / `School@123`
- `maya@greenwoodschool.edu` / `FormerStudent@123`

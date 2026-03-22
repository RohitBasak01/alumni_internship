# Frontend

React frontend for the multi-tenant alumni SaaS.

## Included

- Vite + React app scaffold
- React Router navigation
- TanStack Query setup
- tenant-aware layout logic
- marketing pages and core dashboard placeholders

## Main Routes

- `/` marketing landing page
- `/request-portal` institute onboarding request form
- `/login` login page
- `/portal` tenant dashboard shell
- `/portal/alumni` alumni directory
- `/portal/events` events page
- `/portal/jobs` jobs page
- `/super-admin` platform admin dashboard

## Tenant Resolution

The frontend detects the current host and derives:

- root platform mode on localhost or main domain
- tenant mode on subdomain/custom domain

This lets us show tenant-specific headers and API behavior without splitting into multiple apps too early.

## Next Step

Install dependencies and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

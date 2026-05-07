# Development Utilities

This directory contains utility scripts for development and debugging purposes.

## Available Scripts

### `check_db.js`

Checks database connection and lists all institutions.

**Usage:**

```bash
cd backend
node scripts/dev-utils/check_db.js
```

### `check_admins.js`

Lists all admin users in the system.

**Usage:**

```bash
cd backend
node scripts/dev-utils/check_admins.js
```

### `check_alumni.js`

Lists alumni profiles with basic information.

**Usage:**

```bash
cd backend
node scripts/dev-utils/check_alumni.js
```

### `check_central_groups.js`

Lists community groups in the central database.

**Usage:**

```bash
cd backend
node scripts/dev-utils/check_central_groups.js
```

### `check_spit_groups.js`

Lists community groups for SPIT institution.

**Usage:**

```bash
cd backend
node scripts/dev-utils/check_spit_groups.js
```

### `list_groups.js`

Lists all community groups across all institutions.

**Usage:**

```bash
cd backend
node scripts/dev-utils/list_groups.js
```

## Prerequisites

1. MongoDB must be running
2. Environment variables must be set (copy from `.env.example` to `.env`)
3. Database should be seeded with `npm run seed`

## Notes

- These scripts are for development purposes only
- They should not be used in production
- They require database access credentials
- Use them to debug data issues or verify database state

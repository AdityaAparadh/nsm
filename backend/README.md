# Workshop Management System - Backend

API for managing educational workshops, assignments, enrollments, and certificates with JupyterHub integration.

## Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database URL and secrets
```

### 3. Run Database Migrations
```bash
bunx prisma migrate dev
```

### 4. Create Admin User
```bash
bun run create-admin
```

This creates/updates an admin user with:
- **Email:** admin@admin.com
- **Password:** Value from `ADMIN_PASSWORD` in .env (default: admin123!@#)

### 5. Start Server
```bash
bun run dev
```

Server runs at http://localhost:3000

## Available Scripts

- `bun run dev` - Start development server
- `bun run start` - Start production server
- `bun run create-admin` - Create/update admin user

## API Documentation

### Authentication
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### Users (Admin only)
- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/:id` - Get user
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Workshops
- `GET /api/v1/workshops` - List workshops (role-filtered)
- `POST /api/v1/workshops` - Create workshop (Admin)
- `GET /api/v1/workshops/:id` - Get workshop
- `PATCH /api/v1/workshops/:id` - Update workshop (Admin)
- `DELETE /api/v1/workshops/:id` - Delete workshop (Admin)

See `/docs` folder for detailed API documentation.

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Admin User
ADMIN_PASSWORD=admin123!@#
```

## Tech Stack

- **Runtime:** Bun
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Validation:** Zod
- **Authentication:** JWT with bcryptjs

---

This project was created using `bun init` in bun v1.2.23. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

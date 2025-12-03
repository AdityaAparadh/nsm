# Authentication API - v1

## Overview

The authentication system has been successfully implemented with the following features:

- User signup with automatic PARTICIPANT role assignment
- User login with JWT token generation
- Protected route to get current user profile
- Middleware for authentication and role-based authorization

## Project Structure

```
src/
├── api/
│   └── v1/
│       └── auth/
│           ├── auth.controller.ts    # Request handling and validation
│           ├── auth.service.ts       # Business logic
│           ├── auth.routes.ts        # Route definitions
│           └── auth.validation.ts    # Zod schemas
├── lib/
│   └── prisma.ts                     # Prisma client with PostgreSQL adapter
├── middleware/
│   └── auth.middleware.ts            # JWT authentication & authorization
├── utils/
│   ├── jwt.ts                        # JWT token utilities
│   └── password.ts                   # Password hashing utilities
└── app.ts                            # Express app configuration
```

## API Endpoints

### 1. Signup
**POST** `/api/v1/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "roles": ["PARTICIPANT"],
    "additionalInfo": null
  }
}
```

### 2. Login
**POST** `/api/v1/auth/login`

Authenticate with email and password.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "roles": ["PARTICIPANT"],
    "additionalInfo": null
  }
}
```

### 3. Get Current User
**GET** `/api/v1/auth/me`

Get the profile of the currently authenticated user.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Response (200):**
```json
{
  "id": 1,
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "roles": ["PARTICIPANT"],
  "additionalInfo": null
}
```

## Environment Variables

Create a `.env` file in the backend directory with:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

## Running the Server

```bash
# Start the server
bun run index.ts

# Server will be available at:
# http://localhost:3000
```

## Testing the Endpoints

### Using curl:

```bash
# 1. Signup
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# 2. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# 3. Get current user (replace TOKEN with your JWT)
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer TOKEN"
```

## Security Features

- **Password Hashing**: bcryptjs with 10 salt rounds
- **JWT Tokens**: 7-day expiration by default
- **Validation**: Zod schemas for request validation
- **Error Handling**: Proper HTTP status codes and error messages
- **Type Safety**: Full TypeScript implementation

## Middleware

### `authenticate`
Verifies JWT token and attaches user payload to request.

### `requireRole(...roles)`
Checks if authenticated user has one of the specified roles.

**Usage:**
```typescript
router.get('/admin-only', authenticate, requireRole(Role.ADMIN), handler);
```

## Next Steps

The auth routes are fully implemented and tested. You can now:

1. Implement other resource routes (Users, Workshops, Assignments, etc.)
2. Add refresh token functionality
3. Implement password reset flow
4. Add email verification
5. Implement rate limiting for auth endpoints

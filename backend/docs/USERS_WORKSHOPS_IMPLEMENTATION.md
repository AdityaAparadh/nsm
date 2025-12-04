# Users & Workshops API Implementation

## Overview

Successfully implemented complete CRUD operations for Users and Workshops with role-based access control.

## Users Routes

Base path: `/api/v1/users`

**Access:** All routes require Admin authentication

### 1. List Users
**GET** `/api/v1/users`

Query parameters:
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `role` (enum: ADMIN | INSTRUCTOR | PARTICIPANT) - Filter by role

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "fullName": "John Doe",
      "email": "john@example.com",
      "roles": ["PARTICIPANT"],
      "additionalInfo": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### 2. Get User by ID
**GET** `/api/v1/users/:userId`

**Response (200):**
```json
{
  "id": 1,
  "fullName": "John Doe",
  "email": "john@example.com",
  "roles": ["PARTICIPANT"],
  "additionalInfo": null
}
```

### 3. Create User
**POST** `/api/v1/users`

**Request Body:**
```json
{
  "fullName": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "roles": ["INSTRUCTOR"],
  "additionalInfo": {
    "department": "Computer Science"
  }
}
```

**Response (201):**
```json
{
  "id": 2,
  "fullName": "Jane Smith",
  "email": "jane@example.com",
  "roles": ["INSTRUCTOR"],
  "additionalInfo": {
    "department": "Computer Science"
  }
}
```

### 4. Update User
**PATCH** `/api/v1/users/:userId`

**Request Body:**
```json
{
  "fullName": "Jane Doe",
  "roles": ["INSTRUCTOR", "ADMIN"]
}
```

**Response (200):**
```json
{
  "id": 2,
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "roles": ["INSTRUCTOR", "ADMIN"],
  "additionalInfo": {
    "department": "Computer Science"
  }
}
```

### 5. Delete User
**DELETE** `/api/v1/users/:userId`

**Response (204):** No content

---

## Workshops Routes

Base path: `/api/v1/workshops`

### Access Control

- **List & Get:** All authenticated users (filtered by role)
  - Admin: See all workshops
  - Instructor: See workshops they instruct or are enrolled in
  - Participant: See workshops they're enrolled in
- **Create/Update/Delete:** Admin only

### 1. List Workshops
**GET** `/api/v1/workshops`

Query parameters:
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `status` (enum: DRAFT | ACTIVE | ARCHIVED) - Filter by status

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Introduction to Python",
      "status": "ACTIVE",
      "startDate": "2025-01-15T09:00:00Z",
      "endDate": "2025-01-20T17:00:00Z",
      "requiredPassedAssignments": 3,
      "s3HomeZipKey": "workshops/101/home_content.zip",
      "additionalInfo": null,
      "assignmentCount": 5,
      "instructorCount": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

### 2. Get Workshop by ID
**GET** `/api/v1/workshops/:workshopId`

Includes assignments and instructors.

**Response (200):**
```json
{
  "id": 1,
  "name": "Introduction to Python",
  "status": "ACTIVE",
  "startDate": "2025-01-15T09:00:00Z",
  "endDate": "2025-01-20T17:00:00Z",
  "requiredPassedAssignments": 3,
  "s3HomeZipKey": "workshops/101/home_content.zip",
  "additionalInfo": null,
  "assignments": [
    {
      "id": 1,
      "workshopId": 1,
      "name": "Python Basics",
      "description": "Learn Python fundamentals",
      "maximumScore": 100,
      "passingScore": 70,
      "isCompulsory": true,
      "evaluationType": "LOCAL",
      "s3EvalBinaryKey": null
    }
  ],
  "instructors": [
    {
      "id": 2,
      "fullName": "Jane Doe",
      "email": "jane@example.com"
    }
  ]
}
```

### 3. Create Workshop
**POST** `/api/v1/workshops`

**Access:** Admin only

**Request Body:**
```json
{
  "name": "Advanced Machine Learning",
  "status": "DRAFT",
  "startDate": "2025-02-01T09:00:00Z",
  "endDate": "2025-02-15T17:00:00Z",
  "requiredPassedAssignments": 5,
  "s3HomeZipKey": "workshops/102/home.zip",
  "additionalInfo": {
    "level": "Advanced",
    "prerequisites": ["Basic ML"]
  }
}
```

**Response (201):**
```json
{
  "id": 2,
  "name": "Advanced Machine Learning",
  "status": "DRAFT",
  "startDate": "2025-02-01T09:00:00Z",
  "endDate": "2025-02-15T17:00:00Z",
  "requiredPassedAssignments": 5,
  "s3HomeZipKey": "workshops/102/home.zip",
  "additionalInfo": {
    "level": "Advanced",
    "prerequisites": ["Basic ML"]
  }
}
```

### 4. Update Workshop
**PATCH** `/api/v1/workshops/:workshopId`

**Access:** Admin only

**Request Body:**
```json
{
  "status": "ACTIVE",
  "requiredPassedAssignments": 4
}
```

**Response (200):**
```json
{
  "id": 2,
  "name": "Advanced Machine Learning",
  "status": "ACTIVE",
  "startDate": "2025-02-01T09:00:00Z",
  "endDate": "2025-02-15T17:00:00Z",
  "requiredPassedAssignments": 4,
  "s3HomeZipKey": "workshops/102/home.zip",
  "additionalInfo": {
    "level": "Advanced",
    "prerequisites": ["Basic ML"]
  }
}
```

### 5. Delete Workshop
**DELETE** `/api/v1/workshops/:workshopId`

**Access:** Admin only

**Response (204):** No content

---

## Project Structure

```
src/api/v1/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.routes.ts
│   └── auth.validation.ts
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.routes.ts
│   └── users.validation.ts
└── workshops/
    ├── workshops.controller.ts
    ├── workshops.service.ts
    ├── workshops.routes.ts
    └── workshops.validation.ts
```

## Features

### Users Service
- ✅ List users with pagination and role filtering
- ✅ Get user by ID
- ✅ Create user with password hashing
- ✅ Update user (with email uniqueness check)
- ✅ Delete user
- ✅ Admin-only access

### Workshops Service
- ✅ List workshops with role-based filtering
- ✅ Get workshop with assignments and instructors
- ✅ Create workshop with validation
- ✅ Update workshop
- ✅ Delete workshop
- ✅ Role-based access control:
  - Admin: Full access
  - Instructor: See workshops they teach/are enrolled in
  - Participant: See enrolled workshops only

## Validation

All routes use Zod schemas for request validation:

- Type-safe input validation
- Automatic error responses
- Custom error messages
- Date validation with constraints (endDate >= startDate)

## Error Handling

Consistent error responses across all endpoints:

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "message": "Invalid email address",
  "details": [...]
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing JWT token",
  "code": "MISSING_TOKEN"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**404 Not Found:**
```json
{
  "error": "Not Found",
  "message": "Workshop not found",
  "code": "WORKSHOP_NOT_FOUND"
}
```

**409 Conflict:**
```json
{
  "error": "Conflict",
  "message": "Email already in use",
  "code": "EMAIL_IN_USE"
}
```

## Testing Examples

### Create an Admin User (requires existing admin token)
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Admin User",
    "email": "admin@example.com",
    "password": "SecurePass123!",
    "roles": ["ADMIN"]
  }'
```

### List All Workshops
```bash
curl -X GET "http://localhost:3000/api/v1/workshops?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create a Workshop (Admin only)
```bash
curl -X POST http://localhost:3000/api/v1/workshops \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python Workshop",
    "status": "DRAFT",
    "startDate": "2025-02-01T09:00:00Z",
    "endDate": "2025-02-10T17:00:00Z"
  }'
```

## Next Steps

Remaining routes to implement:
- Assignments (nested under workshops)
- Enrollments (with presigned links)
- Submissions (admin only)
- Certificates (generation and verification)
- Instructors (workshop instructor management)
- Storage (presigned S3 URLs)

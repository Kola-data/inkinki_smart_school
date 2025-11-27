# System User API Documentation

## Overview

The System User API provides complete CRUD operations for managing system administrators with role-based access control, authentication, and audit tracking.

## Table Structure

### `system_users` Table

**Core Identity Info:**
- `full_name` (string, required) - Admin's real name
- `username` (string, required, unique) - Login identifier
- `email` (string, required, unique) - Primary contact
- `phone_number` (string, optional) - For 2FA or alerts
- `profile_image` (string, optional) - URL or path to avatar

**Authentication & Security:**
- `password` (hashed string, required) - Securely stored password
- `role` (enum, required) - User role: `super-admin`, `finance-admin`, `academic-admin`
- `last_login` (datetime, optional) - Last access timestamp
- `account_status` (enum, required) - Status: `active`, `inactive`, `suspended`, `archived`

**System Tracking / Auditing:**
- `created_at` (datetime) - Account creation timestamp
- `updated_at` (datetime) - Last profile update
- `created_by` (UUID, FK) - Admin who created this account
- `device_ip_logs` (JSON) - Tracks devices and IP addresses (last 10 entries)

## API Endpoints

Base URL: `/api/v1/system-users`

### 1. Get All System Users (Paginated)

**GET** `/api/v1/system-users/`

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `page_size` (int, default: 50, max: 100) - Items per page
- `role` (optional) - Filter by role: `super-admin`, `finance-admin`, `academic-admin`
- `status` (optional) - Filter by status: `active`, `inactive`, `suspended`, `archived`

**Response:**
```json
{
  "items": [...],
  "total": 10,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

### 2. Get System User by ID

**GET** `/api/v1/system-users/{user_id}`

**Response:**
```json
{
  "user_id": "uuid",
  "full_name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "profile_image": "https://...",
  "role": "super-admin",
  "last_login": "2025-11-09T13:00:00Z",
  "account_status": "active",
  "created_at": "2025-11-09T10:00:00Z",
  "updated_at": "2025-11-09T12:00:00Z",
  "created_by": "uuid",
  "device_ip_logs": {...}
}
```

### 3. Get System User by Username

**GET** `/api/v1/system-users/username/{username}`

### 4. Create System User

**POST** `/api/v1/system-users/`

**Request Body:**
```json
{
  "full_name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "profile_image": "https://...",
  "role": "super-admin",
  "account_status": "active",
  "password": "securepassword123",
  "created_by": "uuid" // Optional
}
```

**Response:** 201 Created with user object

### 5. Update System User

**PUT** `/api/v1/system-users/{user_id}`

**Request Body:** (all fields optional)
```json
{
  "full_name": "John Doe Updated",
  "username": "johndoe_new",
  "email": "john.new@example.com",
  "phone_number": "+1234567890",
  "profile_image": "https://...",
  "role": "finance-admin",
  "account_status": "active",
  "password": "newpassword123" // Will be hashed
}
```

### 6. Update Account Status

**PATCH** `/api/v1/system-users/{user_id}/status`

**Request Body:**
```json
{
  "account_status": "suspended"
}
```

### 7. Update Password

**PATCH** `/api/v1/system-users/{user_id}/password`

**Request Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

### 8. Update Last Login

**PATCH** `/api/v1/system-users/{user_id}/login`

**Request Body:**
```json
{
  "device_info": {
    "browser": "Chrome",
    "os": "Linux",
    "device": "Desktop"
  },
  "ip_address": "192.168.1.1"
}
```

### 9. Delete System User (Soft Delete)

**DELETE** `/api/v1/system-users/{user_id}`

Soft deletes by setting `account_status` to `archived`.

### 10. Permanently Delete System User

**DELETE** `/api/v1/system-users/{user_id}/permanent`

⚠️ **Warning:** This permanently deletes the user. Use with caution.

## Role Enum Values

- `super-admin` - Full system access
- `finance-admin` - Finance-related access
- `academic-admin` - Academic-related access

## Account Status Enum Values

- `active` - Account is active and can log in
- `inactive` - Account is inactive
- `suspended` - Account is temporarily suspended
- `archived` - Account is archived (soft deleted)

## Features

✅ **Password Security:** Passwords are hashed using bcrypt  
✅ **Unique Constraints:** Username and email are unique  
✅ **Role-Based Access:** Three role levels  
✅ **Account Status Management:** Active, inactive, suspended, archived  
✅ **Login Tracking:** Last login timestamp and device/IP logs  
✅ **Audit Trail:** Created by tracking and timestamps  
✅ **Pagination:** All list endpoints support pagination  
✅ **Filtering:** Filter by role and status  
✅ **Caching:** Redis caching for performance  
✅ **Logging:** All operations are logged  

## Example Usage

### Create a Super Admin

```bash
curl -X POST "http://localhost:8000/api/v1/system-users/" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "System Administrator",
    "username": "admin",
    "email": "admin@inkingi.school",
    "password": "SecurePass123",
    "role": "super-admin",
    "account_status": "active"
  }'
```

### Get All Active Super Admins

```bash
curl "http://localhost:8000/api/v1/system-users/?role=super-admin&status=active&page=1&page_size=10"
```

### Update Last Login

```bash
curl -X PATCH "http://localhost:8000/api/v1/system-users/{user_id}/login" \
  -H "Content-Type: application/json" \
  -d '{
    "device_info": {"browser": "Chrome", "os": "Linux"},
    "ip_address": "192.168.1.100"
  }'
```

## Notes

- Password must be at least 8 characters long
- Username and email must be unique
- The `created_by` field references another system user
- Device/IP logs keep the last 10 entries automatically
- Soft delete (DELETE) sets status to archived
- Hard delete (DELETE /permanent) permanently removes the user


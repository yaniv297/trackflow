# TrackFlow Multi-User Migration Guide

## Overview

This document outlines the transformation of TrackFlow from a single-user application to a multi-user system with authentication and user isolation.

## What Has Been Implemented

### Backend Changes

#### 1. Database Models

- **New User Model**: Added `User` table with authentication fields
- **Updated Song Model**: Added `user_id` foreign key for ownership
- **Updated Artist Model**: Added `user_id` foreign key for ownership
- **Relationships**: Established proper relationships between users, songs, and artists

#### 2. Authentication System

- **JWT Token Authentication**: Implemented secure token-based authentication
- **Password Hashing**: Using bcrypt for secure password storage
- **User Registration & Login**: Complete authentication endpoints
- **Token Refresh**: Automatic token refresh mechanism

#### 3. API Security

- **Protected Endpoints**: All song-related endpoints now require authentication
- **User Isolation**: Users can only access their own songs and data
- **Authorization Headers**: All API calls require Bearer tokens

#### 4. Updated API Endpoints

- **Songs API**: All endpoints now filter by current user
- **Authoring API**: Protected and user-scoped
- **Tools API**: Protected and user-scoped
- **Stats API**: User-specific statistics
- **Album Series**: Remains public (as specified)

### Frontend Changes

#### 1. Authentication Context

- **AuthProvider**: Global authentication state management
- **useAuth Hook**: Easy access to authentication functions
- **Token Management**: Automatic token storage and retrieval

#### 2. Authentication Components

- **LoginForm**: User login interface
- **RegisterForm**: User registration interface
- **ProtectedRoute**: Route protection component

#### 3. Updated App Structure

- **Protected Routes**: All main app routes require authentication
- **User Interface**: Shows current user and logout button
- **API Utilities**: Centralized authenticated API calls

## Migration Process

### Step 1: Run Database Migration

```bash
cd trackflow/backend
python migrate_to_multi_user.py
```

This script will:

- Create the new `users` table
- Create a default user (yaniv297) from existing data
- Assign all existing songs to the default user
- Assign all existing artists to the default user

### Step 2: Install New Dependencies

```bash
cd trackflow/backend
pip install -r requirements.txt
```

New dependencies added:

- `python-jose[cryptography]` - JWT token handling
- `passlib[bcrypt]` - Password hashing
- `python-multipart` - Form data handling
- `email-validator` - Email validation

### Step 3: Set Environment Variables

Add to your `.env` file:

```
SECRET_KEY=your-secret-key-here
```

### Step 4: Test the Migration

1. Start the backend:

```bash
cd trackflow/backend
python main.py
```

2. Start the frontend:

```bash
cd trackflow/frontend
npm start
```

3. Navigate to the app and you should be redirected to `/login`
4. Login with:
   - Username: `yaniv297`
   - Password: `changeme123`

## Default User Credentials

After migration, a default user is created:

- **Username**: `yaniv297`
- **Email**: `yaniv297@example.com`
- **Password**: `changeme123`

**⚠️ IMPORTANT**: Change this password immediately after first login!

## User Data Isolation

### What Users Can See

- **Their own songs**: All songs they created
- **Their own artists**: Artists they've added
- **Their own statistics**: Personal song statistics
- **Public album series**: All album series (as specified)

### What Users Cannot See

- Other users' songs
- Other users' artists
- Other users' statistics
- Other users' authoring progress

## API Changes

### Authentication Required

All endpoints now require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### New Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info
- `POST /auth/refresh` - Refresh access token

### Updated Endpoints

All existing endpoints now filter by the authenticated user's data.

## Frontend API Usage

### Before (Single User)

```javascript
fetch(`${API_BASE_URL}/songs/`);
```

### After (Multi-User)

```javascript
import { apiGet } from "./utils/api";
const songs = await apiGet("/songs/");
```

The `apiGet`, `apiPost`, etc. utilities automatically include authentication headers.

## Security Features

1. **JWT Tokens**: Secure, stateless authentication
2. **Password Hashing**: Bcrypt with salt
3. **Token Expiration**: 30-minute token lifetime
4. **Automatic Logout**: On token expiration
5. **User Isolation**: Complete data separation
6. **Protected Routes**: Frontend route protection

## Troubleshooting

### Common Issues

1. **"Could not validate credentials"**

   - Token has expired, user needs to login again
   - Check if token is properly stored in localStorage

2. **"Song not found"**

   - User is trying to access another user's song
   - Check if song belongs to current user

3. **Migration fails**
   - Ensure database is accessible
   - Check if tables already exist
   - Verify database permissions

### Debug Commands

```bash
# Check if migration was successful
cd trackflow/backend
python -c "
from models import User, Song
from database import SessionLocal
db = SessionLocal()
users = db.query(User).all()
songs = db.query(Song).all()
print(f'Users: {len(users)}')
print(f'Songs: {len(songs)}')
db.close()
"
```

## Next Steps

1. **Change Default Password**: Update the default user password
2. **Add User Management**: Admin interface for user management
3. **Email Verification**: Add email verification for new registrations
4. **Password Reset**: Implement password reset functionality
5. **User Profiles**: Add user profile management
6. **Activity Logging**: Track user actions for audit purposes

## Rollback Plan

If you need to rollback to single-user:

1. Restore the original database backup
2. Remove the new authentication code
3. Revert frontend changes
4. Remove new dependencies

## Support

For issues or questions about the migration:

1. Check the troubleshooting section
2. Review the logs for error messages
3. Verify all environment variables are set
4. Ensure database connectivity

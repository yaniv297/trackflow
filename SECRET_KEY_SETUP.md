# SECRET_KEY Setup Guide

## Problem

Without a `SECRET_KEY` environment variable, each server instance generates a random secret key at startup. This causes:

1. **Token validation failures**: Tokens created by one instance cannot be validated by another
2. **Session invalidation on restart**: All tokens become invalid when the server restarts
3. **Intermittent 401/403 errors**: Users get logged out randomly

## Solution

Set the `SECRET_KEY` environment variable to the **same value** across all instances and environments.

### Generate a SECRET_KEY

```bash
# Option 1: Using OpenSSL (recommended)
openssl rand -base64 32

# Option 2: Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Set in Railway

1. Go to your Railway project
2. Navigate to **Variables** tab
3. Add a new variable:
   - **Name**: `SECRET_KEY`
   - **Value**: (paste the generated key)
4. **Important**: Set this for **all environments** (production, staging, preview)
5. Redeploy the service

### Set Locally

```bash
# In your .env file or shell
export SECRET_KEY="your-generated-key-here"
```

### Verify

After setting SECRET_KEY, check server logs on startup. You should **NOT** see the "CRITICAL WARNING" message about SECRET_KEY not being set.

## Security Notes

- **Never commit SECRET_KEY to git**
- Use different SECRET_KEY values for different environments (production vs staging)
- Keep SECRET_KEY secret - if compromised, all tokens must be regenerated
- Rotate SECRET_KEY periodically (requires all users to re-login)

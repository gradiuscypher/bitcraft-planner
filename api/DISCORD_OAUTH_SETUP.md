# Discord OAuth Setup Guide

This guide explains how to set up and use Discord OAuth authentication in the BitCraft Planner API.

## 🔧 Setup

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "OAuth2" section in your app settings
4. Add redirect URIs:
   - For development: `http://localhost:3000/auth/callback`
   - For production: `https://your-domain.com/auth/callback`

### 2. Configure Environment Variables

Create a `.env` file in the `api/` directory:

```bash
# Environment configuration
ENVIRONMENT=dev

# Discord OAuth configuration
DISCORD_CLIENT_ID=your_discord_app_client_id
DISCORD_CLIENT_SECRET=your_discord_app_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/auth/callback

# JWT configuration for session management
JWT_SECRET_KEY=your-very-secure-secret-key-change-in-production
```

### 3. Install Dependencies

The required dependencies have been added to `pyproject.toml`:
- `authlib>=1.3.0` - OAuth client library
- `itsdangerous>=2.1.0` - JWT token management

Install them with:
```bash
uv sync
```

## 🚀 Usage

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | GET | Get Discord OAuth login URL |
| `/auth/callback` | GET | Handle OAuth callback (automatic) |
| `/auth/me` | GET | Get current user info (requires auth) |
| `/auth/logout` | POST | Logout (client-side token deletion) |

### Testing Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/test/public` | GET | Public endpoint with OAuth flow instructions |
| `/test/protected` | GET | Protected endpoint requiring authentication |
| `/test/admin` | GET | Another protected endpoint example |

### OAuth Flow

1. **Get Login URL**
   ```bash
   curl http://localhost:8000/auth/login
   ```
   Response:
   ```json
   {
     "login_url": "https://discord.com/api/oauth2/authorize?client_id=..."
   }
   ```

2. **User Authorization**
   - User visits the login URL
   - Authorizes your Discord app
   - Gets redirected to callback URL

3. **Get Token**
   The callback endpoint returns:
   ```json
   {
     "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
     "token_type": "bearer",
     "expires_in": 86400,
     "user": {
       "id": 1,
       "discord_id": "123456789",
       "username": "YourUsername",
       "global_name": "Your Display Name",
       "avatar": "avatar_hash",
       "email": "user@example.com",
       "created_at": "2024-01-01T00:00:00"
     }
   }
   ```

4. **Use Protected Endpoints**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/auth/me
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/test/protected
   ```

## 🔒 Security Features

- **JWT Tokens**: Secure token-based authentication
- **Token Expiration**: Configurable token lifetime (default: 24 hours)
- **User Storage**: Discord user data stored in SQLite database
- **CORS Support**: Properly configured for web clients

## 🧑‍💻 Development

### Using the Auth Dependency

To protect any endpoint, use the `get_current_user` dependency:

```python
from fastapi import APIRouter, Depends
from routes.auth import get_current_user
from models.users import User

router = APIRouter()

@router.get("/my-protected-endpoint")
async def my_endpoint(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.username}!"}
```

### Database Schema

The `User` model includes:
- `id`: Primary key
- `discord_id`: Discord user ID (unique)
- `username`: Discord username
- `discriminator`: Legacy Discord discriminator
- `global_name`: New Discord display name
- `avatar`: Avatar hash
- `email`: User email (if provided)
- `created_at`/`updated_at`: Timestamps

## 🔍 Testing

1. Start the API:
   ```bash
   uv run fastapi dev api.py
   ```

2. Visit the public test endpoint:
   ```
   http://localhost:8000/test/public
   ```

3. Follow the OAuth flow instructions provided by the endpoint.

4. Test protected endpoints with your Bearer token.

## 🚨 Production Notes

- Change `JWT_SECRET_KEY` to a strong, random secret
- Use HTTPS for all OAuth redirects
- Set `ENVIRONMENT=prod` for production CORS restrictions
- Consider implementing refresh tokens for longer sessions
- Monitor Discord API rate limits 
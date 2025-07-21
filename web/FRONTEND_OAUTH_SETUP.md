# Frontend Discord OAuth Setup Guide

This guide explains how the frontend Discord OAuth integration works and how to set it up.

## 🛠️ Frontend Setup

### Environment Variables

Create a `.env` file in the `web/` directory:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
```

For production, update this to your actual API domain.

### Install Dependencies

All required dependencies are already included in `package.json`. No additional packages needed.

### Start Development Server

```bash
cd web
npm run dev
```

## 🏗️ Architecture Overview

### Components Structure

```
src/
├── types/auth.ts              # TypeScript interfaces for auth
├── lib/
│   ├── config.ts             # API endpoints and configuration
│   └── auth-service.ts       # Authentication service layer
├── hooks/
│   └── use-auth.tsx          # React context and hooks
├── components/
│   ├── user-nav.tsx          # User navigation with auth state
│   └── protected-route.tsx   # Protected route wrapper
└── pages/
    ├── login.tsx             # Login page
    └── auth-callback.tsx     # OAuth callback handler
```

### Key Features

- **React Context**: `AuthProvider` manages global auth state
- **Persistent Sessions**: Tokens stored in localStorage with automatic validation
- **Navbar Integration**: Seamless OAuth login/logout directly in the navigation bar
- **Discord Profile Pictures**: Automatic integration of Discord avatar URLs
- **Protected Routes**: `ProtectedRoute` component for auth-required pages
- **OAuth Flow**: Complete Discord OAuth implementation
- **Error Handling**: Graceful fallbacks and error states
- **TypeScript**: Full type safety throughout

## 🔄 OAuth Flow

### 1. User Initiates Login
- User clicks "Sign In" button in the navbar
- Redirects to dedicated login page with Discord OAuth

### 2. Discord Authorization
- User authorizes the application on Discord
- Discord redirects to `/auth/callback?code=...`

### 3. Token Exchange
- `AuthCallback` component processes the code
- Exchanges code for JWT token via backend API
- Stores token and user data in localStorage

### 4. Authenticated State
- `AuthProvider` validates stored token on app load
- User's Discord avatar appears in navbar
- User is automatically signed in on subsequent visits
- Token is included in all API requests

## 🎯 Usage Examples

### Protecting Routes

```typescript
import { ProtectedRoute } from '@/components/protected-route';

// Require authentication
<Route 
  path="/protected" 
  element={
    <ProtectedRoute>
      <MyProtectedComponent />
    </ProtectedRoute>
  } 
/>

// Allow both authenticated and unauthenticated access
<Route 
  path="/public" 
  element={
    <ProtectedRoute fallback={<PublicVersion />}>
      <AuthenticatedVersion />
    </ProtectedRoute>
  } 
/>
```

### Using Auth State

```typescript
import { useAuth } from '@/hooks/use-auth';

function MyComponent() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user.username}!</p>
          <img src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`} alt="Avatar" />
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={login}>Login with Discord</button>
      )}
    </div>
  );
}
```

### Making Authenticated API Calls

```typescript
import { authService } from '@/lib/auth-service';

// The service automatically includes the Bearer token
const protectedData = await authService.testProtectedEndpoint();
```

## 🔐 Security Features

- **Automatic Token Validation**: Tokens are verified on app startup
- **Secure Storage**: Uses localStorage with automatic cleanup on invalid tokens
- **Request Interception**: Auth service handles token injection and error responses
- **Route Protection**: Declarative protection with fallback options
- **Session Persistence**: Users stay logged in across browser sessions

## 🎨 UI Components

### UserNav Component (Main Integration Point)
- **Unauthenticated State**: Shows "Sign In" button in navbar
- **Authenticated State**: Displays user's Discord avatar (128px quality) in dropdown
- **Discord Profile Integration**: Automatically fetches and displays Discord profile pictures
- **Smart Fallbacks**: Shows user initials when avatar isn't available
- **Dropdown Menu**: Access to profile, settings, and logout
- **Loading States**: Spinner during authentication process
- **Responsive Design**: Works on desktop and mobile

### Login Page
- Beautiful two-column layout
- Discord branding and OAuth flow explanation
- Security feature highlights
- Mobile-responsive design

### Auth Callback
- Processes OAuth redirect
- Shows loading, success, and error states
- Automatic redirect after successful login
- Error handling with retry options

## 🖼️ Discord Avatar Integration

The UserNav component automatically handles Discord profile pictures:

```typescript
// High-quality Discord avatar URL (128px)
const avatarUrl = `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`;

// Smart fallback to user initials
const userInitials = user.global_name || user.username;
```

Features:
- **High Quality**: 128px Discord CDN images
- **Automatic Fallbacks**: User initials when no avatar
- **Global Name Support**: Uses Discord's new display names
- **Proper Sizing**: Optimized for navbar display

## 🚀 Pages and Routes

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/` | LandingPage | Public | Home page with OAuth-enabled navbar |
| `/login` | LoginPage | Public | Discord OAuth login |
| `/auth/callback` | AuthCallback | Public | OAuth redirect handler |
| `/search` | SearchResults | Public | Search functionality |
| `/item/:id` | ItemDetail | Public | Item details |

## 🔧 Configuration Options

### API Endpoints
Configure in `src/lib/config.ts`:
```typescript
export const API_ENDPOINTS = {
  AUTH_LOGIN: '/auth/login',
  AUTH_CALLBACK: '/auth/callback',
  AUTH_ME: '/auth/me',
  AUTH_LOGOUT: '/auth/logout',
  // ... more endpoints
};
```

### Storage Keys
Customize localStorage keys:
```typescript
export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'bitcraft_auth_token',
  USER_DATA: 'bitcraft_user_data',
};
```

### Avatar Configuration
Adjust Discord avatar quality in `user-nav.tsx`:
```typescript
// Available sizes: 16, 32, 64, 128, 256, 512, 1024, 2048, 4096
const avatarUrl = `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`;
```

## 🧪 Testing the Integration

### Quick Test Steps:
1. Start the development server: `npm run dev`
2. Visit `http://localhost:3000`
3. Look for "Sign In" button in top-right navbar
4. Click to go through Discord OAuth flow
5. Verify your Discord avatar appears in navbar
6. Test logout functionality from user dropdown

### What to Verify:
- ✅ Sign In button appears when unauthenticated
- ✅ Discord OAuth flow completes successfully
- ✅ User's Discord avatar appears in navbar (if they have one)
- ✅ User initials appear as fallback (if no avatar)
- ✅ User dropdown shows correct Discord username/global name
- ✅ Logout properly clears authentication state
- ✅ Authentication persists across browser refreshes

## 🚨 Production Considerations

1. **Environment Variables**: Set `VITE_API_BASE_URL` to your production API
2. **HTTPS**: Ensure OAuth redirects use HTTPS in production
3. **CDN**: Discord avatars are served from Discord's CDN (fast globally)
4. **Error Boundaries**: Add React error boundaries around auth components
5. **Analytics**: Track auth success/failure rates
6. **Performance**: Auth components are lightweight and optimized

## 🔍 Troubleshooting

### Common Issues

1. **Avatar Not Loading**: Check Discord user has an avatar set
2. **CORS Errors**: Check API CORS configuration matches frontend domain
3. **Token Expired**: Tokens expire after 24 hours, users need to re-login
4. **Callback Errors**: Verify Discord OAuth redirect URI matches exactly
5. **Build Errors**: Ensure all TypeScript types are properly imported

### Debug Mode

Enable console logging in `auth-service.ts` for detailed request/response logs during development.

## 📱 Mobile Responsiveness

The OAuth integration is fully responsive:
- Navbar adapts to mobile screens
- Login page works on all device sizes
- Discord avatars scale appropriately
- Touch-friendly dropdown menus 
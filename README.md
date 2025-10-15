# OIDC Sample Partner Application

## ⚠️ **THIS IS A DEMONSTRATION APPLICATION - NOT FOR PRODUCTION USE** ⚠️

**🚨 WARNING: This application is designed for educational and testing purposes only. It contains security configurations and practices that are NOT suitable for production environments. Do NOT deploy this to production systems.**

---

## Overview

This is a sample OpenID Connect (OIDC) application demonstrating the authorization code flow with PKCE (Proof Key for Code Exchange). The application consists of a React frontend client and an Express.js backend server that integrates with an OIDC provider.

## Architecture

```
├── client/          # React frontend application
└── server/          # Express.js backend server
```

### Client (Frontend)
- **Framework**: React with Vite
- **Purpose**: User interface for authentication flow
- **Port**: 5173 (default Vite dev server)

### Server (Backend)
- **Framework**: Express.js with Node.js
- **Purpose**: OIDC client implementation and token management
- **Port**: 3000 (configurable via PORT environment variable)

## Features

- ✅ OpenID Connect Authorization Code Flow
- ✅ PKCE (Proof Key for Code Exchange) implementation
- ✅ Token exchange and validation
- ✅ User profile fetching
- ✅ Session management (using global variables for demonstration)
- ✅ CORS configuration for cross-origin requests


## Environment Configuration

Create a `.env` file in the `server/` directory with the following variables:

```env
# OIDC Provider Configuration
OIDC_ISSUER_URL=https://api-gateway-staging.1001.tv/sso
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=https://<your-redirect-url>/api/callback

# Server Configuration
PORT=3000

# Frontend URL
FRONTEND_URL=http://localhost:5173
```


### 3. Configure Environment
- Copy the `.env` example above into `server/.env`
- Update the values with your OIDC details

### 4. Start the Applications

**Terminal 1 - Start the server:**
```bash
cd server
npm run start
```

**Terminal 2 - Start the client:**
```bash
cd client
npm run dev
```

## Usage Flow

1. **Access the Application**: Navigate to `http://localhost:5173`
2. **Initiate Login**: Click the login button to start the OIDC flow
3. **Authorization**: You'll be redirected to your OIDC provider for authentication
4. **Callback Processing**: After successful authentication, you'll be redirected back
5. **Token Exchange**: The server exchanges the authorization code for tokens
6. **Access Protected Resources**: Use the obtained tokens to access user information

## API Endpoints

### Server Endpoints

- `GET /api/login` - Initiates the OIDC authorization flow
- `GET /api/callback` - Handles the OIDC callback and token exchange
- `GET /api/auth-status` - Returns current authentication status
- `GET /api/user-profile` - Fetches user profile information
- `GET /api/logout` - Logs out the user and clears tokens

---

**Remember: This application is for demonstration only and should never be used in production environments without significant security enhancements.**
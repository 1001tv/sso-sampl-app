import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import * as oidc from 'openid-client';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));

app.set('trust proxy', 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    // cookie: { httpOnly: true, secure: true, sameSite: 'none' },
  })
);



let oidcConfig = null;

// Global storage for tokens and user info (replacing sessions)
let globalTokenSet = null;
let globalUserInfo = null;

const code_verifier = "123"
const code_challenge = await oidc.calculatePKCECodeChallenge(code_verifier);
// const state = oidc.randomState();
const state = "123";
// const nonce = oidc.randomNonce();
const nonce = "123";

try {
  console.log('Discovering OIDC provider...', "Secret", process.env.OIDC_CLIENT_SECRET);
  
  // Discover the OIDC issuer configuration using ClientSecretPost authentication
  oidcConfig = await oidc.discovery(
    new URL(process.env.OIDC_ISSUER_URL),
    process.env.OIDC_CLIENT_ID,
    undefined, // No client metadata object
    oidc.ClientSecretPost(process.env.OIDC_CLIENT_SECRET) // Use ClientSecretPost
  );
  
  console.log('OIDC client configured successfully.');
  console.log('Full OIDC config:', {
    issuer: oidcConfig.issuer,
    authorization_endpoint: oidcConfig.authorization_endpoint,
    token_endpoint: oidcConfig.token_endpoint,
    userinfo_endpoint: oidcConfig.userinfo_endpoint
  });
} catch (error) {
  console.error('Failed to discover OIDC provider or configure client:', error);
  process.exit(1);
}


app.get('/api/login', async (req, res) => {
  if (!oidcConfig) {
    return res.status(500).send('OIDC client not initialized.');
  }

  // Generate and store PKCE and state values (using global variables instead of session)
  // const code_verifier = oidc.randomPKCECodeVerifier();
  // const state = oidc.randomState();
  // const nonce = oidc.randomNonce();
  
  // Note: Using global variables - code_verifier, state, and nonce are already defined globally

  const parameters = {
    redirect_uri: process.env.OIDC_REDIRECT_URI,
    scope: 'openid profile',
    code_challenge,
    code_challenge_method: 'S256',
    state,
    nonce
  };

  const redirectTo = oidc.buildAuthorizationUrl(oidcConfig, parameters);
  console.log('Redirecting to:', redirectTo.href);
  res.redirect(redirectTo.href);
});



app.get('/api/callback', async (req, res) => {
  if (!oidcConfig) {
    return res.status(500).send('OIDC client not initialized.');
  }

  try {
    // const { code_verifier, state, nonce } = req.session;
    console.log("session:", code_verifier, state, nonce)

    // Construct the full callback URL from the request object.
    const currentUrl = new URL(
      req.originalUrl,
      `${req.protocol}://${req.get('host')}`
    );

    const checks = {
      expectedState: state,
      pkceCodeVerifier: code_verifier,
      expectedNonce: nonce
    };

    console.log('Making token request with:', {
      currentUrl: currentUrl.href,
      redirectUri: process.env.OIDC_REDIRECT_URI,
      code: req.query.code,
      state: req.query.state,
      expectedState: state
    });

    // Validate state first
    if (req.query.state !== state) {
      throw new Error('State mismatch');
    }

    // Let's try a more manual approach to see what's happening
    console.log('OIDC Config token endpoint:', oidcConfig.token_endpoint);
    console.log('Authorization code:', req.query.code);
    console.log('Code verifier:', code_verifier);
    
    // If token endpoint is undefined, use the known endpoint from your provider config
    const tokenEndpoint = oidcConfig.token_endpoint || 'https://api-gateway-staging.1001.tv/sso/oidc/token';
    console.log('Using token endpoint:', tokenEndpoint);
    
    // Use manual token exchange since the openid-client library has issues
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: process.env.OIDC_REDIRECT_URI,
      client_id: process.env.OIDC_CLIENT_ID,
      client_secret: process.env.OIDC_CLIENT_SECRET,
      code_verifier: code_verifier
    });
    
    console.log('Manual token request params:', Object.fromEntries(tokenParams));
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token request failed:', response.status, errorText);
      throw new Error(`Token request failed: ${response.status} ${errorText}`);
    }
    
    const tokenResponse = await response.json();
    console.log('Token exchange successful:', tokenResponse);
    
    // Create a tokenSet object compatible with the rest of the code
    const tokenSet = {
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type,
      expires_in: tokenResponse.expires_in,
      refresh_token: tokenResponse.refresh_token,
      id_token: tokenResponse.id_token
    };
    
    // Decode the ID token to get claims (simple JWT decode for the payload)
    const idTokenParts = tokenResponse.id_token.split('.');
    const claims = JSON.parse(Buffer.from(idTokenParts[1], 'base64url').toString());
    console.log('ID Token claims:', claims);

    console.log('Received and validated tokens:', tokenSet);

    // Store tokens and user info in global variables instead of session
    globalTokenSet = tokenSet;
    globalUserInfo = claims;

    res.redirect('http://localhost:5173');
  } catch (error) {
    console.error('Error in OIDC callback:', error);
    res.status(400).send('Authentication failed.');
  }
});


app.get('/api/auth-status', (req, res) => {
  if (globalTokenSet) {
    res.json({ isAuthenticated: true, user: globalUserInfo });
  } else {
    res.json({ isAuthenticated: false, user: null });
  }
});

app.get('/api/user-profile', async (req, res) => {
  if (!globalTokenSet) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const userInfo = await oidc.fetchUserInfo(oidcConfig, globalTokenSet.access_token, globalUserInfo.sub);
    console.log('Fetched user info:', userInfo);
    res.json(userInfo);
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

app.get('/api/logout', (req, res) => {
  // Clear global variables instead of destroying session
  globalTokenSet = null;
  globalUserInfo = null;
  
  console.log('User logged out - cleared global tokens');
  res.redirect('http://localhost:5173');
});

app.listen(port, () => {
  console.log(`Sample backend server listening at http://localhost:${port}`);
});
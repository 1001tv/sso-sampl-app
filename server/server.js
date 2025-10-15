import 'dotenv/config';

import express from 'express';

import * as oidc from 'openid-client';

import cors from 'cors';



const app = express();

const port = process.env.PORT || 3000;



app.use(cors({

  origin: true,

  credentials: true,

}));



// Add logging middleware to see all requests

app.use((req, res, next) => {

  console.log(`${new Date().toISOString()} ${req.method} ${req.path} - ${req.get('Origin') || 'no origin'}`);

  next();

});



const code_verifier = '123';

const code_challenge = await oidc.calculatePKCECodeChallenge(code_verifier);

const state = '123';

const nonce = '123';



let globalTokenSet = null;

let globalUserInfo = null;

let oidcConfig = null;



try {

  console.log('Discovering OIDC provider...', "Secret", process.env.OIDC_CLIENT_SECRET);

  oidcConfig = await oidc.discovery(

    new URL(process.env.OIDC_ISSUER_URL),

    process.env.OIDC_CLIENT_ID,

    undefined,

    oidc.ClientSecretPost(process.env.OIDC_CLIENT_SECRET),

    // { execute: [oidc.allowInsecureRequests] }

  );



  console.log('OIDC client configured successfully.');

} catch (error) {

  console.error('Failed to discover OIDC provider or configure client:', error);

  process.exit(1);

}





app.get('/api/login', async (req, res) => {

  if (!oidcConfig) {

    return res.status(500).send('OIDC client not initialized.');

  }



  // Generate and store PKCE and state values in the session

  // const code_verifier = oidc.randomPKCECodeVerifier();

  // const code_challenge = await oidc.calculatePKCECodeChallenge(code_verifier);

  // const state = oidc.randomState();

  // const nonce = oidc.randomNonce();



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



    const tokenSet = await oidc.authorizationCodeGrant(

      oidcConfig,

      currentUrl,

      checks

    );



    console.log('Received and validated tokens:', tokenSet);



    const claims = tokenSet.claims();

    console.log('Received claims:', claims);



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

  globalTokenSet = null;
  globalUserInfo = null;

  res.redirect('http://localhost:5173');


});



app.listen(port, () => {

  console.log(`Sample backend server listening at http://localhost:${port}`);

});
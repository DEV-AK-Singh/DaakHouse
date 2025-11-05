import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Enhanced OAuth initiation with proper parameters
router.get('/login', (req, res) => {
  const authUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  
  const params = {
    client_id: process.env.CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.REDIRECT_URI,
    scope: 'openid profile email offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send',
    response_mode: 'query',
    prompt: 'consent', // Force consent screen to ensure permissions are granted
    state: 'email_client_app' // Optional: add state for security
  };

  const url = `${authUrl}?${new URLSearchParams(params)}`;
  console.log('OAuth URL:', url);
  res.redirect(url);
});

// Enhanced OAuth callback with comprehensive error handling
router.get('/callback', async (req, res) => {
  try {
    const { code, error, error_description, state } = req.query;

    console.log('OAuth callback received:', { code: code ? '✓' : '✗', error, state });

    if (error) {
      console.error('OAuth provider error:', error, error_description);
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(
          error_description || `OAuth error: ${error}`
        )}`
      );
    }

    if (!code) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(
          'No authorization code received from Microsoft'
        )}`
      );
    }

    console.log('Exchanging authorization code for tokens...');

    // Step 1: Exchange code for tokens with enhanced error handling
    let tokenResponse;
    try {
      tokenResponse = await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          code: code,
          redirect_uri: process.env.REDIRECT_URI,
          grant_type: 'authorization_code',
          scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError.response?.data || tokenError.message);
      throw new Error(`Token exchange failed: ${tokenError.response?.data?.error_description || tokenError.message}`);
    }

    const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;
    
    if (!access_token) {
      throw new Error('No access token received from Microsoft');
    }

    console.log('✓ Tokens received successfully');
    console.log('Scopes granted:', scope);

    // Step 2: Get user profile with retry logic
    let profileResponse;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        console.log(`Attempting to fetch user profile (attempt ${retryCount + 1})...`);
        
        profileResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Email-Client-App/1.0'
          },
          timeout: 10000
        });

        console.log('✓ User profile fetched successfully');
        break; // Success, break out of retry loop

      } catch (profileError) {
        retryCount++;
        
        if (retryCount > maxRetries) {
          console.error('All profile fetch attempts failed:', profileError.response?.data || profileError.message);
          
          // Even if profile fetch fails, we can still create a user with the token
          // but we need some basic user info
          const fallbackUser = await createUserWithFallbackInfo(access_token, refresh_token, expires_in);
          const appToken = generateAppToken(fallbackUser);
          return res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${appToken}`);
        }

        console.log(`Profile fetch failed, retrying... (${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
      }
    }

    const userData = profileResponse.data;
    console.log('User data received:', {
      displayName: userData.displayName,
      email: userData.mail || userData.userPrincipalName,
      id: userData.id
    });

    // Step 3: Save user to database
    const userEmail = userData.mail || userData.userPrincipalName;
    
    if (!userEmail) {
      throw new Error('Could not determine user email from Microsoft Graph response');
    }

    let user = await User.findOne({ email: userEmail });
    
    if (user) {
      user.accessToken = access_token;
      user.refreshToken = refresh_token;
      user.expiresAt = new Date(Date.now() + expires_in * 1000);
      user.displayName = userData.displayName || user.displayName;
      user.lastLogin = new Date();
    } else {
      user = new User({
        email: userEmail,
        displayName: userData.displayName || 'User',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        lastLogin: new Date()
      });
    }

    await user.save();
    console.log('✓ User saved to database:', userEmail);

    // Step 4: Generate app token and redirect
    const appToken = generateAppToken(user);
    
    console.log('✓ Authentication completed successfully, redirecting to frontend...');
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${appToken}`);
    
  } catch (error) {
    console.error('❌ Auth callback error:', error.message);
    console.error('Full error details:', error);
    
    const errorMessage = encodeURIComponent(
      error.message || 'Authentication failed due to unknown error'
    );
    
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${errorMessage}`);
  }
});

// Helper function to create user when profile fetch fails
async function createUserWithFallbackInfo(accessToken, refreshToken, expiresIn) {
  const tempEmail = `user_${Date.now()}@temporary.com`;
  
  const user = new User({
    email: tempEmail,
    displayName: 'User',
    accessToken: accessToken,
    refreshToken: refreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    lastLogin: new Date(),
    isTemporary: true
  });

  await user.save();
  console.log('Created temporary user due to profile fetch failure');
  return user;
}

// Helper function to generate app JWT
function generateAppToken(user) {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email,
      displayName: user.displayName,
      isTemporary: user.isTemporary || false
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Test endpoint to verify Microsoft Graph access
router.get('/test-graph', async (req, res) => {
  try {
    const { access_token } = req.query;
    
    if (!access_token) {
      return res.status(400).json({ error: 'Access token required' });
    }

    console.log('Testing Graph API with token...');

    // Test 1: Basic profile access
    const profileTest = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    // Test 2: Mail permissions (if available)
    let mailTest = { success: false, error: null };
    try {
      await axios.get('https://graph.microsoft.com/v1.0/me/mailFolders', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      mailTest.success = true;
    } catch (mailError) {
      mailTest.error = mailError.response?.data || mailError.message;
    }

    res.json({
      success: true,
      tests: {
        profile: {
          success: true,
          user: profileTest.data.displayName,
          email: profileTest.data.mail || profileTest.data.userPrincipalName
        },
        mail: mailTest
      },
      tokenInfo: {
        // Don't log full token for security
        length: access_token.length,
        first10: access_token.substring(0, 10) + '...'
      }
    });

  } catch (error) {
    console.error('Graph test failed:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
      details: 'Microsoft Graph API access test failed'
    });
  }
});

export default router;
import express from 'express';
import axios from 'axios';

const router = express.Router();

// Comprehensive environment check
router.get('/check', (req, res) => {
  const config = {
    clientId: {
      value: process.env.CLIENT_ID ? '✓ Set' : '✗ Missing',
      length: process.env.CLIENT_ID?.length || 0,
      valid: process.env.CLIENT_ID?.length === 36 // UUID length
    },
    clientSecret: {
      value: process.env.CLIENT_SECRET ? '✓ Set' : '✗ Missing',
      length: process.env.CLIENT_SECRET?.length || 0,
      valid: process.env.CLIENT_SECRET?.length > 10
    },
    redirectUri: {
      value: process.env.REDIRECT_URI || '✗ Missing',
      valid: process.env.REDIRECT_URI?.startsWith('http')
    },
    jwtSecret: {
      value: process.env.JWT_SECRET ? '✓ Set' : '✗ Missing',
      valid: process.env.JWT_SECRET?.length > 10
    },
    frontendUrl: {
      value: process.env.FRONTEND_URL || '✗ Missing',
      valid: process.env.FRONTEND_URL?.startsWith('http')
    }
  };

  const allValid = Object.values(config).every(item => item.valid);
  
  res.json({
    status: allValid ? '✓ Configuration valid' : '✗ Configuration issues',
    config,
    troubleshooting: [
      '1. Ensure CLIENT_ID is a valid Azure App Registration ID (36 char UUID)',
      '2. Ensure CLIENT_SECRET is current (they expire)',
      '3. Check redirect URI matches exactly in Azure Portal',
      '4. Verify app allows personal Microsoft accounts',
      '5. Check API permissions are granted (Mail.Read, Mail.ReadWrite, Mail.Send)'
    ]
  });
});

// Test Microsoft Graph API directly
router.get('/test-microsoft', async (req, res) => {
  try {
    // This tests if we can reach Microsoft endpoints
    const response = await axios.get('https://graph.microsoft.com/v1.0/', {
      timeout: 5000
    });

    res.json({
      microsoftGraph: '✓ Reachable',
      version: response.data,
      status: 'Microsoft Graph API is accessible'
    });
  } catch (error) {
    res.json({
      microsoftGraph: '✗ Unreachable',
      error: error.message,
      status: 'Cannot reach Microsoft Graph API - check network/firewall'
    });
  }
});

export default router;
const axios = require('axios');

const API_BASE = 'http://localhost:8080/api/1.0';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2ODFjZTdlMWM0MjIyZWI2OWNhNTU0MDYiLCJlbWFpbCI6Im11ZGl0Z2FtYmhpcjc5M0BnbWFpbC5jb20iLCJhY2NvdW50VHlwZSI6IlVTRVIiLCJpYXQiOjE3MzM5MjU1NjIsImV4cCI6MTczNDUzMDM2Mn0.Ej5Ej5Ej5Ej5Ej5Ej5Ej5Ej5Ej5Ej5Ej5Ej5Ej5Ej5';

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

async function checkToken() {
  console.log('🔐 Checking JWT Token Validity');
  console.log('=' .repeat(40));
  
  try {
    // Try to access a protected endpoint
    const response = await axios.get(`${API_BASE}/buddy-coins`, { headers });
    console.log('✅ Token is valid');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Token validation failed');
    console.log('📊 Error details:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.message || error.message);
    console.log('   Full response:', JSON.stringify(error.response?.data, null, 2));
    
    // Decode the token to check expiration
    try {
      const tokenParts = JWT_TOKEN.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('\n🕒 Token payload:');
      console.log('   User ID:', payload._id);
      console.log('   Email:', payload.email);
      console.log('   Account Type:', payload.accountType);
      console.log('   Issued at:', new Date(payload.iat * 1000).toISOString());
      console.log('   Expires at:', new Date(payload.exp * 1000).toISOString());
      console.log('   Current time:', new Date().toISOString());
      console.log('   Is expired:', Date.now() > payload.exp * 1000);
    } catch (decodeError) {
      console.log('❌ Could not decode token:', decodeError.message);
    }
  }
}

checkToken();
const axios = require('axios');
const config = require('config');

async function getUserToken() {
  try {
    console.log('🔑 Getting User JWT Token');
    console.log('========================================');
    
    const loginData = {
      mobileOrEmail: 'testuser@example.com',
      password: 'password123'
    };
    
    console.log('🔐 Attempting user login...');
    const response = await axios.put('http://localhost:8080/api/1.0/sign-in', loginData);
    
    if (response.data && response.data.data && response.data.data.token) {
      console.log('✅ Login successful!');
      console.log('🎫 User JWT Token:', response.data.data.token);
      
      // Decode the token to see its structure
      const tokenParts = response.data.data.token.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('📋 Token payload:', JSON.stringify(payload, null, 2));
      
      console.log('\n🎯 Copy this token for testing:');
      console.log(response.data.data.token);
      
      return response.data.data.token;
    } else {
      console.log('❌ Login failed - no token received');
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
  }
}

getUserToken();
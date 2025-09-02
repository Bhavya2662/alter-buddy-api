const axios = require('axios');

async function getMentorToken() {
  try {
    console.log('🔑 Getting Mentor JWT Token');
    console.log('========================================');
    
    const loginData = {
      username: 'testmentor',
      password: 'password123'
    };
    
    console.log('🔐 Attempting mentor login...');
    const response = await axios.put('http://localhost:8080/api/1.0/mentor/sign-in', loginData);
    
    if (response.data && response.data.data && response.data.data.token) {
      console.log('✅ Login successful!');
      console.log('🎫 Mentor JWT Token:', response.data.data.token);
      
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

getMentorToken();
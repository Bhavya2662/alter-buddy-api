const axios = require('axios');

const API_BASE = 'http://localhost:8080/api/1.0';

async function getFreshToken() {
  console.log('🔑 Getting Fresh JWT Token');
  console.log('=' .repeat(40));
  
  try {
    // Try to login with test user credentials
    const loginPayload = {
      mobileOrEmail: 'testuser@example.com',
      password: 'password123' // Common test password
    };
    
    console.log('🔐 Attempting login...');
    const response = await axios.put(`${API_BASE}/sign-in`, loginPayload);
    
    if (response.data.success && response.data.data.token) {
      const token = response.data.data.token;
      console.log('✅ Login successful!');
      console.log('🎫 New JWT Token:', token);
      
      // Test the token by fetching wallet balance
      try {
        const walletResponse = await axios.get(`${API_BASE}/buddy-coins`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('👤 User Info:');
        if (walletResponse.data && walletResponse.data.data) {
          console.log('   Balance:', walletResponse.data.data.balance);
          console.log('   User ID:', walletResponse.data.data.userId);
        } else {
          console.log('   Wallet data:', walletResponse.data);
        }
        
        // Save token to file for other scripts
        require('fs').writeFileSync('token.txt', token);
        console.log('💾 Token saved to token.txt');
        
        return token;
        
      } catch (walletError) {
        console.log('❌ Wallet fetch error:');
        console.log('   Status:', walletError.response?.status);
        console.log('   Message:', walletError.response?.data?.message || walletError.message);
        
        // Still save the token even if wallet fetch fails
        require('fs').writeFileSync('token.txt', token);
        console.log('💾 Token saved to token.txt (despite wallet error)');
        return token;
      }
    } else {
      console.log('❌ Login failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Login error:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.message || error.message);
    
    // Try with different password
    if (error.response?.status === 401) {
      console.log('\n🔄 Trying with different password...');
      try {
        const altLoginPayload = {
          mobileOrEmail: 'testuser@example.com',
          password: '123456'
        };
        
        const altResponse = await axios.put(`${API_BASE}/sign-in`, altLoginPayload);
        
        if (altResponse.data.success && altResponse.data.data.token) {
          console.log('✅ Login successful with alternative password!');
          console.log('🎫 New JWT Token:', altResponse.data.data.token);
          return altResponse.data.data.token;
        }
      } catch (altError) {
        console.log('❌ Alternative login also failed');
      }
    }
    
    return null;
  }
}

getFreshToken()
  .then(token => {
    if (token) {
      console.log('\n🎯 Copy this token for testing:');
      console.log(token);
    } else {
      console.log('\n❌ Could not obtain a valid token');
    }
  })
  .catch(error => {
    console.error('❌ Script execution failed:', error.message);
  });
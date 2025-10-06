const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:8080';

async function testUserLogin() {
  console.log('🧪 Testing User Login after verification...');
  console.log('Base URL:', BASE_URL);
  console.log('==================================================');
  
  const userCredentials = [
  { mobileOrEmail: 'kg224245@gmail.com', password: 'password123' },
  { mobileOrEmail: '9691145994', password: 'password123' },
  { mobileOrEmail: 'abc@gmail.com', password: 'password123' },
  { mobileOrEmail: '1234567890', password: 'password123' }
];
  
  for (const cred of userCredentials) {
    try {
      console.log(`\n🔐 Trying to login with: ${cred.mobileOrEmail}`);
      const response = await axios.put(`${BASE_URL}/api/1.0/sign-in`, cred);
      
      console.log('✅ Login Success!');
      console.log('Status:', response.status);
      console.log('Full response:', JSON.stringify(response.data, null, 2));
      
      const token = response.data.data?.token || response.data.token;
      const user = response.data.data?.user || response.data.user || response.data.data;
      const userId = user?._id;
      
      console.log('Token:', token ? token.substring(0, 20) + '...' : 'No token');
      console.log('User ID:', userId);
      console.log('Email:', user?.email);
      console.log('Mobile:', user?.mobile);
      console.log('Verified:', user?.isVerified);
      
      // Test getting user packages with this token
      console.log('\n📋 Testing Get User Packages with this token...');
      try {
        const packagesResponse = await axios.get(`${BASE_URL}/api/1.0/session/package/${response.data.data.user._id}`, {
          headers: { Authorization: `Bearer ${response.data.data.token}` },
          timeout: 10000
        });
        
        console.log('✅ Get User Packages Success!');
        console.log('Packages found:', packagesResponse.data.data.length);
        
        if (packagesResponse.data.data.length > 0) {
          const pkg = packagesResponse.data.data[0];
          console.log('Sample package:', {
            id: pkg._id,
            type: pkg.type,
            totalSessions: pkg.totalSessions,
            remainingSessions: pkg.remainingSessions,
            price: pkg.price,
            status: pkg.status
          });
        }
        
      } catch (error) {
        console.log('❌ Get User Packages Failed:', error.response?.status);
        console.log('Error:', error.response?.data);
      }
      
      break; // Stop after first successful login
      
    } catch (error) {
      console.log(`❌ Login failed for ${cred.mobileOrEmail}:`, error.response?.data?.message || error.message);
    }
  }
}

testUserLogin().catch(console.error);
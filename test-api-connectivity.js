const axios = require('axios');

// Test basic API connectivity
async function testAPIConnectivity() {
  console.log('Testing API connectivity...');
  
  try {
    // Test basic connection
    console.log('\n1. Testing basic connection to API server...');
    const response = await axios.get('http://localhost:8080/api/1.0/category');
    console.log('✅ API server is responding');
    console.log('Status:', response.status);
    console.log('Data length:', JSON.stringify(response.data).length);
    
  } catch (error) {
    console.error('❌ API connectivity test failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
  }
  
  try {
    // Test login with known credentials
    console.log('\n2. Testing login with known credentials...');
    const loginResponse = await axios.put('http://localhost:8080/api/1.0/sign-in', {
      mobileOrEmail: 'testuser@example.com',
      password: 'password123'
    });
    console.log('✅ Login successful');
    console.log('Status:', loginResponse.status);
    console.log('Has token:', !!loginResponse.data.data?.token);
    
  } catch (error) {
    console.error('❌ Login test failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
  }
}

testAPIConnectivity().catch(console.error);
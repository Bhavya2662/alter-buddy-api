const axios = require('axios');

async function testPackagesAPI() {
  try {
    console.log('🔍 Testing packages API...');
    
    const mentorId = '68a37ad37de01f8431c91ee3';
    const url = `http://localhost:8080/api/1.0/packages/mentor/${mentorId}`;
    
    console.log('📡 Making request to:', url);
    
    const response = await axios.get(url);
    
    console.log('✅ Response status:', response.status);
    console.log('📦 Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
  }
}

testPackagesAPI();
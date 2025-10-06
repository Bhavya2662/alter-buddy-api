const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';

async function testLogin() {
  const results = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    tests: []
  };

  console.log('🧪 Testing Login with Existing Accounts...');
  console.log('Base URL:', BASE_URL);
  console.log('=' .repeat(50));

  // Test 1: Server Health Check
  try {
    console.log('\n1. 🏥 Testing Server Health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/1.0/admin/test`, { timeout: 5000 });
    console.log('✅ Server Health:', healthResponse.status, healthResponse.statusText);
    results.tests.push({
      test: 'Server Health',
      status: 'PASS',
      statusCode: healthResponse.status,
      response: healthResponse.data
    });
  } catch (error) {
    console.log('❌ Server Health Failed:', error.message);
    results.tests.push({
      test: 'Server Health',
      status: 'FAIL',
      error: error.message,
      statusCode: error.response?.status
    });
  }

  // Test 2: User Login (using existing user)
  try {
    console.log('\n2. 👤 Testing User Login...');
    const userLoginData = {
      mobileOrEmail: 'kg224245@gmail.com',
      password: 'password123'
    };
    
    console.log('Attempting login with:', userLoginData.mobileOrEmail);
    const userResponse = await axios.put(`${BASE_URL}/api/1.0/sign-in`, userLoginData, { timeout: 10000 });
    console.log('✅ User Login Success:', userResponse.status);
    console.log('Response:', userResponse.data);
    
    results.tests.push({
      test: 'User Login',
      status: 'PASS',
      statusCode: userResponse.status,
      credentials: userLoginData.mobileOrEmail,
      response: userResponse.data
    });
  } catch (error) {
    console.log('❌ User Login Failed:', error.response?.status, error.response?.data || error.message);
    results.tests.push({
      test: 'User Login',
      status: 'FAIL',
      statusCode: error.response?.status,
      credentials: 'kg224245@gmail.com',
      error: error.response?.data || error.message
    });
  }

  // Test 3: Admin Login (using existing admin)
  try {
    console.log('\n3. 👑 Testing Admin Login...');
    const adminLoginData = {
      email: 'admin@alterbuddy.com',
      password: 'admin123'
    };
    
    console.log('Attempting admin login with:', adminLoginData.email);
    const adminResponse = await axios.put(`${BASE_URL}/api/1.0/admin/sign-in`, adminLoginData, { timeout: 10000 });
    console.log('✅ Admin Login Success:', adminResponse.status);
    console.log('Response:', adminResponse.data);
    
    results.tests.push({
      test: 'Admin Login',
      status: 'PASS',
      statusCode: adminResponse.status,
      credentials: adminLoginData.email,
      response: adminResponse.data
    });
  } catch (error) {
    console.log('❌ Admin Login Failed:', error.response?.status, error.response?.data || error.message);
    results.tests.push({
      test: 'Admin Login',
      status: 'FAIL',
      statusCode: error.response?.status,
      credentials: 'admin@alterbuddy.com',
      error: error.response?.data || error.message
    });
  }

  // Test 4: Mentor Login (using existing mentor)
  try {
    console.log('\n4. 🧠 Testing Mentor Login...');
    const mentorLoginData = {
      username: 'Sachishah',
      password: 'password123'
    };
    
    console.log('Attempting mentor login with:', mentorLoginData.username);
    const mentorResponse = await axios.put(`${BASE_URL}/api/1.0/mentor/sign-in`, mentorLoginData, { timeout: 10000 });
    console.log('✅ Mentor Login Success:', mentorResponse.status);
    console.log('Response:', mentorResponse.data);
    
    results.tests.push({
      test: 'Mentor Login',
      status: 'PASS',
      statusCode: mentorResponse.status,
      credentials: mentorLoginData.username,
      response: mentorResponse.data
    });
  } catch (error) {
    console.log('❌ Mentor Login Failed:', error.response?.status, error.response?.data || error.message);
    results.tests.push({
      test: 'Mentor Login',
      status: 'FAIL',
      statusCode: error.response?.status,
      credentials: 'Sachishah',
      error: error.response?.data || error.message
    });
  }

  // Test 5: Try alternative admin account
  try {
    console.log('\n5. 👑 Testing Alternative Admin Login...');
    const altAdminLoginData = {
      email: 'testadmin@alterbuddy.com',
      password: 'admin123'
    };
    
    console.log('Attempting admin login with:', altAdminLoginData.email);
    const altAdminResponse = await axios.put(`${BASE_URL}/api/1.0/admin/sign-in`, altAdminLoginData, { timeout: 10000 });
    console.log('✅ Alternative Admin Login Success:', altAdminResponse.status);
    console.log('Response:', altAdminResponse.data);
    
    results.tests.push({
      test: 'Alternative Admin Login',
      status: 'PASS',
      statusCode: altAdminResponse.status,
      credentials: altAdminLoginData.email,
      response: altAdminResponse.data
    });
  } catch (error) {
    console.log('❌ Alternative Admin Login Failed:', error.response?.status, error.response?.data || error.message);
    results.tests.push({
      test: 'Alternative Admin Login',
      status: 'FAIL',
      statusCode: error.response?.status,
      credentials: 'testadmin@alterbuddy.com',
      error: error.response?.data || error.message
    });
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passedTests = results.tests.filter(t => t.status === 'PASS').length;
  const totalTests = results.tests.length;
  
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  results.tests.forEach((test, index) => {
    const status = test.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${test.test}: ${test.status}`);
  });

  // Save results
  const filename = 'existing-accounts-login-test-results.json';
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: ${filename}`);
  
  return results;
}

testLogin().catch(console.error);
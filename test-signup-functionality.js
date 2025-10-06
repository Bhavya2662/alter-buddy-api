const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';

async function testSignup() {
  const results = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    tests: []
  };

  console.log('🧪 Testing User Signup Functionality...');
  console.log('Base URL:', BASE_URL);
  console.log('==================================================');

  // Test 1: User Signup
  console.log('\n1. 👤 Testing User Signup...');
  try {
    const signupData = {
      name: 'Test User ' + Date.now(),
      email: `testuser${Date.now()}@example.com`,
      mobile: `9${Math.floor(Math.random() * 1000000000)}`,
      password: 'TestPassword123!',
      acType: 'user'
    };
    
    console.log('Attempting signup with:', {
      name: signupData.name,
      email: signupData.email,
      mobile: signupData.mobile
    });
    
    const signupResponse = await axios.post(`${BASE_URL}/api/1.0/sign-up`, signupData, { timeout: 10000 });
    console.log('✅ User Signup Success:', signupResponse.status);
    console.log('Response:', signupResponse.data);
    
    results.tests.push({
      name: 'User Signup',
      status: 'success',
      statusCode: signupResponse.status,
      data: signupResponse.data,
      testData: {
        name: signupData.name,
        email: signupData.email,
        mobile: signupData.mobile
      }
    });
  } catch (error) {
    console.log('❌ User Signup Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'User Signup',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }

  // Test 2: Duplicate Email Signup (should fail)
  console.log('\n2. 🔄 Testing Duplicate Email Signup...');
  try {
    const duplicateSignupData = {
      name: 'Another Test User',
      email: 'kg224245@gmail.com', // Using existing email
      mobile: `9${Math.floor(Math.random() * 1000000000)}`,
      password: 'TestPassword123!',
      acType: 'user'
    };
    
    console.log('Attempting signup with existing email:', duplicateSignupData.email);
    
    const duplicateResponse = await axios.post(`${BASE_URL}/api/1.0/sign-up`, duplicateSignupData, { timeout: 10000 });
    console.log('❌ Duplicate Email Signup Should Have Failed:', duplicateResponse.status);
    console.log('Response:', duplicateResponse.data);
    
    results.tests.push({
      name: 'Duplicate Email Signup',
      status: 'unexpected_success',
      statusCode: duplicateResponse.status,
      data: duplicateResponse.data,
      note: 'This should have failed but succeeded'
    });
  } catch (error) {
    console.log('✅ Duplicate Email Signup Correctly Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Duplicate Email Signup',
      status: 'correctly_failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }

  // Test 3: Invalid Email Format
  console.log('\n3. 📧 Testing Invalid Email Format...');
  try {
    const invalidEmailData = {
      name: 'Test User Invalid Email',
      email: 'invalid-email-format',
      mobile: `9${Math.floor(Math.random() * 1000000000)}`,
      password: 'TestPassword123!',
      acType: 'user'
    };
    
    console.log('Attempting signup with invalid email:', invalidEmailData.email);
    
    const invalidEmailResponse = await axios.post(`${BASE_URL}/api/1.0/sign-up`, invalidEmailData, { timeout: 10000 });
    console.log('❌ Invalid Email Signup Should Have Failed:', invalidEmailResponse.status);
    console.log('Response:', invalidEmailResponse.data);
    
    results.tests.push({
      name: 'Invalid Email Format',
      status: 'unexpected_success',
      statusCode: invalidEmailResponse.status,
      data: invalidEmailResponse.data,
      note: 'This should have failed but succeeded'
    });
  } catch (error) {
    console.log('✅ Invalid Email Signup Correctly Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Invalid Email Format',
      status: 'correctly_failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }

  // Test 4: Missing Required Fields
  console.log('\n4. ❌ Testing Missing Required Fields...');
  try {
    const incompleteData = {
      name: 'Test User Incomplete',
      // Missing email, mobile, password
      acType: 'user'
    };
    
    console.log('Attempting signup with incomplete data');
    
    const incompleteResponse = await axios.post(`${BASE_URL}/api/1.0/sign-up`, incompleteData, { timeout: 10000 });
    console.log('❌ Incomplete Data Signup Should Have Failed:', incompleteResponse.status);
    console.log('Response:', incompleteResponse.data);
    
    results.tests.push({
      name: 'Missing Required Fields',
      status: 'unexpected_success',
      statusCode: incompleteResponse.status,
      data: incompleteResponse.data,
      note: 'This should have failed but succeeded'
    });
  } catch (error) {
    console.log('✅ Incomplete Data Signup Correctly Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Missing Required Fields',
      status: 'correctly_failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }

  // Summary
  console.log('\n==================================================');
  console.log('📊 TEST SUMMARY');
  console.log('==================================================');
  
  const passed = results.tests.filter(t => t.status === 'success' || t.status === 'correctly_failed').length;
  const failed = results.tests.filter(t => t.status === 'failed' || t.status === 'unexpected_success').length;
  
  console.log(`✅ Passed: ${passed}/${results.tests.length}`);
  console.log(`❌ Failed: ${failed}/${results.tests.length}`);
  
  results.tests.forEach((test, index) => {
    const status = (test.status === 'success' || test.status === 'correctly_failed') ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${test.name}: ${test.status.toUpperCase()}`);
  });

  // Save results
  const filename = 'signup-test-results.json';
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: ${filename}`);
}

// Run the test
testSignup().catch(console.error);
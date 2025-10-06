const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';

// Test results tracking
const testResults = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

function addTestResult(testName, status, details = {}) {
  const result = {
    test: testName,
    status,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  testResults.tests.push(result);
  testResults.summary.total++;
  
  if (status === 'PASS') {
    testResults.summary.passed++;
    console.log(`✅ ${testName}: SUCCESS`);
  } else if (status === 'FAIL') {
    testResults.summary.failed++;
    console.log(`❌ ${testName}: FAILED`);
    if (details.error) console.log(`   Error: ${details.error}`);
  } else if (status === 'SKIP') {
    testResults.summary.skipped++;
    console.log(`⚠️ ${testName}: SKIPPED`);
    if (details.reason) console.log(`   Reason: ${details.reason}`);
  }
}

// Global variables for test data
let userToken = null;
let adminToken = null;
let userId = null;
let sessionId = null;
let roomId = null;

async function getAuthTokens() {
  console.log('1. 🔐 Getting Authentication Tokens...');
  
  try {
    // Get admin token
    const adminResponse = await axios.post(`${BASE_URL}/api/1.0/admin/login`, {
      email: 'admin@gmail.com',
      password: 'admin123'
    });
    
    if (adminResponse.data.success) {
      adminToken = adminResponse.data.data.token;
      console.log('✅ Admin token obtained');
    }
  } catch (error) {
    console.log('⚠️ Admin login failed:', error.response?.data?.message);
  }
  
  // Try to get user token
  const userCredentials = [
    { mobileOrEmail: 'kg224245@gmail.com', password: 'password123' },
    { mobileOrEmail: 'abc@gmail.com', password: 'password123' },
    { mobileOrEmail: '9691145994', password: 'password123' }
  ];
  
  for (const cred of userCredentials) {
    try {
      const userResponse = await axios.put(`${BASE_URL}/api/1.0/sign-in`, {
        mobileOrEmail: cred.mobileOrEmail,
        password: cred.password
      });
      
      if (userResponse.data.data && userResponse.data.data.token) {
        userToken = userResponse.data.data.token;
        // Decode JWT to get user ID
        const tokenPayload = JSON.parse(Buffer.from(userToken.split('.')[1], 'base64').toString());
        userId = tokenPayload.id;
        console.log(`✅ User token obtained for ${cred.mobileOrEmail}`);
        console.log(`User ID from token: ${userId}`);
        break;
      }
    } catch (error) {
      console.log(`⚠️ User login failed for ${cred.mobileOrEmail}:`, error.response?.data?.message);
    }
  }
}

async function testGetAblyToken() {
  console.log('\n2. 🔗 Testing Get Ably Token...');
  
  if (!userToken) {
    addTestResult('Get Ably Token', 'SKIP', { reason: 'No user token available' });
    return;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/1.0/rant/ably/token`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    if (response.status === 200 && response.data.success) {
      addTestResult('Get Ably Token', 'PASS', {
        statusCode: response.status,
        hasToken: !!response.data.data
      });
      console.log('Ably token obtained successfully');
    } else {
      addTestResult('Get Ably Token', 'FAIL', {
        statusCode: response.status,
        error: 'Invalid response format'
      });
    }
  } catch (error) {
    addTestResult('Get Ably Token', 'FAIL', {
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message
    });
  }
}

async function testGetStreamToken() {
  console.log('\n3. 📺 Testing Get Stream Token...');
  
  if (!userToken) {
    addTestResult('Get Stream Token', 'SKIP', { reason: 'No user token available' });
    return;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/1.0/rant/get-stream/token`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    if (response.status === 200 && response.data.success) {
      addTestResult('Get Stream Token', 'PASS', {
        statusCode: response.status,
        hasToken: !!response.data.data
      });
      console.log('Stream token obtained successfully');
    } else {
      addTestResult('Get Stream Token', 'FAIL', {
        statusCode: response.status,
        error: 'Invalid response format'
      });
    }
  } catch (error) {
    addTestResult('Get Stream Token', 'FAIL', {
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message
    });
  }
}

async function testCreateAnonymousSession() {
  console.log('\n4. 🎭 Testing Create Anonymous Session...');
  
  if (!userToken) {
    addTestResult('Create Anonymous Session', 'SKIP', { reason: 'No user token available' });
    return;
  }
  
  try {
    const response = await axios.post(`${BASE_URL}/api/1.0/rant/anonymous-session`, {
      sessionType: 'chat' // Test with chat session type
    }, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      sessionId = response.data.data.sessionId;
      roomId = response.data.data.roomId;
      
      addTestResult('Create Anonymous Session', 'PASS', {
        statusCode: response.status,
        sessionId: sessionId,
        roomId: roomId,
        sessionType: response.data.data.sessionType,
        waitingForMentor: response.data.data.waitingForMentor
      });
      
      console.log(`Session created: ${sessionId}`);
      console.log(`Room ID: ${roomId}`);
      console.log(`Session type: ${response.data.data.sessionType}`);
      console.log(`Waiting for mentor: ${response.data.data.waitingForMentor}`);
    } else {
      addTestResult('Create Anonymous Session', 'FAIL', {
        statusCode: response.status,
        error: 'Invalid response format'
      });
    }
  } catch (error) {
    addTestResult('Create Anonymous Session', 'FAIL', {
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message
    });
  }
}

async function testGetSessionStatus() {
  console.log('\n5. 📊 Testing Get Session Status...');
  
  if (!userToken || !sessionId) {
    addTestResult('Get Session Status', 'SKIP', { 
      reason: !userToken ? 'No user token available' : 'No session ID available'
    });
    return;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/1.0/rant/session-status/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    if (response.status === 200 && response.data.success) {
      addTestResult('Get Session Status', 'PASS', {
        statusCode: response.status,
        sessionId: response.data.data.sessionId,
        status: response.data.data.status,
        sessionType: response.data.data.sessionType,
        roomId: response.data.data.roomId
      });
      
      console.log(`Session status: ${response.data.data.status}`);
      console.log(`Session type: ${response.data.data.sessionType}`);
      console.log(`Room ID: ${response.data.data.roomId}`);
    } else {
      addTestResult('Get Session Status', 'FAIL', {
        statusCode: response.status,
        error: 'Invalid response format'
      });
    }
  } catch (error) {
    addTestResult('Get Session Status', 'FAIL', {
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message
    });
  }
}

async function testGetActiveSessions() {
  console.log('\n6. 📋 Testing Get Active Sessions...');
  
  if (!userToken) {
    addTestResult('Get Active Sessions', 'SKIP', { reason: 'No user token available' });
    return;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/1.0/rant/active-sessions`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    if (response.status === 200 && response.data.success) {
      const activeSessions = response.data.data.activeSessions;
      
      addTestResult('Get Active Sessions', 'PASS', {
        statusCode: response.status,
        activeSessionsCount: activeSessions.length,
        sessions: activeSessions.map(s => ({
          sessionId: s.sessionId,
          status: s.status,
          sessionType: s.sessionType
        }))
      });
      
      console.log(`Found ${activeSessions.length} active sessions`);
      if (activeSessions.length > 0) {
        console.log('Active sessions:', activeSessions.map(s => `${s.sessionId} (${s.status})`).join(', '));
      }
    } else {
      addTestResult('Get Active Sessions', 'FAIL', {
        statusCode: response.status,
        error: 'Invalid response format'
      });
    }
  } catch (error) {
    addTestResult('Get Active Sessions', 'FAIL', {
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message
    });
  }
}

async function testEndAnonymousSession() {
  console.log('\n7. 🔚 Testing End Anonymous Session...');
  
  if (!userToken || !sessionId) {
    addTestResult('End Anonymous Session', 'SKIP', { 
      reason: !userToken ? 'No user token available' : 'No session ID available'
    });
    return;
  }
  
  try {
    const response = await axios.post(`${BASE_URL}/api/1.0/rant/end-session`, {
      sessionId: sessionId
    }, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      addTestResult('End Anonymous Session', 'PASS', {
        statusCode: response.status,
        sessionId: response.data.data.sessionId,
        message: response.data.data.message
      });
      
      console.log(`Session ended: ${response.data.data.sessionId}`);
      console.log(`Message: ${response.data.data.message}`);
    } else {
      addTestResult('End Anonymous Session', 'FAIL', {
        statusCode: response.status,
        error: 'Invalid response format'
      });
    }
  } catch (error) {
    addTestResult('End Anonymous Session', 'FAIL', {
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message
    });
  }
}

async function testDifferentSessionTypes() {
  console.log('\n8. 🎯 Testing Different Session Types...');
  
  if (!userToken) {
    addTestResult('Different Session Types', 'SKIP', { reason: 'No user token available' });
    return;
  }
  
  const sessionTypes = ['chat', 'video', 'audio'];
  const results = [];
  
  for (const sessionType of sessionTypes) {
    try {
      console.log(`  Testing ${sessionType} session...`);
      const response = await axios.post(`${BASE_URL}/api/1.0/rant/anonymous-session`, {
        sessionType: sessionType
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data.success) {
        results.push({
          sessionType,
          success: true,
          sessionId: response.data.data.sessionId,
          roomId: response.data.data.roomId
        });
        console.log(`  ✅ ${sessionType} session created: ${response.data.data.sessionId}`);
        
        // Clean up - end the session
        try {
          await axios.post(`${BASE_URL}/api/1.0/rant/end-session`, {
            sessionId: response.data.data.sessionId
          }, {
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (endError) {
          console.log(`  ⚠️ Failed to end ${sessionType} session`);
        }
      } else {
        results.push({
          sessionType,
          success: false,
          error: 'Invalid response format'
        });
        console.log(`  ❌ ${sessionType} session failed`);
      }
    } catch (error) {
      results.push({
        sessionType,
        success: false,
        error: error.response?.data?.message || error.message
      });
      console.log(`  ❌ ${sessionType} session failed: ${error.response?.data?.message || error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const successfulTypes = results.filter(r => r.success).length;
  
  if (successfulTypes === sessionTypes.length) {
    addTestResult('Different Session Types', 'PASS', {
      testedTypes: sessionTypes,
      successfulTypes: successfulTypes,
      results: results
    });
  } else if (successfulTypes > 0) {
    addTestResult('Different Session Types', 'PASS', {
      testedTypes: sessionTypes,
      successfulTypes: successfulTypes,
      results: results,
      note: 'Partial success - some session types failed'
    });
  } else {
    addTestResult('Different Session Types', 'FAIL', {
      testedTypes: sessionTypes,
      successfulTypes: successfulTypes,
      results: results,
      error: 'All session types failed'
    });
  }
}

async function runRantTests() {
  console.log('🧪 Testing Rant Functionality...');
  console.log('Base URL:', BASE_URL);
  console.log('==================================================');
  
  try {
    await getAuthTokens();
    await testGetAblyToken();
    await testGetStreamToken();
    await testCreateAnonymousSession();
    await testGetSessionStatus();
    await testGetActiveSessions();
    await testEndAnonymousSession();
    await testDifferentSessionTypes();
    
  } catch (error) {
    console.error('❌ Unexpected error during testing:', error.message);
  }
  
  // Print summary
  console.log('\n==================================================');
  console.log('📊 TEST SUMMARY');
  console.log('==================================================');
  console.log(`✅ Passed: ${testResults.summary.passed}/${testResults.summary.total}`);
  console.log(`❌ Failed: ${testResults.summary.failed}/${testResults.summary.total}`);
  
  testResults.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${index + 1}. ${test.test}: ${test.status}`);
  });
  
  // Save results to file
  const resultsFile = 'rant-test-results.json';
  fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Results saved to: ${resultsFile}`);
}

runRantTests().catch(console.error);
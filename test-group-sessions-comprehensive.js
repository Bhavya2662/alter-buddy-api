const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';

// Test tokens (we'll get these from login)
let adminToken = '';
let userToken = '';
let mentorToken = '';

async function testGroupSessions() {
  const results = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  console.log('🧪 Testing Group Sessions Functionality...');
  console.log('Base URL:', BASE_URL);
  console.log('==================================================');

  try {
    // Step 1: Get authentication tokens
    console.log('\n1. 🔐 Getting Authentication Tokens...');
    await getAuthTokens();
    
    // Step 2: Test getting all group sessions (public endpoint)
    console.log('\n2. 📋 Testing Get All Group Sessions...');
    await testGetAllGroupSessions(results);
    
    // Step 3: Test getting mentor group sessions
    console.log('\n3. 👨‍🏫 Testing Get Mentor Group Sessions...');
    await testGetMentorGroupSessions(results);
    
    // Step 4: Get existing session for testing (fallback if creation fails)
    console.log('\n4. 🔍 Getting Existing Session for Testing...');
    await getExistingSessionForTesting(results);
    
    // Step 5: Test creating a group session (requires mentor auth)
    console.log('\n5. ➕ Testing Create Group Session...');
    await testCreateGroupSession(results);
    
    // Step 6: Test booking a group session (requires user auth)
    console.log('\n6. 📝 Testing Book Group Session...');
    await testBookGroupSession(results);
    
    // Step 7: Test joining a group session by room ID
    console.log('\n7. 🚪 Testing Join Group Session by Room ID...');
    await testJoinGroupSessionByRoomId(results);
    
    // Step 8: Test joining session by room ID (if room ID exists)
    console.log('\n8. 🚪 Testing Join Session by Room ID...');
    await testJoinSessionByRoomIdAlternative(results);
    
    // Step 9: Test updating a group session (requires mentor auth)
    console.log('\n9. ✏️ Testing Update Group Session...');
    await testUpdateGroupSession(results);
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    results.tests.push({
      name: 'Test Setup',
      status: 'failed',
      error: error.message
    });
  }

  // Calculate summary
  results.summary.total = results.tests.length;
  results.summary.passed = results.tests.filter(t => t.status === 'success').length;
  results.summary.failed = results.tests.filter(t => t.status === 'failed').length;

  // Print summary
  console.log('\n==================================================');
  console.log('📊 TEST SUMMARY');
  console.log('==================================================');
  console.log(`✅ Passed: ${results.summary.passed}/${results.summary.total}`);
  console.log(`❌ Failed: ${results.summary.failed}/${results.summary.total}`);
  
  results.tests.forEach((test, index) => {
    const status = test.status === 'success' ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${test.name}: ${test.status.toUpperCase()}`);
  });

  // Save results
  const filename = 'group-sessions-test-results.json';
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: ${filename}`);
}

async function getAuthTokens() {
  try {
    // Get admin token
    const adminResponse = await axios.put(`${BASE_URL}/api/1.0/admin/sign-in`, {
      email: 'admin@alterbuddy.com',
      password: 'admin123'
    });
    adminToken = adminResponse.data.data.token;
    console.log('✅ Admin token obtained');
    
    // Try to get user token (might fail due to email verification)
    try {
      const userResponse = await axios.put(`${BASE_URL}/api/1.0/sign-in`, {
        mobileOrEmail: 'kg224245@gmail.com',
        password: 'password123'
      });
      userToken = userResponse.data.data.token;
      console.log('✅ User token obtained');
    } catch (error) {
      console.log('⚠️ User token failed (email verification required):', error.response?.data?.message);
    }
    
    // Try to get mentor token with different credentials
    const mentorCredentials = [
      { username: 'Sachishah', password: 'password123' },
      { username: 'Sachishah', password: 'sachi123' },
      { username: 'Kalabanerji', password: 'password123' },
      { username: 'Kalabanerji', password: 'kala123' }
    ];
    
    for (const cred of mentorCredentials) {
      try {
        const mentorResponse = await axios.put(`${BASE_URL}/api/1.0/mentor/sign-in`, {
          username: cred.username,
          password: cred.password
        });
        mentorToken = mentorResponse.data.data.token;
        console.log(`✅ Mentor token obtained for ${cred.username}`);
        break;
      } catch (error) {
        console.log(`⚠️ Mentor login failed for ${cred.username}:`, error.response?.data?.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Failed to get auth tokens:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testGetAllGroupSessions(results) {
  try {
    const response = await axios.get(`${BASE_URL}/api/1.0/group-session/all`, { timeout: 10000 });
    console.log('✅ Get All Group Sessions Success:', response.status);
    console.log(`Found ${response.data.data.length} group sessions`);
    
    if (response.data.data.length > 0) {
      const session = response.data.data[0];
      console.log(`Sample session: ${session.title} (${session.sessionType})`);
    }
    
    results.tests.push({
      name: 'Get All Group Sessions',
      status: 'success',
      statusCode: response.status,
      data: {
        sessionsCount: response.data.data.length,
        sampleSession: response.data.data[0] || null
      }
    });
  } catch (error) {
    console.log('❌ Get All Group Sessions Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Get All Group Sessions',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

async function testGetMentorGroupSessions(results) {
  try {
    // Use a sample mentor ID
    const mentorId = '68a3849fa4e79f23deb23bf1';
    const response = await axios.get(`${BASE_URL}/api/1.0/group-session/mentor/${mentorId}`, { timeout: 10000 });
    console.log('✅ Get Mentor Group Sessions Success:', response.status);
    console.log(`Found ${response.data.data.length} sessions for mentor`);
    
    results.tests.push({
      name: 'Get Mentor Group Sessions',
      status: 'success',
      statusCode: response.status,
      data: {
        mentorId: mentorId,
        sessionsCount: response.data.data.length
      }
    });
  } catch (error) {
    console.log('❌ Get Mentor Group Sessions Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Get Mentor Group Sessions',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

async function getExistingSessionForTesting(results) {
  try {
    const response = await axios.get(`${BASE_URL}/api/1.0/group-session/all`, { timeout: 10000 });
    
    if (response.data.data.length > 0) {
      const existingSession = response.data.data[0];
      global.testSessionId = existingSession._id;
      global.testRoomId = existingSession.roomId;
      
      console.log('✅ Found existing session for testing:');
      console.log(`   Session ID: ${existingSession._id}`);
      console.log(`   Room ID: ${existingSession.roomId}`);
      console.log(`   Title: ${existingSession.title}`);
      
      results.tests.push({
        name: 'Get Existing Session for Testing',
        status: 'success',
        statusCode: response.status,
        data: {
          sessionId: existingSession._id,
          roomId: existingSession.roomId,
          title: existingSession.title
        }
      });
    } else {
      console.log('⚠️ No existing sessions found for testing');
      results.tests.push({
        name: 'Get Existing Session for Testing',
        status: 'failed',
        error: 'No existing sessions available for testing'
      });
    }
  } catch (error) {
    console.log('❌ Failed to get existing session:', error.response?.status || 'Network Error');
    results.tests.push({
      name: 'Get Existing Session for Testing',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

async function testCreateGroupSession(results) {
  if (!mentorToken) {
    console.log('⚠️ Skipping Create Group Session - No mentor token available');
    results.tests.push({
      name: 'Create Group Session',
      status: 'skipped',
      reason: 'No mentor authentication token available'
    });
    return;
  }
  
  try {
    const sessionData = {
      mentorId: '68a3849fa4e79f23deb23bf1',
      categoryId: '6839863e12dc335fec5b873b',
      title: `Test Group Session - ${Date.now()}`,
      description: 'Automated test group session for functionality verification',
      sessionType: 'video',
      price: 500,
      capacity: 5,
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      joinLink: 'https://meet.google.com/test-session'
    };
    
    const response = await axios.post(`${BASE_URL}/api/1.0/group-session`, sessionData, {
      headers: { Authorization: `Bearer ${mentorToken}` },
      timeout: 10000
    });
    
    console.log('✅ Create Group Session Success:', response.status);
    console.log('Session created:', response.data.data.title);
    console.log('Room ID:', response.data.data.roomId);
    console.log('Shareable Link:', response.data.data.shareableLink);
    
    // Store session ID for later tests
    global.testSessionId = response.data.data._id;
    global.testRoomId = response.data.data.roomId;
    
    results.tests.push({
      name: 'Create Group Session',
      status: 'success',
      statusCode: response.status,
      data: {
        sessionId: response.data.data._id,
        title: response.data.data.title,
        roomId: response.data.data.roomId,
        shareableLink: response.data.data.shareableLink
      }
    });
  } catch (error) {
    console.log('❌ Create Group Session Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Create Group Session',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

async function testBookGroupSession(results) {
  if (!userToken) {
    console.log('⚠️ Skipping Book Group Session - No user token available');
    results.tests.push({
      name: 'Book Group Session',
      status: 'skipped',
      reason: 'No user authentication token available'
    });
    return;
  }
  
  if (!global.testSessionId) {
    console.log('⚠️ Skipping Book Group Session - No session ID available');
    results.tests.push({
      name: 'Book Group Session',
      status: 'skipped',
      reason: 'No test session ID available from creation step'
    });
    return;
  }
  
  try {
    const bookingData = {
      userId: '68a2f604e5e716fa5eeb48b0' // Sample user ID
    };
    
    const response = await axios.put(`${BASE_URL}/api/1.0/group-session/book/${global.testSessionId}`, bookingData, {
      headers: { Authorization: `Bearer ${userToken}` },
      timeout: 10000
    });
    
    console.log('✅ Book Group Session Success:', response.status);
    console.log('Booking confirmed for session:', global.testSessionId);
    
    results.tests.push({
      name: 'Book Group Session',
      status: 'success',
      statusCode: response.status,
      data: {
        sessionId: global.testSessionId,
        userId: bookingData.userId
      }
    });
  } catch (error) {
    console.log('❌ Book Group Session Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Book Group Session',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

async function testJoinGroupSessionByRoomId(results) {
  if (!global.testRoomId) {
    console.log('⚠️ Skipping Join Group Session - No room ID available');
    results.tests.push({
      name: 'Join Group Session by Room ID',
      status: 'skipped',
      reason: 'No test room ID available from creation step'
    });
    return;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/1.0/group-session/join/${global.testRoomId}`, { timeout: 10000 });
    
    console.log('✅ Join Group Session by Room ID Success:', response.status);
    console.log('Session details retrieved for room:', global.testRoomId);
    
    results.tests.push({
      name: 'Join Group Session by Room ID',
      status: 'success',
      statusCode: response.status,
      data: {
        roomId: global.testRoomId,
        sessionTitle: response.data.data.title
      }
    });
  } catch (error) {
    console.log('❌ Join Group Session by Room ID Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Join Group Session by Room ID',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

async function testJoinSessionByRoomIdAlternative(results) {
  try {
    // Try to find a session with a valid room ID from all sessions
    const response = await axios.get(`${BASE_URL}/api/1.0/group-session/all`, { timeout: 10000 });
    
    let sessionWithRoomId = null;
    for (const session of response.data.data) {
      if (session.roomId && session.roomId !== 'undefined' && session.roomId.trim() !== '') {
        sessionWithRoomId = session;
        break;
      }
    }
    
    if (!sessionWithRoomId) {
      console.log('⚠️ No sessions with valid room IDs found');
      results.tests.push({
        name: 'Join Session by Room ID (Alternative)',
        status: 'skipped',
        reason: 'No sessions with valid room IDs available'
      });
      return;
    }
    
    const joinResponse = await axios.get(`${BASE_URL}/api/1.0/group-session/join/${sessionWithRoomId.roomId}`, { timeout: 10000 });
    
    console.log('✅ Join Session by Room ID Success:', joinResponse.status);
    console.log('Session joined:', sessionWithRoomId.title);
    console.log('Room ID:', sessionWithRoomId.roomId);
    
    results.tests.push({
      name: 'Join Session by Room ID (Alternative)',
      status: 'success',
      statusCode: joinResponse.status,
      data: {
        roomId: sessionWithRoomId.roomId,
        sessionTitle: sessionWithRoomId.title
      }
    });
  } catch (error) {
    console.log('❌ Join Session by Room ID Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Join Session by Room ID (Alternative)',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

async function testUpdateGroupSession(results) {
  if (!mentorToken) {
    console.log('⚠️ Skipping Update Group Session - No mentor token available');
    results.tests.push({
      name: 'Update Group Session',
      status: 'skipped',
      reason: 'No mentor authentication token available'
    });
    return;
  }
  
  if (!global.testSessionId) {
    console.log('⚠️ Skipping Update Group Session - No session ID available');
    results.tests.push({
      name: 'Update Group Session',
      status: 'skipped',
      reason: 'No test session ID available from creation step'
    });
    return;
  }
  
  try {
    const updateData = {
      title: `Updated Test Group Session - ${Date.now()}`,
      description: 'Updated description for automated test verification',
      capacity: 8 // Increase capacity
    };
    
    const response = await axios.patch(`${BASE_URL}/api/1.0/group-session/${global.testSessionId}`, updateData, {
      headers: { Authorization: `Bearer ${mentorToken}` },
      timeout: 10000
    });
    
    console.log('✅ Update Group Session Success:', response.status);
    console.log('Session updated:', updateData.title);
    console.log('New capacity:', updateData.capacity);
    
    results.tests.push({
      name: 'Update Group Session',
      status: 'success',
      statusCode: response.status,
      data: {
        sessionId: global.testSessionId,
        updatedTitle: updateData.title,
        newCapacity: updateData.capacity
      }
    });
  } catch (error) {
    console.log('❌ Update Group Session Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Update Group Session',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

// Run the test
testGroupSessions().catch(console.error);
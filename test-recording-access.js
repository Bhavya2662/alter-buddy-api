const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/1.0';

// Test credentials (using working credentials from session timer test)
const USER_CREDENTIALS = {
  mobileOrEmail: 'bhavyasharma2662@gmail.com',
  password: 'password123'
};

const TEST_MENTOR = {
  username: 'testmentor',
  password: 'password123'
};

async function signIn(credentials, userType = 'user') {
  try {
    const endpoint = userType === 'mentor' ? '/mentor/sign-in' : '/sign-in';
    const response = await axios.put(`${BASE_URL}${endpoint}`, credentials, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('Auth response:', JSON.stringify(response.data, null, 2));
      const userData = response.data.data;
      return {
        token: userData.token,
        userId: userData.user?._id || userData._id,
        userName: userData.user?.name || userData.user?.firstName || userData.name || userData.firstName || 'Unknown'
      };
    } else {
      throw new Error(response.data.message || 'Authentication failed');
    }
  } catch (error) {
    throw new Error(`Authentication error: ${error.response?.data?.message || error.message}`);
  }
}

async function getUserCalls(authToken) {
  try {
    const response = await axios.get(`${BASE_URL}/user/calls`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to get user calls');
    }
  } catch (error) {
    throw new Error(`Error getting user calls: ${error.response?.data?.message || error.message}`);
  }
}

async function getMentorCalls(authToken) {
  try {
    const response = await axios.get(`${BASE_URL}/mentor/calls`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to get mentor calls');
    }
  } catch (error) {
    throw new Error(`Error getting mentor calls: ${error.response?.data?.message || error.message}`);
  }
}

async function getCallRecording(callId, authToken) {
  try {
    const response = await axios.get(`${BASE_URL}/call/recording/${callId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to get recording');
    }
  } catch (error) {
    throw new Error(`Error getting recording: ${error.response?.data?.message || error.message}`);
  }
}

function analyzeRecordingData(calls, userType) {
  console.log(`\n📊 ${userType.toUpperCase()} RECORDING ANALYSIS:`);
  console.log('===============================');
  
  if (!calls || calls.length === 0) {
    console.log('❌ No calls found');
    return { totalCalls: 0, recordingsAvailable: 0, recordingsProcessing: 0 };
  }
  
  let totalCalls = calls.length;
  let recordingsAvailable = 0;
  let recordingsProcessing = 0;
  let recordingsFailed = 0;
  
  calls.forEach((call, index) => {
    const sessionDetails = call.sessionDetails;
    const recordingStatus = sessionDetails?.recordingStatus;
    const recordingUrl = sessionDetails?.recordingUrl;
    
    console.log(`\n📞 Call ${index + 1}:`);
    console.log(`   ID: ${call._id}`);
    console.log(`   Type: ${sessionDetails?.callType || 'N/A'}`);
    console.log(`   Status: ${call.status}`);
    console.log(`   Recording Status: ${recordingStatus || 'N/A'}`);
    console.log(`   Recording URL: ${recordingUrl ? 'Available' : 'Not Available'}`);
    
    if (recordingStatus === 'completed' && recordingUrl) {
      recordingsAvailable++;
    } else if (recordingStatus === 'processing') {
      recordingsProcessing++;
    } else if (recordingStatus === 'failed') {
      recordingsFailed++;
    }
  });
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total Calls: ${totalCalls}`);
  console.log(`   Recordings Available: ${recordingsAvailable}`);
  console.log(`   Recordings Processing: ${recordingsProcessing}`);
  console.log(`   Recordings Failed: ${recordingsFailed}`);
  
  return { 
    totalCalls, 
    recordingsAvailable, 
    recordingsProcessing, 
    recordingsFailed,
    calls: calls.filter(call => call.sessionDetails?.recordingUrl || call.sessionDetails?.recordingStatus)
  };
}

async function testRecordingAccess() {
  console.log('🎬 RECORDING ACCESS TEST');
  console.log('===============================');
  
  try {
    // Test User Recording Access
    console.log('\n🔐 Testing User Authentication...');
    let userAuth;
    try {
      userAuth = await signIn(USER_CREDENTIALS, 'user');
      console.log(`✅ User authenticated: ${userAuth.userName}`);
    } catch (error) {
      console.log(`❌ User authentication failed: ${error.message}`);
      console.log('ℹ️ Skipping user recording tests');
    }
    
    let userRecordingData = null;
    if (userAuth) {
      console.log('\n📞 Getting user calls...');
      try {
        const userCalls = await getUserCalls(userAuth.token);
        userRecordingData = analyzeRecordingData(userCalls, 'user');
      } catch (error) {
        console.log(`❌ Failed to get user calls: ${error.message}`);
      }
    }
    
    // Test Mentor Recording Access
    console.log('\n🔐 Testing Mentor Authentication...');
    let mentorAuth;
    try {
      mentorAuth = await signIn(TEST_MENTOR, 'mentor');
      console.log(`✅ Mentor authenticated: ${mentorAuth.userName}`);
    } catch (error) {
      console.log(`❌ Mentor authentication failed: ${error.message}`);
      console.log('ℹ️ Skipping mentor recording tests');
    }
    
    let mentorRecordingData = null;
    if (mentorAuth) {
      console.log('\n📞 Getting mentor calls...');
      try {
        const mentorCalls = await getMentorCalls(mentorAuth.token);
        mentorRecordingData = analyzeRecordingData(mentorCalls, 'mentor');
      } catch (error) {
        console.log(`❌ Failed to get mentor calls: ${error.message}`);
      }
    }
    
    // Test Recording Download Access
    console.log('\n🎥 Testing Recording Download Access...');
    
    // Test with user token if available
    if (userAuth && userRecordingData && userRecordingData.calls.length > 0) {
      const testCall = userRecordingData.calls[0];
      console.log(`\n👤 Testing user access to recording: ${testCall._id}`);
      try {
        const recording = await getCallRecording(testCall._id, userAuth.token);
        console.log(`✅ User can access recording`);
        console.log(`   Recording URL: ${recording.recordingUrl ? 'Available' : 'Not Available'}`);
        console.log(`   Status: ${recording.status}`);
      } catch (error) {
        console.log(`❌ User recording access failed: ${error.message}`);
      }
    }
    
    // Test with mentor token if available
    if (mentorAuth && mentorRecordingData && mentorRecordingData.calls.length > 0) {
      const testCall = mentorRecordingData.calls[0];
      console.log(`\n👨‍🏫 Testing mentor access to recording: ${testCall._id}`);
      try {
        const recording = await getCallRecording(testCall._id, mentorAuth.token);
        console.log(`✅ Mentor can access recording`);
        console.log(`   Recording URL: ${recording.recordingUrl ? 'Available' : 'Not Available'}`);
        console.log(`   Status: ${recording.status}`);
      } catch (error) {
        console.log(`❌ Mentor recording access failed: ${error.message}`);
      }
    }
    
    // Final Summary
    console.log('\n📋 FINAL RECORDING ACCESS SUMMARY:');
    console.log('===============================');
    
    if (userRecordingData) {
      console.log(`👤 User Panel:`);
      console.log(`   ✅ Can access call history: Yes`);
      console.log(`   📞 Total calls: ${userRecordingData.totalCalls}`);
      console.log(`   🎥 Recordings available: ${userRecordingData.recordingsAvailable}`);
    } else {
      console.log(`👤 User Panel: ❌ Could not test (authentication failed)`);
    }
    
    if (mentorRecordingData) {
      console.log(`👨‍🏫 Mentor Panel:`);
      console.log(`   ✅ Can access call history: Yes`);
      console.log(`   📞 Total calls: ${mentorRecordingData.totalCalls}`);
      console.log(`   🎥 Recordings available: ${mentorRecordingData.recordingsAvailable}`);
    } else {
      console.log(`👨‍🏫 Mentor Panel: ❌ Could not test (authentication failed)`);
    }
    
    console.log('\n🎉 Recording access testing completed!');
    
  } catch (error) {
    console.error('❌ Recording access test failed:', error.message);
  }
}

// Run the test
testRecordingAccess();
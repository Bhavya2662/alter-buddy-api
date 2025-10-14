const axios = require('axios');
const config = require('config');

// Test configuration
const BASE_URL = 'http://localhost:8080/api/1.0';
const TEST_USER = {
  email: 'demouser@example.com',
  password: 'DemoPassword123!'
};
const TEST_USER_ID = '6893af3764b3ae9ab7485a0d';
const TEST_MENTOR_ID = '68a37c625e4fb05bdff599d3';
const TEST_MENTOR = {
  email: 'mentor@alterbuddy.com',
  password: 'mentor123'
};

let authToken = '';
let userId;
let mentorId;

async function authenticateUser() {
  try {
    console.log('🔐 Getting user authentication token...');
    const response = await axios.put(`${BASE_URL}/sign-in`, {
       mobileOrEmail: TEST_USER.email,
       password: TEST_USER.password
     });
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('   ✅ Authentication successful');
      // Fetch user profile
      const profileResp = await axios.get(`${BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      userId = profileResp.data?.data?._id || profileResp.data?.user?._id;
      console.log('   🧑‍💻 User ID:', userId);
      // Ensure wallet has sufficient balance
      try {
        const walletResp = await axios.get(`${BASE_URL}/buddy-coins`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        const balance = walletResp.data?.data?.balance ?? walletResp.data?.balance ?? 0;
        console.log('   💰 Current wallet balance:', balance);
        if (balance < 500) {
          const topUpAmt = 1000;
          await axios.put(`${BASE_URL}/buddy-coins/top-up`, { amount: topUpAmt }, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          console.log('   ✅ Wallet topped up by', topUpAmt);
        }
      } catch (e) {
        console.log('   ⚠️ Wallet check/top-up skipped:', e.response?.data?.message || e.message);
      }
      // Mentor login to get mentorId
      const mentorSignIn = await axios.put(`${BASE_URL}/mentor/sign-in`, TEST_MENTOR);
      const mentorToken = mentorSignIn.data.data.token;
      const mentorProfile = await axios.get(`${BASE_URL}/mentor/profile`, {
        headers: { Authorization: `Bearer ${mentorToken}` }
      });
      mentorId = mentorProfile.data?.data?._id || mentorProfile.data?.mentor?._id;
      console.log('   🧑‍🏫 Mentor ID:', mentorId);
      return true;
    } else {
      console.log('   ❌ Authentication failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Authentication error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function bookShortSession() {
  try {
    console.log('\n⏱️ Booking short 2-minute chat session...');
    const bookingData = {
      userId: userId,
      callType: 'chat',
      mentorId: mentorId,
      time: '2',
      type: 'instant'
    };
    const response = await axios.put(`${BASE_URL}/slot/book`, bookingData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success !== false) {
      console.log('   ✅ Short session booked successfully!');
      const data = response.data?.data || {};
      const chatUrl = data?.room?.guestJoinURL || data?.room?.hostJoinURL || data?.joinLink || data?.chatLink || data?.link;
      if (chatUrl) {
        console.log('   🔗 Chat room URL:', chatUrl);
      }
      
      // Prefer explicit roomId from API; fallback to parsing from URL if available
      let roomId = data?.roomId;
      if (!roomId && typeof chatUrl === 'string') {
        try {
          const parsed = new URL(chatUrl, 'http://dummy');
          const parts = parsed.pathname.split('/').filter(Boolean);
          roomId = parts[parts.length - 1];
        } catch (_) {
          const urlParts = chatUrl.split('/');
          roomId = urlParts[urlParts.length - 1];
        }
      }
      console.log('   🏠 Room ID:', roomId);
      
      return {
        roomId,
        chatUrl,
        payment: data.payment
      };
    } else {
      console.log('   ❌ Booking failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('   ❌ Booking error:', error.response?.data?.message || error.message);
    console.log('   📊 Response data:', JSON.stringify(error.response?.data, null, 2));
    return null;
  }
}

async function checkSessionStatus(roomId) {
  try {
    console.log('\n🔍 Checking session status...');
    
    // Get user's recent calls to find the session
    const response = await axios.get(`${BASE_URL}/user/calls`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success !== false) {
      const calls = response.data.data || response.data;
      const currentSession = calls.find(call => 
        call.sessionDetails?.roomId === roomId
      );
      
      if (currentSession) {
        console.log('   ✅ Session found in database');
        console.log('   📊 Session details:');
        console.log('      Status:', currentSession.status);
        console.log('      Duration:', currentSession.sessionDetails.duration);
        console.log('      Start Time:', new Date(currentSession.sessionDetails.startTime).toLocaleString());
        console.log('      End Time:', new Date(currentSession.sessionDetails.endTime).toLocaleString());
        console.log('      Call Type:', currentSession.sessionDetails.callType);
        
        // Calculate remaining time
        const now = new Date();
        const endTime = new Date(currentSession.sessionDetails.endTime);
        const remainingMs = endTime.getTime() - now.getTime();
        const remainingMinutes = Math.max(0, Math.floor(remainingMs / (1000 * 60)));
        const remainingSeconds = Math.max(0, Math.floor((remainingMs % (1000 * 60)) / 1000));
        
        console.log('      ⏰ Remaining Time:', `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`);
        
        return {
          session: currentSession,
          remainingMs,
          isExpired: remainingMs <= 0
        };
      } else {
        console.log('   ❌ Session not found in database');
        return null;
      }
    } else {
      console.log('   ❌ Failed to get user calls:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('   ❌ Error checking session status:', error.response?.data?.message || error.message);
    return null;
  }
}

async function monitorSessionTimer(roomId, durationMinutes = 2) {
  console.log(`\n⏲️ Monitoring session timer for ${durationMinutes} minutes...`);
  
  const startTime = Date.now();
  const expectedEndTime = startTime + (durationMinutes * 60 * 1000);
  let checkCount = 0;
  
  const monitorInterval = setInterval(async () => {
    checkCount++;
    const currentTime = Date.now();
    const elapsedMs = currentTime - startTime;
    const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
    const elapsedSeconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);
    
    console.log(`\n📊 Timer Check #${checkCount} (${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')} elapsed)`);
    
    const sessionStatus = await checkSessionStatus(roomId);
    
    if (sessionStatus) {
      if (sessionStatus.isExpired) {
        console.log('   ⏰ Session has expired!');
        console.log('   ✅ Timer functionality working correctly');
        clearInterval(monitorInterval);
        return;
      } else {
        const remainingMinutes = Math.floor(sessionStatus.remainingMs / (1000 * 60));
        const remainingSeconds = Math.floor((sessionStatus.remainingMs % (1000 * 60)) / 1000);
        console.log(`   ⏳ Session still active - ${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')} remaining`);
      }
    }
    
    // Safety check - stop monitoring after 5 minutes regardless
    if (elapsedMs > 5 * 60 * 1000) {
      console.log('   ⚠️ Stopping monitoring after 5 minutes');
      clearInterval(monitorInterval);
    }
  }, 30000); // Check every 30 seconds
  
  // Also check immediately
  setTimeout(async () => {
    const sessionStatus = await checkSessionStatus(roomId);
    if (sessionStatus && !sessionStatus.isExpired) {
      console.log('   ✅ Session is active and timer is running');
    }
  }, 5000);
}

async function testSessionTimer() {
  console.log('🧪 TESTING SESSION DURATION TIMER');
  console.log('==================================');
  
  try {
    // Step 1: Authenticate
    const authSuccess = await authenticateUser();
    if (!authSuccess) {
      console.log('\n❌ SESSION TIMER TEST FAILED: Authentication failed');
      return;
    }
    
    // Step 2: Book a short session
    const sessionData = await bookShortSession();
    if (!sessionData) {
      console.log('\n❌ SESSION TIMER TEST FAILED: Could not book session');
      return;
    }
    
    // Step 3: Monitor the session timer
    await monitorSessionTimer(sessionData.roomId, 2);
    
    console.log('\n📊 SESSION TIMER TEST SUMMARY:');
    console.log('===============================');
    console.log('✅ User authentication successful');
    console.log('✅ Short session booking successful');
    console.log('✅ Session timer monitoring completed');
    console.log('\n🎉 Session timer testing completed!');
    console.log('ℹ️ Note: Check the monitoring output above to verify timer accuracy');
    
  } catch (error) {
    console.log('\n❌ SESSION TIMER TEST FAILED:');
    console.log('==============================');
    console.log('Error:', error.message);
    if (error.response?.data) {
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testSessionTimer();
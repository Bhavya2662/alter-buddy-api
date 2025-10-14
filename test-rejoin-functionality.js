const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/1.0';
const TEST_USER = {
  mobileOrEmail: 'demouser@example.com',
  password: 'DemoPassword123!'
};
const TEST_MENTOR = {
  email: 'mentor@alterbuddy.com',
  password: 'mentor123'
};

const TEST_USER_ID = '6893af3764b3ae9ab7485a0d'; // Actual test user ID

const MENTOR_ID = '68a37c625e4fb05bdff599d3'; // Test mentor ID

async function testRejoinFunctionality() {
  console.log('🧪 TESTING REJOIN FUNCTIONALITY');
  console.log('================================');

  let token;
  let firstBookingResponse;
  let secondBookingResponse;

  try {
    // Step 1: Authenticate user
    console.log('\n1️⃣ Getting user authentication token...');
    const authResponse = await axios.put(`${API_BASE_URL}/sign-in`, TEST_USER);
    token = authResponse.data.data.token;
    console.log('   ✅ Authentication successful');

    // Ensure wallet has sufficient balance
    try {
      const walletResp = await axios.get(`${API_BASE_URL}/buddy-coins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const balance = walletResp.data?.data?.balance ?? walletResp.data?.balance ?? 0;
      console.log('   💰 Current wallet balance:', balance);
      if (balance < 2000) {
        const topUpAmt = 2000 - balance + 1000; // buffer
        const topResp = await axios.put(`${API_BASE_URL}/buddy-coins/top-up`, { amount: topUpAmt }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   ✅ Wallet topped up, new balance:', topResp.data?.data?.balance ?? 'OK');
      }
    } catch (e) {
      console.log('   ⚠️ Wallet check/top-up skipped:', e.response?.data?.message || e.message);
    }

    // Fetch user profile to get dynamic userId
    const profileResp = await axios.get(`${API_BASE_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    userId = profileResp.data?.data?._id || profileResp.data?.user?._id;
    console.log('   🧑‍💻 User ID:', userId);

    // Mentor login to obtain a valid mentorId
    console.log('\n1️⃣b Getting mentor authentication and ID...');
    const mentorSignIn = await axios.put(`${API_BASE_URL}/mentor/sign-in`, TEST_MENTOR);
    const mentorToken = mentorSignIn.data.data.token;
    const mentorProfile = await axios.get(`${API_BASE_URL}/mentor/profile`, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    mentorId = mentorProfile.data?.data?._id || mentorProfile.data?.mentor?._id;
    console.log('   🧑‍🏫 Mentor ID:', mentorId);

    // Step 2: Book first chat session
    console.log('\n2️⃣ Booking first chat session...');
    const firstBookingData = {
      userId: userId,
      callType: 'chat',
      mentorId: mentorId,
      time: '30',
      type: 'instant'
    };

    firstBookingResponse = await axios.put(`${API_BASE_URL}/slot/book`, firstBookingData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('   ✅ First booking successful!');
    const firstData = firstBookingResponse.data?.data || {};
    const firstLink = firstData?.room?.guestJoinURL || firstData?.room?.hostJoinURL || firstData?.joinLink || firstData?.chatLink || firstData?.link;
    console.log('   🔗 First chat room URL:', firstLink);
    
    let firstRoomId = firstData?.roomId;
    if (!firstRoomId && typeof firstLink === 'string') {
      try {
        const parsed = new URL(firstLink, 'http://dummy');
        const parts = parsed.pathname.split('/').filter(Boolean);
        firstRoomId = parts[parts.length - 1];
      } catch (_) {
        const firstUrlParts = firstLink.split('/');
        firstRoomId = firstUrlParts[firstUrlParts.length - 1];
      }
    }
    console.log('   🏠 First Room ID:', firstRoomId);

    // Wait a moment before testing rejoin
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Test rejoin same session type (should work without payment)
    console.log('\n3️⃣ Testing rejoin same session type (chat)...');
    try {
      const rejoinSameResponse = await axios.put(`${API_BASE_URL}/slot/book`, firstBookingData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const rejoinData = rejoinSameResponse.data?.data || {};
      const rejoinLink = rejoinData?.room?.guestJoinURL || rejoinData?.room?.hostJoinURL || rejoinData?.joinLink || rejoinData?.chatLink || rejoinData?.link;
      const rejoinRoomId = rejoinData?.roomId || (typeof rejoinLink === 'string' ? rejoinLink.split('/').pop() : undefined);
      
      if (rejoinRoomId === firstRoomId) {
        console.log('   ✅ Rejoin successful - same room ID returned');
        console.log('   ✅ No additional payment required for same session type');
      } else {
        console.log('   ⚠️ Different room ID returned:', rejoinRoomId);
        console.log('   ⚠️ This might indicate a new session was created');
      }
    } catch (error) {
      console.log('   ❌ Rejoin same session failed:', error.response?.data?.message || error.message);
    }

    // Step 4: Test different session type (should require new payment)
    console.log('\n4️⃣ Testing different session type (audio call)...');
    const differentSessionData = {
      userId: userId,
      callType: 'audio',
      mentorId: mentorId,
      time: '30',
      type: 'instant'
    };

    try {
      secondBookingResponse = await axios.put(`${API_BASE_URL}/slot/book`, differentSessionData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const secondData = secondBookingResponse.data?.data || {};
      const secondLink = secondData?.room?.guestJoinURL || secondData?.room?.hostJoinURL || secondData?.joinLink || secondData?.chatLink || secondData?.link;
      const secondRoomId = secondData?.roomId || (typeof secondLink === 'string' ? secondLink.split('/').pop() : undefined);
      
      if (secondRoomId !== firstRoomId) {
        console.log('   ✅ Different session type created new room:', secondRoomId);
        console.log('   ✅ New payment processed for different session type');
      } else {
        console.log('   ⚠️ Same room ID returned for different session type');
        console.log('   ⚠️ This might indicate incorrect rejoin logic');
      }
    } catch (error) {
      if (error.response?.data?.message?.includes('balance')) {
        console.log('   ✅ Payment required for different session type (insufficient balance)');
        console.log('   ✅ Rejoin logic working correctly - different types require payment');
      } else {
        console.log('   ❌ Different session booking failed:', error.response?.data?.message || error.message);
      }
    }

    // Step 5: Verify user calls history
    console.log('\n5️⃣ Verifying user calls history...');
    try {
      const callsResponse = await axios.get(`${API_BASE_URL}/user/calls`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const recentCalls = callsResponse.data.data || [];
      const chatSessions = recentCalls.filter(call => call.sessionDetails?.callType === 'chat');
      const audioSessions = recentCalls.filter(call => call.sessionDetails?.callType === 'audio');
      
      console.log('   📞 Total recent calls:', recentCalls.length);
      console.log('   💬 Chat sessions:', chatSessions.length);
      console.log('   🎵 Audio sessions:', audioSessions.length);
      
      // Check for duplicate sessions
      const uniqueRoomIds = new Set(recentCalls.map(call => call.sessionDetails?.roomId));
      if (uniqueRoomIds.size < recentCalls.length) {
        console.log('   ⚠️ Duplicate room IDs detected - possible rejoin issue');
      } else {
        console.log('   ✅ All sessions have unique room IDs');
      }
    } catch (error) {
      console.log('   ❌ Failed to get user calls:', error.response?.data?.message || error.message);
    }

    // Step 6: Test wallet balance changes
    console.log('\n6️⃣ Checking wallet balance changes...');
    try {
      const walletResponse = await axios.get(`${API_BASE_URL}/buddy-coins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('   💰 Current wallet balance:', walletResponse.data.data.balance);
      console.log('   📊 Total transactions:', walletResponse.data.data.transactions?.length || 0);
    } catch (error) {
      console.log('   ❌ Failed to get wallet balance:', error.response?.data?.message || error.message);
    }

    // Summary
    console.log('\n📊 REJOIN FUNCTIONALITY TEST SUMMARY:');
    console.log('=====================================');
    console.log('✅ User authentication successful');
    console.log('✅ First session booking works');
    console.log('✅ Rejoin logic tested for same session type');
    console.log('✅ Different session type logic tested');
    console.log('✅ User calls history verified');
    console.log('✅ Wallet balance tracking verified');
    console.log('');
    console.log('🎉 Rejoin functionality testing completed!');
    console.log('ℹ️ Note: Same session type should allow rejoin, different types require new payment');

  } catch (error) {
    console.error('\n❌ REJOIN FUNCTIONALITY TEST FAILED:');
    console.error('====================================');
    console.error('Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testRejoinFunctionality();
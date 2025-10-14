const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/1.0';

// Test credentials
const MENTOR_CREDENTIALS = {
  email: 'mentor@alterbuddy.com',
  password: 'mentor123'
};

const USER_CREDENTIALS = {
  mobileOrEmail: 'testuser@example.com',
  password: 'password123'
};

async function debugSlotBooking() {
  try {
    console.log('🔐 Authenticating mentor...');
    const mentorResponse = await axios.put(`${API_BASE_URL}/mentor/sign-in`, MENTOR_CREDENTIALS);
    const mentorToken = mentorResponse.data.data.token;
    console.log('✅ Mentor token:', mentorToken);
    
    // Get mentor profile
    const mentorProfileResponse = await axios.get(`${API_BASE_URL}/mentor/profile`, {
      headers: { 'Authorization': `Bearer ${mentorToken}` }
    });
    const mentorId = mentorProfileResponse.data.data._id;
    console.log('📝 Mentor ID:', mentorId);
    
    console.log('🔐 Authenticating user...');
    const userResponse = await axios.put(`${API_BASE_URL}/sign-in`, USER_CREDENTIALS);
    const userToken = userResponse.data.data.token;
    console.log('✅ User token:', userToken);
    
    // Get user profile
    const userProfileResponse = await axios.get(`${API_BASE_URL}/user/profile`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const userId = userProfileResponse.data.data._id;
    console.log('📝 User ID:', userId);
    
    // Create a test slot (use audio type; model supports 'audio' or 'video')
    console.log('📅 Creating test slot...');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const slotData = {
      slots: [{
        time: '2:00 PM',
        booked: false,
        status: 'available',
        callType: 'audio',
        duration: 60
      }],
      slotsDate: tomorrow.toISOString().split('T')[0]
    };
    
    const slotResponse = await axios.post(`${API_BASE_URL}/mentor/schedule`, slotData, {
      headers: {
        'Authorization': `Bearer ${mentorToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Test slot created');
    
    // Get mentor schedules to find the slot ID
    console.log('📋 Fetching mentor schedules...');
    const schedulesResponse = await axios.get(`${API_BASE_URL}/mentor/schedule`, {
      headers: { 'Authorization': `Bearer ${mentorToken}` }
    });
    
    const schedules = schedulesResponse.data.data;
    const testSchedule = schedules.find(schedule => 
      schedule.slotsDate === slotData.slotsDate
    );
    
    if (!testSchedule) {
      throw new Error('Test schedule not found');
    }
    
    // Find an available slot for the specified time and call type
    const testSlot = testSchedule.slots.find(slot => 
      slot.time === slotData.slots[0].time && slot.booked === false && slot.status === 'available' && slot.callType === slotData.slots[0].callType
    );
    
    if (!testSlot) {
      throw new Error('Available test slot not found in schedules');
    }
    
    const slotId = testSlot._id;
    console.log('📍 Found test slot with ID:', slotId);
    
    // Now try to book the slot (audio)
    console.log('📝 Attempting to book slot...');
    console.log('📋 Booking data:', {
      userId: userId,
      slotId: slotId,
      mentorId: mentorId,
      callType: "audio",
      type: "slot",
      time: 60
    });
    
    const bookingData = {
      userId: userId,
      slotId: slotId,
      mentorId: mentorId,
      callType: "audio",
      type: "slot",
      time: 60
    };
    
    console.log('🔑 Using user token for booking:', userToken);
    
    const bookingResponse = await axios.put(`${API_BASE_URL}/slot/book`, bookingData, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Slot booked successfully!');
    console.log('📋 Booking response:', bookingResponse.data);

    // Mentor confirms the slot to create the Chat session for slot bookings
    console.log('✅ Confirming slot as mentor...');
    try {
      const confirmResp = await axios.put(`${API_BASE_URL}/confirm-slot`, {
        slotId,
        mentorId,
        userId
      }, {
        headers: {
          'Authorization': `Bearer ${mentorToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('👍 Slot confirmed by mentor:', confirmResp.data);
    } catch (err) {
      console.error('❌ Mentor slot confirmation failed:', err?.response?.data || err.message);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        console.error('⚠️ Token issue detected. Retrying confirm-slot with cookie-based auth...');
        try {
          const client = axios.create({
            baseURL: API_BASE_URL,
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' }
          });
          const confirmResp2 = await client.put(`/confirm-slot`, { slotId, mentorId, userId }, {
            headers: { 'Authorization': `Bearer ${mentorToken}` }
          });
          console.log('👍 Slot confirmed by mentor (retry):', confirmResp2.data);
        } catch (err2) {
          console.error('❌ Retry failed:', err2?.response?.data || err2.message);
          return;
        }
      } else {
        return;
      }
    }

    // Fetch user calls to obtain sessionId (Chat._id)
    console.log('📞 Fetching user calls...');
    const userCallsResp = await axios.get(`${API_BASE_URL}/user/calls`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const calls = userCallsResp.data?.data || [];
    if (!Array.isArray(calls) || calls.length === 0) {
      console.log('ℹ️ No calls found for user, trying mentor calls as fallback.');
      // Fallback: fetch mentor calls and filter by this user
      const mentorCallsResp = await axios.get(`${API_BASE_URL}/mentor/calls`, {
        headers: { 'Authorization': `Bearer ${mentorToken}` }
      });
      const mentorCalls = mentorCallsResp.data?.data || [];
      const matchingMentorCall = mentorCalls.find(c => {
        const mentorInCall = c?.users?.mentor?._id || c?.users?.mentor;
        const userInCall = c?.users?.user?._id || c?.users?.user;
        const callType = c?.sessionDetails?.callType;
        return String(mentorInCall) === String(mentorId) && String(userInCall) === String(userId) && callType === bookingData.callType;
      });
      if (!matchingMentorCall) {
        console.log('❗ No matching call found in mentor calls. Aborting join.');
        return;
      }
      const sessionId = matchingMentorCall._id;
      console.log('🆔 Matched sessionId from mentor calls:', sessionId);

      // Mentor joins session
      console.log('👨‍🏫 Mentor joining session...');
      const mentorJoinResp = await axios.post(`${API_BASE_URL}/session/join`, {
        sessionId,
        userType: 'mentor',
        userId: mentorId
      }, {
        headers: { 'Authorization': `Bearer ${mentorToken}` }
      });
      console.log('✅ Mentor joined:', mentorJoinResp.data);

      // User joins session
      console.log('👤 User joining session...');
      const userJoinResp = await axios.post(`${API_BASE_URL}/session/join`, {
        sessionId,
        userType: 'user',
        userId: userId
      }, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      console.log('✅ User joined:', userJoinResp.data);
      return;
    }

    // Filter user calls to find the call for the correct mentor and call type
    const matchingCall = calls.find(c => {
      const mentorInCall = c?.users?.mentor?._id || c?.users?.mentor;
      const userInCall = c?.users?.user?._id || c?.users?.user;
      const callType = c?.sessionDetails?.callType;
      return String(mentorInCall) === String(mentorId) && String(userInCall) === String(userId) && callType === bookingData.callType;
    });

    if (!matchingCall) {
      console.log('❗ No matching call found in user calls.');
      return;
    }

    const sessionId = matchingCall._id;
    console.log('🆔 Matched sessionId from user calls:', sessionId);

    // Mentor joins session
    console.log('👨‍🏫 Mentor joining session...');
    const mentorJoinResp = await axios.post(`${API_BASE_URL}/session/join`, {
      sessionId,
      userType: 'mentor',
      userId: mentorId
    }, {
      headers: { 'Authorization': `Bearer ${mentorToken}` }
    });
    console.log('✅ Mentor joined:', mentorJoinResp.data);

    // User joins session
    console.log('👤 User joining session...');
    const userJoinResp = await axios.post(`${API_BASE_URL}/session/join`, {
      sessionId,
      userType: 'user',
      userId: userId
    }, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    console.log('✅ User joined:', userJoinResp.data);

  } catch (error) {
    console.error('❌ Error in debugSlotBooking:', error?.response?.data || error.message);
  }
}

// Run the debug function
debugSlotBooking();
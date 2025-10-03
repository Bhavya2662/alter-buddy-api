const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/1.0';

// Test credentials
const MENTOR_CREDENTIALS = {
  username: 'testmentor',
  password: 'password123'
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
    console.log('✅ Mentor token:', mentorToken.substring(0, 20) + '...');
    
    // Get mentor profile
    const mentorProfileResponse = await axios.get(`${API_BASE_URL}/mentor/profile`, {
      headers: { 'Authorization': `Bearer ${mentorToken}` }
    });
    const mentorId = mentorProfileResponse.data.data._id;
    console.log('📝 Mentor ID:', mentorId);
    
    console.log('🔐 Authenticating user...');
    const userResponse = await axios.put(`${API_BASE_URL}/sign-in`, USER_CREDENTIALS);
    const userToken = userResponse.data.data.token;
    console.log('✅ User token:', userToken.substring(0, 20) + '...');
    
    // Get user profile
    const userProfileResponse = await axios.get(`${API_BASE_URL}/user/profile`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const userId = userProfileResponse.data.data._id;
    console.log('📝 User ID:', userId);
    
    // Create a test slot
    console.log('📅 Creating test slot...');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const slotData = {
      slots: [{
        time: '2:00 PM',
        booked: false,
        status: 'available',
        callType: 'video',
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
    
    const testSlot = testSchedule.slots.find(slot => 
      slot.time === slotData.slots[0].time
    );
    
    if (!testSlot) {
      throw new Error('Test slot not found in schedules');
    }
    
    const slotId = testSlot._id;
    console.log('📍 Found test slot with ID:', slotId);
    
    // Now try to book the slot
    console.log('📝 Attempting to book slot...');
    console.log('📋 Booking data:', {
      userId: userId,
      slotId: slotId,
      mentorId: mentorId,
      callType: "video",
      type: "slot",
      time: 60
    });
    
    const bookingData = {
      userId: userId,
      slotId: slotId,
      mentorId: mentorId,
      callType: "video",
      type: "slot",
      time: 60
    };
    
    console.log('🔑 Using user token for booking:', userToken.substring(0, 20) + '...');
    
    const bookingResponse = await axios.put(`${API_BASE_URL}/slot/book`, bookingData, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Slot booked successfully!');
    console.log('📋 Booking response:', bookingResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('📋 Response status:', error.response.status);
      console.error('📋 Response data:', error.response.data);
    }
  }
}

debugSlotBooking();
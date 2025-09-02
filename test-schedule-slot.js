const axios = require('axios');

const MENTOR_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YTM4NDlmYTRlNzlmMjNkZWIyM2JmMSIsImlhdCI6MTc1NjUzMDUwNCwiZXhwIjoxNzU5MTIyNTA0fQ.7xHt9fQFtrZ1O6HPbjz-zqhZnuXE00kfNqma95NjtMc';
const API_BASE_URL = 'http://localhost:8080/api/1.0';

async function testScheduleSlot() {
  try {
    console.log('📅 Testing Schedule Time Slot for 12PM Today');
    console.log('===============================================');
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    // Create 12PM time slot for today
    const scheduleData = {
      slots: [{
        time: "12:00 PM",
        callType: "video",
        duration: 60,
        status: "available",
        booked: false
      }],
      slotsDate: dateString
    };
    
    console.log('📋 Schedule data:', JSON.stringify(scheduleData, null, 2));
    console.log('🔐 Using mentor token for authentication...');
    
    const response = await axios.post(`${API_BASE_URL}/mentor/schedule`, scheduleData, {
      headers: {
        'Authorization': `Bearer ${MENTOR_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Schedule created successfully!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
    // Also try to get the mentor's schedules to verify
    console.log('\n🔍 Fetching mentor schedules to verify...');
    const schedulesResponse = await axios.get(`${API_BASE_URL}/mentor/schedule`, {
      headers: {
        'Authorization': `Bearer ${MENTOR_TOKEN}`
      }
    });
    
    console.log('📋 Current schedules:', JSON.stringify(schedulesResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error scheduling time slot:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testScheduleSlot();
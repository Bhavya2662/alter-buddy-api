const axios = require('axios');

const API_BASE = 'http://localhost:8080/api/1.0';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YTJmZmEyZTUwZmIyNDRiYTQ5MDVkZCIsImlhdCI6MTc1OTM5MDUxNywiZXhwIjoxNzYxOTgyNTE3fQ.lk5_fA1gBHTpth10urr76ePy-Or2aqx216oqhaTPaHw'; // Fresh token from testuser@example.com
const MENTOR_ID = '68a37ad37de01f8431c91ee3'; // Valid mentor ID: Sachi Shah
const USER_ID = '68a2ffa2e50fb244ba4905dd'; // Test user with wallet

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testBookingCategories() {
  console.log('🧪 COMPREHENSIVE BOOKING TEST');
  console.log('=' .repeat(50));
  
  // Test scenarios
  const testCases = [
    { type: 'chat', duration: 5, description: '5-minute chat session' },
    { type: 'chat', duration: 10, description: '10-minute chat session' },
    { type: 'audio', duration: 15, description: '15-minute audio call' },
    { type: 'audio', duration: 30, description: '30-minute audio call' },
    { type: 'video', duration: 15, description: '15-minute video call' },
    { type: 'video', duration: 30, description: '30-minute video call' }
  ];
  
  let successfulBookings = [];
  let failedBookings = [];
  
  // Check initial wallet balance
  try {
    const walletResponse = await axios.get(`${API_BASE}/buddy-coins`, { headers });
    console.log(`💰 Initial wallet balance: ${walletResponse.data.data?.totalCoins || 'N/A'} coins\n`);
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || JSON.stringify(error.response?.data || error);
    console.log(`❌ Could not fetch wallet balance: ${errorMsg}\n`);
  }
  
  // Test each booking scenario
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`${i + 1}. Testing ${testCase.description}...`);
    
    try {
      const bookingPayload = {
        mentorId: MENTOR_ID,
        callType: testCase.type,
        time: testCase.duration,
        type: 'instant'
      };
      
      const response = await axios.put(`${API_BASE}/slot/book`, bookingPayload, { headers });
      
      if (response.data.success) {
        console.log(`   ✅ Successfully booked ${testCase.description}`);
        console.log(`   📱 Chat link: ${response.data.data.chatLink || 'N/A'}`);
        console.log(`   💳 Payment: ${response.data.data.payment?.amount || 'N/A'} coins`);
        console.log(`   🆔 Session ID: ${response.data.data.chatId || 'N/A'}`);
        
        successfulBookings.push({
          ...testCase,
          sessionId: response.data.data.chatId,
          chatLink: response.data.data.chatLink,
          amount: response.data.data.payment?.amount
        });
      } else {
        console.log(`   ❌ Booking failed: ${response.data.message}`);
        failedBookings.push({ ...testCase, error: response.data.message });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || JSON.stringify(error.response?.data || error);
      console.log(`   ❌ Booking failed: ${errorMsg}`);
      failedBookings.push({ ...testCase, error: errorMsg });
    }
    
    console.log('');
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Check final wallet balance
  try {
    const walletResponse = await axios.get(`${API_BASE}/buddy-coins`, { headers });
    console.log(`💰 Final wallet balance: ${walletResponse.data.data?.totalCoins || 'N/A'} coins\n`);
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || JSON.stringify(error.response?.data || error);
    console.log(`❌ Could not fetch final wallet balance: ${errorMsg}\n`);
  }
  
  // Summary
  console.log('📊 BOOKING TEST SUMMARY');
  console.log('=' .repeat(30));
  console.log(`✅ Successful bookings: ${successfulBookings.length}/${testCases.length}`);
  console.log(`❌ Failed bookings: ${failedBookings.length}/${testCases.length}`);
  
  if (successfulBookings.length > 0) {
    console.log('\n🎯 Successful Bookings:');
    successfulBookings.forEach((booking, index) => {
      console.log(`   ${index + 1}. ${booking.description} - ${booking.amount} coins - ID: ${booking.sessionId}`);
    });
  }
  
  if (failedBookings.length > 0) {
    console.log('\n❌ Failed Bookings:');
    failedBookings.forEach((booking, index) => {
      console.log(`   ${index + 1}. ${booking.description} - Error: ${booking.error}`);
    });
  }
  
  // Return successful bookings for further testing
  return successfulBookings;
}

// Run the test
testBookingCategories()
  .then(bookings => {
    console.log('\n🏁 Booking category testing completed!');
    if (bookings.length > 0) {
      console.log(`\n📋 Available sessions for further testing:`);
      bookings.forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.type.toUpperCase()} - ${booking.duration}min - Link: ${booking.chatLink}`);
      });
    }
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error.message);
  });
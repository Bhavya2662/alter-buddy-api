const axios = require('axios');

const API_BASE = 'http://localhost:8080/api/1.0';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YTJmZmEyZTUwZmIyNDRiYTQ5MDVkZCIsImlhdCI6MTc1OTM4OTAzNiwiZXhwIjoxNzYxOTgxMDM2fQ.Cm9TBdIVeHNoorPBxt2IS8KDQ1OsInUHB8iJW1GwspM';

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testEdgeCases() {
  console.log('🧪 Testing Edge Cases for Booking API\n');

  // Test 1: Check user wallet balance first
  console.log('1. Checking user wallet balance...');
  let userBalance = 0;
  try {
    const response = await axios.get(`${API_BASE}/buddy-coins`, { headers });
    userBalance = response.data.data?.balance || 0;
    console.log('✅ User wallet balance:', userBalance);
  } catch (error) {
    console.log('❌ Failed to get wallet balance:', error.response?.data?.message || error.message);
  }

  // Test 2: Invalid mentor ID
  console.log('\n2. Testing with invalid mentor ID...');
  try {
    const response = await axios.put(`${API_BASE}/slot/book`, {
      mentorId: '000000000000000000000000', // Invalid ID
      callType: 'chat',
      time: 5,
      type: 'instant'
    }, { headers });
    console.log('❌ Should have failed with invalid mentor ID');
  } catch (error) {
    console.log('✅ Correctly rejected invalid mentor ID:', error.response?.data?.message || error.message);
  }

  // Test 3: Missing required fields
  console.log('\n3. Testing with missing required fields...');
  try {
    const response = await axios.put(`${API_BASE}/slot/book`, {
      mentorId: '6893af3764b3ae9ab7485a0d',
      // Missing callType, time, type
    }, { headers });
    console.log('❌ Should have failed with missing fields');
  } catch (error) {
    console.log('✅ Correctly rejected missing fields:', error.response?.data?.message || error.message);
  }

  // Test 4: Invalid call type
  console.log('\n4. Testing with invalid call type...');
  try {
    const response = await axios.put(`${API_BASE}/slot/book`, {
      mentorId: '6893af3764b3ae9ab7485a0d',
      callType: 'invalid_type',
      time: 5,
      type: 'instant'
    }, { headers });
    console.log('❌ Should have failed with invalid call type');
  } catch (error) {
    console.log('✅ Correctly rejected invalid call type:', error.response?.data?.message || error.message);
  }

  // Test 5: Invalid time duration
  console.log('\n5. Testing with invalid time duration...');
  try {
    const response = await axios.put(`${API_BASE}/slot/book`, {
      mentorId: '6893af3764b3ae9ab7485a0d',
      callType: 'chat',
      time: 0, // Invalid time
      type: 'instant'
    }, { headers });
    console.log('❌ Should have failed with invalid time');
  } catch (error) {
    console.log('✅ Correctly rejected invalid time:', error.response?.data?.message || error.message);
  }

  // Test 6: Invalid type
  console.log('\n6. Testing with invalid type...');
  try {
    const response = await axios.put(`${API_BASE}/slot/book`, {
      mentorId: '6893af3764b3ae9ab7485a0d',
      callType: 'chat',
      time: 5,
      type: 'invalid_type'
    }, { headers });
    console.log('❌ Should have failed with invalid type');
  } catch (error) {
    console.log('✅ Correctly rejected invalid type:', error.response?.data?.message || error.message);
  }

  // Test 7: Slot type without slotId
  console.log('\n7. Testing slot type without slotId...');
  try {
    const response = await axios.put(`${API_BASE}/slot/book`, {
      mentorId: '6893af3764b3ae9ab7485a0d',
      callType: 'chat',
      time: 5,
      type: 'slot'
      // Missing slotId
    }, { headers });
    console.log('❌ Should have failed without slotId for slot type');
  } catch (error) {
    console.log('✅ Correctly rejected slot type without slotId:', error.response?.data?.message || error.message);
  }

  // Test 8: Invalid authorization token
  console.log('\n8. Testing with invalid authorization token...');
  try {
    const response = await axios.put(`${API_BASE}/slot/book`, {
      mentorId: '6893af3764b3ae9ab7485a0d',
      callType: 'chat',
      time: 5,
      type: 'instant'
    }, { 
      headers: {
        'Authorization': 'Bearer invalid_token',
        'Content-Type': 'application/json'
      }
    });
    console.log('❌ Should have failed with invalid token');
  } catch (error) {
    console.log('✅ Correctly rejected invalid token:', error.response?.data?.message || error.message);
  }

  // Test 9: No authorization header
  console.log('\n9. Testing without authorization header...');
  try {
    const response = await axios.put(`${API_BASE}/slot/book`, {
      mentorId: '6893af3764b3ae9ab7485a0d',
      callType: 'chat',
      time: 5,
      type: 'instant'
    }, { 
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('❌ Should have failed without authorization');
  } catch (error) {
    console.log('✅ Correctly rejected missing authorization:', error.response?.data?.message || error.message);
  }

  // Test 10: Test booking with very high duration
  console.log('\n10. Testing with very high duration...');
  try {
    const response = await axios.put(`${API_BASE}/slot/book`, {
      mentorId: '6893af3764b3ae9ab7485a0d',
      callType: 'chat',
      time: 999999, // Very high time
      type: 'instant'
    }, { headers });
    console.log('❌ Should have failed with excessive duration');
  } catch (error) {
    console.log('✅ Correctly rejected excessive duration:', error.response?.data?.message || error.message);
  }

  // Test 11: Test booking with insufficient balance (if balance is low)
  if (userBalance < 100) {
    console.log('\n11. Testing with insufficient balance...');
    try {
      const response = await axios.put(`${API_BASE}/slot/book`, {
        mentorId: '6893af3764b3ae9ab7485a0d',
        callType: 'video',
        time: 60, // High cost session
        type: 'instant'
      }, { headers });
      console.log('❌ Should have failed with insufficient balance');
    } catch (error) {
      console.log('✅ Correctly rejected insufficient balance:', error.response?.data?.message || error.message);
    }
  } else {
    console.log('\n11. Skipping insufficient balance test (user has sufficient balance)');
  }

  // Test 12: Test concurrent bookings (rapid fire)
  console.log('\n12. Testing concurrent bookings...');
  try {
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        axios.put(`${API_BASE}/slot/book`, {
          mentorId: '6893af3764b3ae9ab7485a0d',
          callType: 'chat',
          time: 5,
          type: 'instant'
        }, { headers })
      );
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Concurrent booking test: ${successful} successful, ${failed} failed`);
    if (successful > 1) {
      console.log('⚠️  Warning: Multiple concurrent bookings succeeded - check for race conditions');
    }
  } catch (error) {
    console.log('❌ Concurrent booking test failed:', error.message);
  }

  // Test 13: Check final wallet balance
  console.log('\n13. Checking final wallet balance...');
  try {
    const response = await axios.get(`${API_BASE}/buddy-coins`, { headers });
    const finalBalance = response.data.data?.balance || 0;
    console.log('✅ Final wallet balance:', finalBalance);
    console.log('💰 Balance change:', finalBalance - userBalance);
  } catch (error) {
    console.log('❌ Failed to get final wallet balance:', error.response?.data?.message || error.message);
  }

  console.log('\n🏁 Edge case testing completed!');
}

testEdgeCases().catch(console.error);
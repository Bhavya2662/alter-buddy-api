const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTNhZjM3NjRiM2FlOWFiNzQ4NWEwZCIsImlhdCI6MTc1NTUxMjcyMSwiZXhwIjoxNzU4MTA0NzIxfQ.w-58WVOcaY4r94sDZh0CHXhWFI0UKvnd24QyPkbSjWk';
const mentorId = '6843d13ab2ad92ac25692a2d';

async function testBooking(callType, time, type = 'instant') {
  const payload = {
    mentorId,
    callType,
    time: time.toString(),
    type
  };

  try {
    console.log(`\n🧪 Testing ${callType} booking (${time} mins, ${type})...`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.put('http://localhost:8080/api/1.0/slot/book', payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.statusText);
    console.error('Error data:', error.response?.data);
    return null;
  }
}

async function testUserWallet() {
  try {
    console.log('\n💰 Checking user wallet...');
    const response = await axios.get('http://localhost:8080/api/1.0/wallet/balance', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Wallet balance:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Wallet error:', error.response?.status, error.response?.statusText);
    console.error('Error data:', error.response?.data);
    return null;
  }
}

async function testUserCalls() {
  try {
    console.log('\n📞 Fetching user call history...');
    const response = await axios.get('http://localhost:8080/api/1.0/user/calls', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ User calls:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Calls error:', error.response?.status, error.response?.statusText);
    console.error('Error data:', error.response?.data);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive booking tests...\n');
  
  // Check initial wallet balance
  await testUserWallet();
  
  // Test different session types
  const tests = [
    { callType: 'chat', time: 5 },
    { callType: 'chat', time: 10 },
    { callType: 'audio', time: 15 },
    { callType: 'audio', time: 30 },
    { callType: 'video', time: 15 },
    { callType: 'video', time: 30 }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testBooking(test.callType, test.time);
    results.push({ ...test, success: !!result, result });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Check final wallet balance
  await testUserWallet();
  
  // Check user call history
  await testUserCalls();
  
  // Summary
  console.log('\n📊 Test Summary:');
  results.forEach(test => {
    const status = test.success ? '✅' : '❌';
    console.log(`${status} ${test.callType} (${test.time} mins): ${test.success ? 'SUCCESS' : 'FAILED'}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Overall: ${successCount}/${results.length} tests passed`);
}

runAllTests().catch(console.error);
const axios = require('axios');
const config = require('config');
const mongoose = require('mongoose');

// Base URL for API
const BASE_URL = 'http://localhost:8080/api/1.0';

// Test user data - using existing test users
const testUsers = [
  {
    name: 'Test User',
    mobileOrEmail: 'testuser@example.com',
    password: 'password123',
    mobile: '9876543210'
  },
  {
    name: 'Bhavya Sharma', 
    mobileOrEmail: 'bhavyasharma2662@gmail.com',
    password: 'password123',
    mobile: '7023962764'
  }
];

let authTokens = {};
let mentorList = [];
let userWallets = {};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (method, url, data = null, token) => {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  return await axios(config);
};

// Test 1: User Registration
async function testUserRegistration() {
  console.log('\n=== Testing User Registration ===');
  
  for (const user of testUsers) {
    try {
      console.log(`\nTesting registration for: ${user.mobileOrEmail}`);
      
      const response = await axios.put(`${BASE_URL}/sign-up`, {
        name: user.name,
        mobileOrEmail: user.mobileOrEmail,
        password: user.password,
        mobile: user.mobile
      });
      
      console.log(`✅ Registration successful for ${user.mobileOrEmail}`);
      console.log(`Response status: ${response.status}`);
      
      if (response.data.data && response.data.data.token) {
        console.log(`✅ Token received: ${response.data.data.token.substring(0, 20)}...`);
      }
      
    } catch (error) {
      if (error.response && error.response.status === 400 && error.response.data.message.includes('already exists')) {
        console.log(`ℹ️  User ${user.mobileOrEmail} already exists - this is expected`);
      } else {
        console.error(`❌ Registration failed for ${user.mobileOrEmail}:`);
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
      }
    }
  }
}

// Test 2: User Login
async function testUserLogin() {
  console.log('\n=== Testing User Login ===');
  
  for (const user of testUsers) {
    try {
      console.log(`\nTesting login for: ${user.mobileOrEmail}`);
      
      const response = await axios.put(`${BASE_URL}/sign-in`, {
        mobileOrEmail: user.mobileOrEmail,
        password: user.password
      });
      
      console.log(`✅ Login successful for ${user.mobileOrEmail}`);
      console.log(`Response status: ${response.status}`);
      
      if (response.data.data && response.data.data.token) {
        authTokens[user.mobileOrEmail] = response.data.data.token;
        console.log(`✅ Token stored: ${response.data.data.token.substring(0, 20)}...`);
      }
      
    } catch (error) {
      console.error(`❌ Login failed for ${user.mobileOrEmail}:`);
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
    }
  }
}

// Test 3: Mentor Browsing and Search
async function testMentorBrowsing() {
  console.log('\n=== Testing Mentor Browsing ===');
  
  const token = Object.values(authTokens)[0];
  if (!token) {
    console.error('❌ No auth token available for mentor browsing test');
    return;
  }
  
  try {
    // Test mentor list
    console.log('\nTesting mentor list retrieval...');
    const mentorResponse = await makeAuthenticatedRequest('GET', '/mentor', null, token);
    
    console.log(`✅ Mentor list retrieved successfully`);
    console.log(`Response status: ${mentorResponse.status}`);
    console.log(`Number of mentors: ${mentorResponse.data.data?.length || 0}`);
    
    if (mentorResponse.data.data && mentorResponse.data.data.length > 0) {
      mentorList = mentorResponse.data.data;
      console.log(`✅ First mentor: ${mentorList[0].name || 'Unknown'}`);
    }
    
  } catch (error) {
    console.error('❌ Mentor browsing failed:', error.response?.data || error.message);
  }
}

// Test 4: Buddy Coins Wallet
async function testBuddyCoinsWallet() {
  console.log('\n=== Testing Buddy Coins Wallet ===');
  
  for (const [email, token] of Object.entries(authTokens)) {
    try {
      console.log(`\nTesting wallet for: ${email}`);
      
      const walletResponse = await makeAuthenticatedRequest('GET', '/buddy-coins', null, token);
      
      console.log(`✅ Wallet retrieved successfully for ${email}`);
      console.log(`Response status: ${walletResponse.status}`);
      console.log(`Current balance: $${walletResponse.data.data?.balance || 0}`);
      
      userWallets[email] = walletResponse.data.data?.balance || 0;
      
    } catch (error) {
      console.error(`❌ Wallet retrieval failed for ${email}:`, error.response?.data || error.message);
    }
  }
}

// Test 5: Buddy Coins Recharge
async function testBuddyCoinsRecharge() {
  console.log('\n=== Testing Buddy Coins Recharge ===');
  
  const email = Object.keys(authTokens)[0];
  const token = authTokens[email];
  
  if (!token) {
    console.error('❌ No auth token available for recharge test');
    return;
  }
  
  try {
    console.log(`\nTesting recharge for: ${email}`);
    
    const rechargeResponse = await makeAuthenticatedRequest('POST', '/buddy-coins/recharge', {
      amount: 100,
      paymentMethod: 'test'
    }, token);
    
    console.log(`✅ Recharge initiated successfully`);
    console.log(`Response status: ${rechargeResponse.status}`);
    
    // Check updated balance
    const updatedWalletResponse = await makeAuthenticatedRequest('GET', '/buddy-coins', null, token);
    const newBalance = updatedWalletResponse.data.data?.balance || 0;
    console.log(`✅ Updated balance: $${newBalance}`);
    
    userWallets[email] = newBalance;
    
  } catch (error) {
    console.error('❌ Recharge failed:', error.response?.data || error.message);
  }
}

// Test 6: Chat Session Booking
async function testChatBooking() {
  console.log('\n=== Testing Chat Session Booking ===');
  
  const email = Object.keys(authTokens)[0];
  const token = authTokens[email];
  
  if (!token || mentorList.length === 0) {
    console.error('❌ No auth token or mentors available for chat booking test');
    return;
  }
  
  try {
    const mentor = mentorList[0];
    console.log(`\nTesting chat booking with mentor: ${mentor.name || 'Unknown'}`);
    
    const initialBalance = userWallets[email] || 0;
    console.log(`Initial balance: $${initialBalance}`);
    
    const bookingResponse = await makeAuthenticatedRequest('PUT', '/slot/book', {
      mentorId: mentor._id,
      callType: 'chat',
      time: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
      type: 'chat'
    }, token);
    
    console.log(`✅ Chat booking successful`);
    console.log(`Response status: ${bookingResponse.status}`);
    
    // Check updated balance
    const updatedWalletResponse = await makeAuthenticatedRequest('GET', '/buddy-coins', null, token);
    const newBalance = updatedWalletResponse.data.data?.balance || 0;
    const deducted = initialBalance - newBalance;
    
    console.log(`✅ Updated balance: $${newBalance}`);
    console.log(`✅ Amount deducted: $${deducted}`);
    
    userWallets[email] = newBalance;
    
  } catch (error) {
    console.error('❌ Chat booking failed:', error.response?.data || error.message);
  }
}

// Test 7: Audio Call Booking
async function testAudioBooking() {
  console.log('\n=== Testing Audio Call Booking ===');
  
  const email = Object.keys(authTokens)[0];
  const token = authTokens[email];
  
  if (!token || mentorList.length === 0) {
    console.error('❌ No auth token or mentors available for audio booking test');
    return;
  }
  
  try {
    const mentor = mentorList[0];
    console.log(`\nTesting audio booking with mentor: ${mentor.name || 'Unknown'}`);
    
    const initialBalance = userWallets[email] || 0;
    console.log(`Initial balance: $${initialBalance}`);
    
    const bookingResponse = await makeAuthenticatedRequest('PUT', '/slot/book', {
      mentorId: mentor._id,
      callType: 'audio',
      time: new Date(Date.now() + 120000).toISOString(), // 2 minutes from now
      type: 'audio'
    }, token);
    
    console.log(`✅ Audio booking successful`);
    console.log(`Response status: ${bookingResponse.status}`);
    
    // Check updated balance
    const updatedWalletResponse = await makeAuthenticatedRequest('GET', '/buddy-coins', null, token);
    const newBalance = updatedWalletResponse.data.data?.balance || 0;
    const deducted = initialBalance - newBalance;
    
    console.log(`✅ Updated balance: $${newBalance}`);
    console.log(`✅ Amount deducted: $${deducted}`);
    
    userWallets[email] = newBalance;
    
  } catch (error) {
    console.error('❌ Audio booking failed:', error.response?.data || error.message);
  }
}

// Test 8: Video Call Booking
async function testVideoBooking() {
  console.log('\n=== Testing Video Call Booking ===');
  
  const email = Object.keys(authTokens)[0];
  const token = authTokens[email];
  
  if (!token || mentorList.length === 0) {
    console.error('❌ No auth token or mentors available for video booking test');
    return;
  }
  
  try {
    const mentor = mentorList[0];
    console.log(`\nTesting video booking with mentor: ${mentor.name || 'Unknown'}`);
    
    const initialBalance = userWallets[email] || 0;
    console.log(`Initial balance: $${initialBalance}`);
    
    const bookingResponse = await makeAuthenticatedRequest('PUT', '/slot/book', {
      mentorId: mentor._id,
      callType: 'video',
      time: new Date(Date.now() + 180000).toISOString(), // 3 minutes from now
      type: 'video'
    }, token);
    
    console.log(`✅ Video booking successful`);
    console.log(`Response status: ${bookingResponse.status}`);
    
    // Check updated balance
    const updatedWalletResponse = await makeAuthenticatedRequest('GET', '/buddy-coins', null, token);
    const newBalance = updatedWalletResponse.data.data?.balance || 0;
    const deducted = initialBalance - newBalance;
    
    console.log(`✅ Updated balance: $${newBalance}`);
    console.log(`✅ Amount deducted: $${deducted}`);
    
    userWallets[email] = newBalance;
    
  } catch (error) {
    console.error('❌ Video booking failed:', error.response?.data || error.message);
  }
}

// Test 9: Insufficient Funds Scenario
async function testInsufficientFunds() {
  console.log('\n=== Testing Insufficient Funds Scenario ===');
  
  const email = Object.keys(authTokens)[1] || Object.keys(authTokens)[0]; // Use second user or first if only one
  const token = authTokens[email];
  
  if (!token || mentorList.length === 0) {
    console.error('❌ No auth token or mentors available for insufficient funds test');
    return;
  }
  
  try {
    const mentor = mentorList[0];
    console.log(`\nTesting insufficient funds scenario with mentor: ${mentor.name || 'Unknown'}`);
    
    const currentBalance = userWallets[email] || 0;
    console.log(`Current balance: $${currentBalance}`);
    
    // Try to book when balance might be insufficient
    const bookingResponse = await makeAuthenticatedRequest('PUT', '/slot/book', {
      mentorId: mentor._id,
      callType: 'video',
      time: new Date(Date.now() + 240000).toISOString(), // 4 minutes from now
      type: 'video'
    }, token);
    
    console.log(`⚠️  Booking succeeded despite potentially insufficient funds`);
    console.log(`Response status: ${bookingResponse.status}`);
    
  } catch (error) {
    if (error.response && error.response.status === 400 && error.response.data.message.includes('insufficient')) {
      console.log(`✅ Insufficient funds error handled correctly`);
    } else {
      console.error('❌ Unexpected error in insufficient funds test:', error.response?.data || error.message);
    }
  }
}

// Test 10: Session Management
async function testSessionManagement() {
  console.log('\n=== Testing Session Management ===');
  
  const email = Object.keys(authTokens)[0];
  const token = authTokens[email];
  
  if (!token) {
    console.error('❌ No auth token available for session management test');
    return;
  }
  
  try {
    console.log(`\nTesting session management for: ${email}`);
    
    // Test getting user sessions
    const sessionsResponse = await makeAuthenticatedRequest('GET', '/buddy-coins/transactions/my', null, token);
    
    console.log(`✅ Sessions retrieved successfully`);
    console.log(`Response status: ${sessionsResponse.status}`);
    console.log(`Number of transactions: ${sessionsResponse.data.data?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Session management test failed:', error.response?.data || error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive User Panel Testing...');
  console.log('================================================');
  
  try {
    // Connect to database
    await mongoose.connect(config.get('DB_PATH'));
    console.log('✅ Connected to database');
    
    // Run all tests in sequence
    await testUserRegistration();
    await testUserLogin();
    await testMentorBrowsing();
    await testBuddyCoinsWallet();
    await testBuddyCoinsRecharge();
    await testChatBooking();
    await testAudioBooking();
    await testVideoBooking();
    await testInsufficientFunds();
    await testSessionManagement();
    
    console.log('\n================================================');
    console.log('🎉 All tests completed!');
    console.log('\n📊 Final Summary:');
    console.log('Auth tokens:', Object.keys(authTokens).length);
    console.log('Mentors found:', mentorList.length);
    console.log('User wallets:', userWallets);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the tests
runAllTests().catch(console.error);
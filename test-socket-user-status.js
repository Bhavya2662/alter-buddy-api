const axios = require('axios');
const io = require('socket.io-client');

const API_BASE_URL = 'http://localhost:8080/api/1.0';
const SOCKET_URL = 'http://localhost:8080';

// Test configuration
const TEST_CONFIG = {
  admin: {
    email: 'admin@alterbuddy.com',
    password: 'admin123'
  },
  user: {
    firstName: 'Test',
    lastName: 'User',
    email: `testuser${Date.now()}@example.com`,
    password: 'TestPassword123!',
    phoneNumber: '+1234567890',
    dateOfBirth: '1990-01-01'
  }
};

let adminToken = null;
let testUserId = null;
let userToken = null;

// Helper function to get user status from API
async function getUserStatus(userId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/website/users`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const users = response.data.data;
    const user = users.find(u => u._id === userId);
    return user ? user.online : null;
  } catch (error) {
    console.error('Error fetching user status:', error.response?.data || error.message);
    return null;
  }
}

// Helper function to create socket connection
function createSocketConnection() {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });
    
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      resolve(socket);
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      reject(error);
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });
  });
}

// Main test function
async function testSocketUserStatus() {
  console.log('🚀 Starting Socket.IO User Status Test\n');
  
  try {
    // Step 1: Admin authentication
    console.log('1️⃣ Authenticating admin...');
    const adminResponse = await axios.put(`${API_BASE_URL}/admin/sign-in`, TEST_CONFIG.admin);
    adminToken = adminResponse.data.data.token;
    console.log('✅ Admin authenticated successfully\n');
    
    // Step 2: Create test user
    console.log('2️⃣ Creating test user...');
    const uniqueMobile = `98765${Math.floor(Math.random() * 90000) + 10000}`;
     const testUser = {
         emails: [TEST_CONFIG.user.email, `backup${Date.now()}@example.com`],
         password: TEST_CONFIG.user.password,
         name: {
           firstName: TEST_CONFIG.user.firstName,
           lastName: TEST_CONFIG.user.lastName
         },
         mobiles: [uniqueMobile]
       };
     console.log('Using mobile number:', uniqueMobile);
    
    const userResponse = await axios.post(`${API_BASE_URL}/sign-up`, testUser);
    console.log('Signup response:', userResponse.data);
    testUserId = userResponse.data.data.user.id;
    console.log('✅ Test user created with ID:', testUserId);
    
    // Step 3: User login
    console.log('3️⃣ Logging in test user...');
    const loginResponse = await axios.put(`${API_BASE_URL}/sign-in`, {
      mobileOrEmail: TEST_CONFIG.user.email,
      password: TEST_CONFIG.user.password
    });
    userToken = loginResponse.data.data.token;
    console.log('✅ Test user logged in successfully\n');
    
    // Step 4: Check initial user status (should be offline)
    console.log('4️⃣ Checking initial user status...');
    let userStatus = await getUserStatus(testUserId);
    console.log('📊 Initial user status:', userStatus ? 'online' : 'offline');
    
    // Step 5: Create socket connection and register user
    console.log('\n5️⃣ Creating socket connection...');
    const socket = await createSocketConnection();
    
    // Register user with socket
    console.log('📝 Registering user with socket...');
    socket.emit('registerUser', { userId: testUserId });
    
    // Wait for registration to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 6: Check user status after socket registration (should be online)
    console.log('6️⃣ Checking user status after socket registration...');
    userStatus = await getUserStatus(testUserId);
    console.log('📊 User status after socket registration:', userStatus ? 'online' : 'offline');
    
    const socketRegistrationSuccess = userStatus === true;
    
    // Step 7: Test manual status update
    console.log('\n7️⃣ Testing manual status update...');
    socket.emit('updateUserStatus', { userId: testUserId, online: false });
    
    // Wait for status update to process
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    userStatus = await getUserStatus(testUserId);
    console.log('📊 User status after manual update:', userStatus ? 'online' : 'offline');
    
    const manualUpdateSuccess = userStatus === false;
    
    // Step 8: Test disconnect behavior
    console.log('\n8️⃣ Testing disconnect behavior...');
    
    // Set user back to online first
    socket.emit('updateUserStatus', { userId: testUserId, online: true });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now disconnect
    socket.disconnect();
    
    // Wait for disconnect to process
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    userStatus = await getUserStatus(testUserId);
    console.log('📊 User status after disconnect:', userStatus ? 'online' : 'offline');
    
    const disconnectSuccess = userStatus === false;
    
    // Test Results Summary
    console.log('\n📋 Socket.IO User Status Test Summary:');
    console.log(` - Socket connection tracking: ${socketRegistrationSuccess ? '✅' : '❌'}`);
    console.log(` - Manual status update: ${manualUpdateSuccess ? '✅' : '❌'}`);
    console.log(` - Disconnect tracking: ${disconnectSuccess ? '✅' : '❌'}`);
    
    const overallSuccess = socketRegistrationSuccess && manualUpdateSuccess && disconnectSuccess;
    console.log(`\n🎯 Overall Result: ${overallSuccess ? '🎉 ALL TESTS PASSED' : '⚠️ SOME SOCKET TESTS FAILED'}`);
    
    if (!overallSuccess) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testSocketUserStatus();
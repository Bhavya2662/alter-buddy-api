const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:8080/api/1.0';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YTJmZmEyZTUwZmIyNDRiYTQ5MDVkZCIsImlhdCI6MTc1NjQ4NjgyOSwiZXhwIjoxNzU5MDc4ODI5fQ.jT8zW9wHPG4-VUngybL7zP7wVpB-ibQYDgIAJjPkP8s';
const USER_ID = '68a2ffa2e50fb244ba4905dd';
const MENTOR_ID = '68a2ffa2e50fb244ba4905dd'; // Using same ID for testing
const CATEGORY_ID = '686f93490ad64a94f5156280'; // Using existing category

// Set up axios defaults
axios.defaults.headers.common['Authorization'] = `Bearer ${JWT_TOKEN}`;

async function testSessionPackages() {
  console.log('🧪 TESTING SESSION PACKAGES');
  console.log('============================================================');

  try {
    // Test 1: Create different types of session packages
    console.log('\n1. Creating session packages...');
    
    const packageTypes = [
      { type: 'chat', totalSessions: 10, price: 2000 },
      { type: 'audio', totalSessions: 5, price: 5000 },
      { type: 'video', totalSessions: 3, price: 4500 }
    ];
    
    const createdPackages = [];
    
    for (const packageData of packageTypes) {
      try {
        const response = await axios.post(`${API_BASE}/session/package`, {
          userId: USER_ID,
          mentorId: MENTOR_ID,
          categoryId: CATEGORY_ID,
          type: packageData.type,
          totalSessions: packageData.totalSessions,
          price: packageData.price,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        });
        
        console.log(`   ✅ Created ${packageData.type} package:`);
        console.log(`      📦 Package ID: ${response.data.data._id}`);
        console.log(`      💰 Price: ${packageData.price} coins`);
        console.log(`      📊 Sessions: ${packageData.totalSessions} total, ${response.data.data.remainingSessions} remaining`);
        console.log(`      📅 Status: ${response.data.data.status}`);
        
        createdPackages.push(response.data.data);
      } catch (error) {
        console.log(`   ❌ Failed to create ${packageData.type} package:`, error.response?.data?.message || error.message);
      }
    }
    
    // Test 2: Get user packages
    console.log('\n2. Fetching user packages...');
    try {
      const response = await axios.get(`${API_BASE}/session/package/${USER_ID}`);
      console.log(`   ✅ Found ${response.data.data.length} packages for user`);
      
      response.data.data.forEach((pkg, index) => {
        console.log(`   📦 Package ${index + 1}:`);
        console.log(`      🆔 ID: ${pkg._id}`);
        console.log(`      🎯 Type: ${pkg.type}`);
        console.log(`      📊 Sessions: ${pkg.remainingSessions}/${pkg.totalSessions}`);
        console.log(`      💰 Price: ${pkg.price} coins`);
        console.log(`      📅 Status: ${pkg.status}`);
      });
    } catch (error) {
      console.log('   ❌ Failed to fetch user packages:', error.response?.data?.message || error.message);
    }
    
    // Test 3: Get packages by type
    console.log('\n3. Testing package filtering by type...');
    for (const type of ['chat', 'audio', 'video']) {
      try {
        const response = await axios.get(`${API_BASE}/session/package/${USER_ID}?type=${type}`);
        console.log(`   ✅ Found ${response.data.data.length} ${type} packages`);
      } catch (error) {
        console.log(`   ❌ Failed to fetch ${type} packages:`, error.response?.data?.message || error.message);
      }
    }
    
    // Test 4: Use sessions from packages
    console.log('\n4. Testing session usage from packages...');
    if (createdPackages.length > 0) {
      for (const pkg of createdPackages) {
        try {
          const response = await axios.put(`${API_BASE}/session/package/use/${pkg._id}`);
          console.log(`   ✅ Used session from ${pkg.type} package:`);
          console.log(`      📊 Remaining sessions: ${response.data.data.remainingSessions}`);
          console.log(`      📅 Status: ${response.data.data.status}`);
        } catch (error) {
          console.log(`   ❌ Failed to use session from ${pkg.type} package:`, error.response?.data?.message || error.message);
        }
      }
    }
    
    // Test 5: Test package booking integration
    console.log('\n5. Testing package-based session booking...');
    if (createdPackages.length > 0) {
      const chatPackage = createdPackages.find(pkg => pkg.type === 'chat');
      if (chatPackage) {
        try {
          // First, let's check if we can book using package logic
          console.log('   📋 Testing chat session booking with package...');
          
          const bookingResponse = await axios.put(`${API_BASE}/slot/book`, {
            mentorId: MENTOR_ID,
            time: '5', // 5 minutes
            callType: 'chat',
            type: 'instant',
            packageId: chatPackage._id // Include package ID if supported
          });
          
          console.log('   ✅ Package-based booking successful!');
          console.log(`      🔗 Meeting link: ${bookingResponse.data.data.guestJoinURL || 'N/A'}`);
          console.log(`      💰 Cost: ${bookingResponse.data.data.totalCost || 'N/A'} coins`);
        } catch (error) {
          console.log('   ❌ Package-based booking failed:', error.response?.data?.message || error.message);
          console.log('   ℹ️  Note: Package integration with booking may need additional implementation');
        }
      }
    }
    
    // Test 6: Get mentor created packages (requires mentor auth)
    console.log('\n6. Testing mentor package management...');
    try {
      const response = await axios.get(`${API_BASE}/mentor/packages/${MENTOR_ID}`);
      console.log(`   ✅ Found ${response.data.data.length} packages created by mentor`);
    } catch (error) {
      console.log('   ❌ Failed to fetch mentor packages:', error.response?.data?.message || error.message);
      console.log('   ℹ️  Note: This endpoint requires mentor authentication');
    }
    
    // Test 7: Test package expiry and status
    console.log('\n7. Testing package expiry logic...');
    if (createdPackages.length > 0) {
      const testPackage = createdPackages[0];
      
      // Use all remaining sessions to test expiry
      console.log(`   📊 Testing expiry for package with ${testPackage.remainingSessions} remaining sessions...`);
      
      for (let i = 0; i < testPackage.remainingSessions; i++) {
        try {
          const response = await axios.put(`${API_BASE}/session/package/use/${testPackage._id}`);
          console.log(`   📉 Session ${i + 1} used, remaining: ${response.data.data.remainingSessions}`);
          
          if (response.data.data.status === 'expired') {
            console.log('   ✅ Package automatically expired when sessions reached 0');
            break;
          }
        } catch (error) {
          console.log(`   ❌ Failed to use session ${i + 1}:`, error.response?.data?.message || error.message);
          break;
        }
      }
    }
    
    console.log('\n🎉 SESSION PACKAGE TESTING COMPLETED!');
    console.log('============================================================');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testSessionPackages().catch(console.error);
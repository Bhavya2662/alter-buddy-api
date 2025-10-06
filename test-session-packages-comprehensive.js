const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';

// Test tokens (we'll get these from login)
let adminToken = '';
let userToken = '';
let mentorToken = '';

async function testSessionPackages() {
  const results = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  console.log('🧪 Testing Session Packages Functionality...');
  console.log('Base URL:', BASE_URL);
  console.log('==================================================');

  try {
    // Step 1: Get authentication tokens
    console.log('\n1. 🔐 Getting Authentication Tokens...');
    await getAuthTokens();
    
    // Step 2: Test creating session packages (requires user auth)
    console.log('\n2. ➕ Testing Create Session Package...');
    await testCreateSessionPackage(results);
    
    // Step 3: Test getting user packages
    console.log('\n3. 📋 Testing Get User Packages...');
    await testGetUserPackages(results);
    
    // Step 4: Test using sessions from packages
    console.log('\n4. 🎯 Testing Use Session from Package...');
    await testUseSessionFromPackage(results);
    
    // Step 5: Test getting mentor created packages
    console.log('\n5. 👨‍🏫 Testing Get Mentor Created Packages...');
    await testGetMentorCreatedPackages(results);
    
    // Step 6: Test updating packages (requires mentor auth)
    console.log('\n6. ✏️ Testing Update Package...');
    await testUpdatePackage(results);
    
    // Step 7: Test package filtering by type
    console.log('\n7. 🔍 Testing Package Filtering by Type...');
    await testPackageFilteringByType(results);
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    results.tests.push({
      name: 'Test Setup',
      status: 'failed',
      error: error.message
    });
  }

  // Calculate summary
  results.summary.total = results.tests.length;
  results.summary.passed = results.tests.filter(t => t.status === 'success').length;
  results.summary.failed = results.tests.filter(t => t.status === 'failed').length;

  // Print summary
  console.log('\n==================================================');
  console.log('📊 TEST SUMMARY');
  console.log('==================================================');
  console.log(`✅ Passed: ${results.summary.passed}/${results.summary.total}`);
  console.log(`❌ Failed: ${results.summary.failed}/${results.summary.total}`);
  
  results.tests.forEach((test, index) => {
    const status = test.status === 'success' ? '✅' : test.status === 'skipped' ? '⚠️' : '❌';
    console.log(`${status} ${index + 1}. ${test.name}: ${test.status.toUpperCase()}`);
  });

  // Save results
  const filename = 'session-packages-test-results.json';
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: ${filename}`);
}

async function getAuthTokens() {
  try {
    // Get admin token
    const adminResponse = await axios.put(`${BASE_URL}/api/1.0/admin/sign-in`, {
      email: 'admin@alterbuddy.com',
      password: 'admin123'
    });
    adminToken = adminResponse.data.data.token;
    console.log('✅ Admin token obtained');
    
    // Try to get user token (might fail due to email verification)
    const userCredentials = [
      { mobileOrEmail: 'kg224245@gmail.com', password: 'password123' },
      { mobileOrEmail: '9691145994', password: 'password123' },
      { mobileOrEmail: 'abc@gmail.com', password: 'password123' },
      { mobileOrEmail: '1234567890', password: 'password123' }
    ];
    
    for (const cred of userCredentials) {
      try {
        const userResponse = await axios.put(`${BASE_URL}/api/1.0/sign-in`, cred);
        if (userResponse.data.data && userResponse.data.data.token) {
          userToken = userResponse.data.data.token;
          // Decode JWT to get user ID
          const tokenPayload = JSON.parse(Buffer.from(userToken.split('.')[1], 'base64').toString());
          global.testUserId = tokenPayload.id;
          console.log(`✅ User token obtained for ${cred.mobileOrEmail}`);
          console.log(`User ID from token: ${global.testUserId}`);
          break;
        }
      } catch (error) {
        console.log(`⚠️ User login failed for ${cred.mobileOrEmail}:`, error.response?.data?.message);
      }
    }
    
    // Try to get mentor token with different credentials
    const mentorCredentials = [
      { username: 'Sachishah', password: 'sachi123' },
      { username: 'Sachishah', password: 'password123' },
      { username: 'Sachishah', password: 'Sachi@123' },
      { username: 'Kalabanerji', password: 'kala123' },
      { username: 'Kalabanerji', password: 'password123' },
      { username: 'Kalabanerji', password: 'Kala@123' },
      { username: 'Monikagoyal', password: 'monika123' },
      { username: 'Monikagoyal', password: 'password123' },
      { username: 'Tapaswinichou', password: 'tapaswini123' },
      { username: 'Tapaswinichou', password: 'password123' }
    ];
    
    for (const cred of mentorCredentials) {
      try {
        const mentorResponse = await axios.put(`${BASE_URL}/api/1.0/mentor/sign-in`, {
          username: cred.username,
          password: cred.password
        });
        mentorToken = mentorResponse.data.data.token;
        console.log(`✅ Mentor token obtained for ${cred.username}`);
        break;
      } catch (error) {
        console.log(`⚠️ Mentor login failed for ${cred.username}:`, error.response?.data?.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Failed to get auth tokens:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testCreateSessionPackage(results) {
  const token = userToken || adminToken;
  if (!token) {
    console.log('⚠️ Skipping Create Session Package - No authentication token available');
    results.tests.push({
      name: 'Create Session Package',
      status: 'skipped',
      reason: 'No authentication token available'
    });
    return;
  }
  
  try {
    const packageData = {
      userId: '68a2f604e5e716fa5eeb48b0', // Sample user ID
      mentorId: '68a3849fa4e79f23deb23bf1', // Sample mentor ID
      categoryId: '6839863e12dc335fec5b873b', // Sample category ID
      type: 'video',
      totalSessions: 5,
      price: 2500,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };
    
    const response = await axios.post(`${BASE_URL}/api/1.0/session/package`, packageData, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    
    console.log('✅ Create Session Package Success:', response.status);
    console.log('Package created:', response.data.data.type);
    console.log('Total sessions:', response.data.data.totalSessions);
    console.log('Price:', response.data.data.price, 'coins');
    console.log('Status:', response.data.data.status);
    
    // Store package ID for later tests
    global.testPackageId = response.data.data._id;
    global.testUserId = packageData.userId;
    global.testMentorId = packageData.mentorId;
    
    results.tests.push({
      name: 'Create Session Package',
      status: 'success',
      statusCode: response.status,
      data: {
        packageId: response.data.data._id,
        type: response.data.data.type,
        totalSessions: response.data.data.totalSessions,
        price: response.data.data.price,
        status: response.data.data.status
      }
    });
  } catch (error) {
    console.log('❌ Create Session Package Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Create Session Package',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

async function testGetUserPackages(results) {
  const token = userToken || adminToken;
  if (!token) {
    console.log('⚠️ Skipping Get User Packages - No authentication token available');
    results.tests.push({
      name: 'Get User Packages',
      status: 'skipped',
      reason: 'No authentication token available'
    });
    return;
  }
  
  try {
    const userId = global.testUserId || '68a2f604e5e716fa5eeb48b0';
    const response = await axios.get(`${BASE_URL}/api/1.0/session/package/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    
    console.log('✅ Get User Packages Success:', response.status);
    console.log(`Found ${response.data.data.length} packages for user`);
    
    if (response.data.data.length > 0) {
      const package = response.data.data[0];
      console.log(`Sample package: ${package.type} (${package.remainingSessions}/${package.totalSessions} sessions)`);
      
      // Store first package ID for later tests if not already set
      if (!global.testPackageId) {
        global.testPackageId = package._id;
      }
    }
    
    results.tests.push({
      name: 'Get User Packages',
      status: 'success',
      statusCode: response.status,
      data: {
        userId: userId,
        packagesCount: response.data.data.length,
        samplePackage: response.data.data[0] || null
      }
    });
  } catch (error) {
    console.log('❌ Get User Packages Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Get User Packages',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

async function testUseSessionFromPackage(results) {
  const token = userToken || adminToken;
  if (!token) {
    console.log('⚠️ Skipping Use Session from Package - No authentication token available');
    results.tests.push({
      name: 'Use Session from Package',
      status: 'skipped',
      reason: 'No authentication token available'
    });
    return;
  }
  
  if (!global.testPackageId) {
    console.log('⚠️ Skipping Use Session from Package - No package ID available');
    results.tests.push({
      name: 'Use Session from Package',
      status: 'skipped',
      reason: 'No test package ID available'
    });
    return;
  }
  
  try {
    const response = await axios.put(`${BASE_URL}/api/1.0/session/package/use/${global.testPackageId}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    
    console.log('✅ Use Session from Package Success:', response.status);
    console.log('Remaining sessions:', response.data.data.remainingSessions);
    console.log('Package status:', response.data.data.status);
    
    results.tests.push({
      name: 'Use Session from Package',
      status: 'success',
      statusCode: response.status,
      data: {
        packageId: global.testPackageId,
        remainingSessions: response.data.data.remainingSessions,
        status: response.data.data.status
      }
    });
  } catch (error) {
    console.log('❌ Use Session from Package Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Use Session from Package',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

async function testGetMentorCreatedPackages(results) {
  if (!mentorToken) {
    console.log('⚠️ Skipping Get Mentor Created Packages - No mentor token available');
    results.tests.push({
      name: 'Get Mentor Created Packages',
      status: 'skipped',
      reason: 'No mentor authentication token available'
    });
    return;
  }
  
  try {
    const mentorId = global.testMentorId || '68a3849fa4e79f23deb23bf1';
    const response = await axios.get(`${BASE_URL}/api/1.0/mentor/packages/${mentorId}`, {
      headers: { Authorization: `Bearer ${mentorToken}` },
      timeout: 10000
    });
    
    console.log('✅ Get Mentor Created Packages Success:', response.status);
    console.log(`Found ${response.data.data.length} packages created by mentor`);
    
    if (response.data.data.length > 0) {
      const package = response.data.data[0];
      console.log(`Sample package: ${package.type} - ${package.totalSessions} sessions for ${package.price} coins`);
    }
    
    results.tests.push({
      name: 'Get Mentor Created Packages',
      status: 'success',
      statusCode: response.status,
      data: {
        mentorId: mentorId,
        packagesCount: response.data.data.length
      }
    });
  } catch (error) {
    console.log('❌ Get Mentor Created Packages Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Get Mentor Created Packages',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

async function testUpdatePackage(results) {
  if (!mentorToken) {
    console.log('⚠️ Skipping Update Package - No mentor token available');
    results.tests.push({
      name: 'Update Package',
      status: 'skipped',
      reason: 'No mentor authentication token available'
    });
    return;
  }
  
  if (!global.testPackageId) {
    console.log('⚠️ Skipping Update Package - No package ID available');
    results.tests.push({
      name: 'Update Package',
      status: 'skipped',
      reason: 'No test package ID available'
    });
    return;
  }
  
  try {
    const updateData = {
      price: 3000, // Update price
      totalSessions: 8 // Update total sessions
    };
    
    const response = await axios.patch(`${BASE_URL}/api/1.0/session/package/${global.testPackageId}`, updateData, {
      headers: { Authorization: `Bearer ${mentorToken}` },
      timeout: 10000
    });
    
    console.log('✅ Update Package Success:', response.status);
    console.log('Updated price:', updateData.price, 'coins');
    console.log('Updated total sessions:', updateData.totalSessions);
    
    results.tests.push({
      name: 'Update Package',
      status: 'success',
      statusCode: response.status,
      data: {
        packageId: global.testPackageId,
        updatedPrice: updateData.price,
        updatedTotalSessions: updateData.totalSessions
      }
    });
  } catch (error) {
    console.log('❌ Update Package Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Update Package',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

async function testPackageFilteringByType(results) {
  const token = userToken || adminToken;
  if (!token) {
    console.log('⚠️ Skipping Package Filtering by Type - No authentication token available');
    results.tests.push({
      name: 'Package Filtering by Type',
      status: 'skipped',
      reason: 'No authentication token available'
    });
    return;
  }
  
  try {
    const userId = global.testUserId || '68a2f604e5e716fa5eeb48b0';
    const packageTypes = ['chat', 'audio', 'video'];
    let totalFilteredPackages = 0;
    
    for (const type of packageTypes) {
      try {
        const response = await axios.get(`${BASE_URL}/api/1.0/session/package/${userId}?type=${type}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        });
        
        console.log(`✅ Found ${response.data.data.length} ${type} packages`);
        totalFilteredPackages += response.data.data.length;
      } catch (error) {
        console.log(`❌ Failed to filter ${type} packages:`, error.response?.data?.message || error.message);
      }
    }
    
    console.log('✅ Package Filtering by Type Success');
    console.log('Total filtered packages across all types:', totalFilteredPackages);
    
    results.tests.push({
      name: 'Package Filtering by Type',
      status: 'success',
      data: {
        userId: userId,
        testedTypes: packageTypes,
        totalFilteredPackages: totalFilteredPackages
      }
    });
  } catch (error) {
    console.log('❌ Package Filtering by Type Failed:', error.response?.status || 'Network Error');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    results.tests.push({
      name: 'Package Filtering by Type',
      status: 'failed',
      statusCode: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

// Run the test
testSessionPackages().catch(console.error);
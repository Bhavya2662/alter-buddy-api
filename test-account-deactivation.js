const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const BASE_URL = 'http://localhost:8080/api/1.0';

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@alterbuddy.com',
  password: 'admin123'
};

let TEST_USER_CREDENTIALS = {
  mobileOrEmail: 'testuser@example.com',
  password: 'TestUser@123'
};

let adminToken = null;
let testUserId = null;
let testUserData = null;

async function adminSignIn() {
  try {
    console.log('\n=== ADMIN SIGN IN ===');
    const response = await axios.put(`${BASE_URL}/admin/sign-in`, ADMIN_CREDENTIALS, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      adminToken = response.data.data.token;
      console.log('✅ Admin signed in successfully');
      return adminToken;
    } else {
      throw new Error(response.data.message || 'Admin sign in failed');
    }
  } catch (error) {
    console.error('❌ Admin sign in error:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function createTestUser() {
  try {
    console.log('\n=== CREATING TEST USER ===');
    const timestamp = Date.now();
    const userData = {
      emails: [`testuser${timestamp}@example.com`, `testuser${timestamp}b@example.com`],
      mobiles: [`987654${timestamp.toString().slice(-4)}`],
      password: 'TestUser@123',
      name: {
        firstName: 'test',
        lastName: 'user'
      }
    };
    
    // Store user data globally and update credentials
    testUserData = userData;
    TEST_USER_CREDENTIALS.mobileOrEmail = userData.emails[0];
    
    const response = await axios.post(`${BASE_URL}/sign-up`, userData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      testUserId = response.data.data.userId || response.data.data.user?.id;
      console.log('✅ Test user created successfully with ID:', testUserId);
      return testUserId;
    } else {
      throw new Error(response.data.message || 'User creation failed');
    }
  } catch (error) {
    if (error.response?.data?.message?.includes('already exists')) {
      console.log('ℹ️ Test user already exists, fetching user ID...');
      // Get user ID from existing user
      const users = await getAllUsers();
      const existingUser = users.find(u => u.emails && u.emails.includes(userData.emails[0]));
      if (existingUser) {
        testUserId = existingUser._id;
        console.log('✅ Found existing test user with ID:', testUserId);
        return testUserId;
      }
    }
    console.error('❌ User creation error:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function getAllUsers() {
  try {
    const response = await axios.get(`${BASE_URL}/website/users`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to get users');
    }
  } catch (error) {
    console.error('❌ Error getting users:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testUserSignIn() {
  try {
    console.log('\n=== TESTING USER SIGN IN (BEFORE DEACTIVATION) ===');
    const response = await axios.put(`${BASE_URL}/sign-in`, TEST_USER_CREDENTIALS, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ User signed in successfully:', response.data.data.message);
      return true;
    } else {
      throw new Error(response.data.message || 'User sign in failed');
    }
  } catch (error) {
    console.error('❌ User sign in error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function deactivateUser(type = 'temporary', reason = 'Testing account deactivation') {
  try {
    console.log(`\n=== DEACTIVATING USER (${type.toUpperCase()}) ===`);
    const response = await axios.put(`${BASE_URL}/website/users/${testUserId}/deactivate`, {
      type: type,
      reason: reason
    }, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ User deactivated successfully:', response.data.data.message);
      console.log('📋 Deactivation details:', {
        type: response.data.data.user.deactivation.type,
        reason: response.data.data.user.deactivation.reason,
        deactivatedAt: response.data.data.user.deactivation.deactivatedAt,
        reactivationDate: response.data.data.user.deactivation.reactivationDate
      });
      return true;
    } else {
      throw new Error(response.data.message || 'User deactivation failed');
    }
  } catch (error) {
    console.error('❌ User deactivation error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testUserSignInAfterDeactivation() {
  try {
    console.log('\n=== TESTING USER SIGN IN (AFTER DEACTIVATION) ===');
    const response = await axios.put(`${BASE_URL}/sign-in`, TEST_USER_CREDENTIALS, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('❌ UNEXPECTED: User should not be able to sign in after deactivation');
      return false;
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    if (errorMessage.includes('deactivated') || errorMessage.includes('suspended')) {
      console.log('✅ EXPECTED: User correctly blocked from signing in');
      console.log('📋 Error message:', errorMessage);
      return true;
    } else {
      console.error('❌ Unexpected error:', errorMessage);
      return false;
    }
  }
}

async function reactivateUser() {
  try {
    console.log('\n=== REACTIVATING USER ===');
    const response = await axios.put(`${BASE_URL}/website/users/${testUserId}/reactivate`, {}, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ User reactivated successfully:', response.data.data.message);
      return true;
    } else {
      throw new Error(response.data.message || 'User reactivation failed');
    }
  } catch (error) {
    console.error('❌ User reactivation error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testUserSignInAfterReactivation() {
  try {
    console.log('\n=== TESTING USER SIGN IN (AFTER REACTIVATION) ===');
    const response = await axios.put(`${BASE_URL}/sign-in`, TEST_USER_CREDENTIALS, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ User signed in successfully after reactivation:', response.data.data.message);
      return true;
    } else {
      throw new Error(response.data.message || 'User sign in failed');
    }
  } catch (error) {
    console.error('❌ User sign in error after reactivation:', error.response?.data?.message || error.message);
    return false;
  }
}

async function getDeactivatedUsers() {
  try {
    console.log('\n=== GETTING DEACTIVATED USERS ===');
    const response = await axios.get(`${BASE_URL}/website/deactivated-users`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Retrieved deactivated users:', response.data.data.length, 'users found');
      response.data.data.forEach((user, index) => {
        console.log(`📋 User ${index + 1}:`, {
          id: user._id,
          email: user.email,
          deactivationType: user.deactivation?.type,
          reason: user.deactivation?.reason,
          deactivatedAt: user.deactivation?.deactivatedAt
        });
      });
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to get deactivated users');
    }
  } catch (error) {
    console.error('❌ Error getting deactivated users:', error.response?.data?.message || error.message);
    return [];
  }
}

async function runAccountDeactivationTests() {
  try {
    console.log('🚀 Starting Account Deactivation Tests...');
    
    // Step 1: Admin sign in
    await adminSignIn();
    
    // Step 2: Create or get test user
    await createTestUser();
    
    // Step 3: Test normal user sign in
    await testUserSignIn();
    
    // Step 4: Test temporary deactivation
    await deactivateUser('temporary', 'Testing temporary suspension functionality');
    
    // Step 5: Test sign in after deactivation (should fail)
    await testUserSignInAfterDeactivation();
    
    // Step 6: Get deactivated users list
    await getDeactivatedUsers();
    
    // Step 7: Reactivate user
    await reactivateUser();
    
    // Step 8: Test sign in after reactivation (should work)
    await testUserSignInAfterReactivation();
    
    // Step 9: Test permanent deactivation
    await deactivateUser('permanent', 'Testing permanent deactivation functionality');
    
    // Step 10: Test sign in after permanent deactivation (should fail with different message)
    await testUserSignInAfterDeactivation();
    
    // Step 11: Final reactivation for cleanup
    await reactivateUser();
    
    console.log('\n🎉 ALL ACCOUNT DEACTIVATION TESTS COMPLETED!');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
  } finally {
    process.exit(0);
  }
}

// Run the tests
runAccountDeactivationTests();
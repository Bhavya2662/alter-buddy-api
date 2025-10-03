const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:8080/api/1.0';
const TEST_MENTOR_ID = '68736084e846910f077f3d5e';

// Test user credentials for first-time pricing (with timestamp to ensure uniqueness)
const timestamp = Date.now();
const NEW_TEST_USER = {
  emails: [`firsttimeuser${timestamp}@example.com`, `firsttimeuser${timestamp}2@example.com`],
  password: 'password123',
  name: {
    firstName: 'First',
    lastName: 'Time'
  },
  mobiles: [`+123456${timestamp.toString().slice(-4)}`]
};

let newUserToken = null;
let newUserId = null;

async function testFirstTimePricing() {
  console.log('🎯 Testing First-Time User Pricing Model');
  console.log('=====================================');
  
  try {
    // Step 1: Create a new user account
    console.log('\n1. Creating new user account...');
    try {
      const signUpResponse = await axios.post(`${API_BASE_URL}/sign-up`, {
        emails: NEW_TEST_USER.emails,
        password: NEW_TEST_USER.password,
        name: NEW_TEST_USER.name,
        mobiles: NEW_TEST_USER.mobiles
      });
      
      console.log('✅ New user created successfully');
      console.log('   Response:', JSON.stringify(signUpResponse.data, null, 2));
      newUserId = signUpResponse.data.data.userId;
      newUserToken = signUpResponse.data.data.token;
      console.log(`   User ID: ${newUserId}`);
      console.log(`   Token: ${newUserToken.substring(0, 50)}...`);
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️ User already exists, proceeding with sign-in...');
        // For existing user, we'll skip the first-time pricing test
        console.log('⚠️ Cannot test first-time pricing with existing user');
        return;
      } else {
        console.log('❌ Sign-up error:', error.response?.data || error.message);
        throw error;
      }
    }
    
    // Step 2: User is already signed in from registration
    console.log('\n2. User already signed in from registration');
    console.log('✅ User token obtained from registration');
    console.log(`   User ID: ${newUserId}`);
    console.log(`   Token: ${newUserToken.substring(0, 50)}...`);
    
    // Step 3: Add some balance to the user's wallet using script
    console.log('\n3. Adding balance to user wallet using script...');
    try {
      const { addWalletBalanceToNewUser } = require('./add-balance-to-new-user.js');
      const balanceAdded = await addWalletBalanceToNewUser(newUserId);
      
      if (balanceAdded) {
        console.log('✅ Added $1000 to wallet successfully');
      } else {
        console.log('⚠️ Could not add balance, proceeding with existing balance');
      }
    } catch (error) {
      console.log('⚠️ Balance script failed:', error.message);
      console.log('   Proceeding with existing balance');
    }
    
    // Step 4: Test first-time chat booking (should be 1 rupee for 5 minutes)
    console.log('\n4. Testing first-time chat booking (5 minutes)...');
    const firstChatBooking = await axios.put(`${API_BASE_URL}/slot/book`, {
      mentorId: TEST_MENTOR_ID,
      callType: 'chat',
      time: '5',
      type: 'instant'
    }, {
      headers: {
        'Authorization': `Bearer ${newUserToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (firstChatBooking.data.success) {
      const totalCost = firstChatBooking.data.data.totalCost;
      const paymentAmount = firstChatBooking.data.data.payment?.amount;
      
      console.log('✅ First chat booking successful!');
      console.log(`   💰 Total Cost: ${totalCost}`);
      console.log(`   💳 Payment Amount: ${paymentAmount}`);
      console.log(`   🎯 Expected: 1 rupee for first 5 minutes`);
      
      if (totalCost === 1 || paymentAmount === 1) {
        console.log('🎉 FIRST-TIME PRICING WORKING: 1 rupee for 5 minutes!');
      } else {
        console.log(`⚠️ First-time pricing may not be working. Expected 1, got ${totalCost || paymentAmount}`);
      }
    } else {
      console.log('❌ First chat booking failed:', firstChatBooking.data.message);
    }
    
    // Step 5: Test second chat booking (should be regular price)
    console.log('\n5. Testing second chat booking (5 minutes)...');
    const secondChatBooking = await axios.put(`${API_BASE_URL}/slot/book`, {
      mentorId: TEST_MENTOR_ID,
      callType: 'chat',
      time: '5',
      type: 'instant'
    }, {
      headers: {
        'Authorization': `Bearer ${newUserToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (secondChatBooking.data.success) {
      const totalCost = secondChatBooking.data.data.totalCost;
      const paymentAmount = secondChatBooking.data.data.payment?.amount;
      
      console.log('✅ Second chat booking successful!');
      console.log(`   💰 Total Cost: ${totalCost}`);
      console.log(`   💳 Payment Amount: ${paymentAmount}`);
      console.log(`   🎯 Expected: Regular pricing (not 1 rupee)`);
      
      if (totalCost > 1 && paymentAmount > 1) {
        console.log('✅ Regular pricing applied for second booking!');
      } else {
        console.log(`⚠️ Second booking still showing first-time pricing: ${totalCost || paymentAmount}`);
      }
    } else {
      console.log('❌ Second chat booking failed:', secondChatBooking.data.message);
    }
    
    // Step 6: Test different session types for first-time pricing
    console.log('\n6. Testing first-time pricing for different session types...');
    
    const sessionTypes = ['audio', 'video'];
    for (const sessionType of sessionTypes) {
      console.log(`\n   Testing ${sessionType} session...`);
      try {
        const sessionBooking = await axios.put(`${API_BASE_URL}/slot/book`, {
          mentorId: TEST_MENTOR_ID,
          callType: sessionType,
          time: '5',
          type: 'instant'
        }, {
          headers: {
            'Authorization': `Bearer ${newUserToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (sessionBooking.data.success) {
          const totalCost = sessionBooking.data.data.totalCost;
          const paymentAmount = sessionBooking.data.data.payment?.amount;
          
          console.log(`   ✅ ${sessionType} booking successful!`);
          console.log(`   💰 Total Cost: ${totalCost}`);
          console.log(`   💳 Payment Amount: ${paymentAmount}`);
          
          if (totalCost === 1 || paymentAmount === 1) {
            console.log(`   🎉 First-time pricing applied to ${sessionType}!`);
          } else {
            console.log(`   ℹ️ Regular pricing for ${sessionType}: ${totalCost || paymentAmount}`);
          }
        } else {
          console.log(`   ❌ ${sessionType} booking failed:`, sessionBooking.data.message);
        }
      } catch (error) {
        console.log(`   ❌ ${sessionType} booking error:`, error.response?.data?.message || error.message);
      }
    }
    
    // Step 7: Check transaction history via API
    console.log('\n7. Checking transaction history via API...');
    try {
      const transactionResponse = await axios.get(`${API_BASE_URL}/wallet/transactions`, {
        headers: {
          'Authorization': `Bearer ${newUserToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (transactionResponse.data.success) {
        const transactions = transactionResponse.data.data;
        console.log(`   📊 Found ${transactions.length} transactions:`);
        transactions.slice(0, 5).forEach((transaction, index) => {
          console.log(`   ${index + 1}. ${transaction.transactionType} - $${transaction.debitAmt} - ${transaction.createdAt}`);
        });
      } else {
        console.log('   ⚠️ Could not fetch transaction history');
      }
    } catch (error) {
      console.log('   ⚠️ Transaction API not available');
    }
    
    console.log('\n🏁 First-time pricing test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  } finally {
    console.log('\n🔄 Test cleanup completed');
  }
}

// Run the test
if (require.main === module) {
  testFirstTimePricing();
}

module.exports = { testFirstTimePricing };
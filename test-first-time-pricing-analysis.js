const axios = require('axios');
const mongoose = require('mongoose');
const config = require('config');
require('dotenv').config();

// Database models - using simplified schemas since TypeScript models need compilation

// Define User schema
const UserSchema = new mongoose.Schema({
  name: {
    firstName: String,
    lastName: String
  },
  email: { type: String, unique: true },
  password: String,
  mobile: String,
  isVerified: { type: Boolean, default: false },
  acType: { type: String, default: 'USER' },
  block: { type: Boolean, default: false },
  online: { type: Boolean, default: false },
  wallet: { type: Number, default: 0 },
}, { timestamps: true });

// MentorCall schema
const MentorCallSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  callType: String,
  time: String,
  totalCost: Number,
  paymentMethod: String,
  status: String,
}, { timestamps: true });

// UserWallet schema
const UserWalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  transactionType: String,
  description: String,
}, { timestamps: true });

// BuddyCoins schema
const BuddyCoinsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  balance: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const MentorCall = mongoose.model('MentorCall', MentorCallSchema);
const UserWallet = mongoose.model('UserWallet', UserWalletSchema);
const BuddyCoins = mongoose.model('BuddyCoins', BuddyCoinsSchema);

const BASE_URL = 'http://localhost:8080/api/1.0';

// Test configuration
const TEST_CONFIG = {
  user: {
    email: `firsttimeanalysis${Date.now()}@example.com`,
    password: 'password123',
    name: 'First Time Analysis User'
  },
  mentor: {
    id: '6843d13ab2ad92ac25692a2d' // Known mentor ID from payment notifications
  },
  expectedFirstTimePrice: 1, // 1 rupee for first 5 minutes
  regularChatPrice: 10 // Regular chat price per 5 minutes
};

let userToken = null;
let userId = null;

async function connectDatabase() {
  try {
    await mongoose.connect(config.get('DB_PATH'), {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function registerAndLoginUser() {
  console.log('\n1. Registering new user for first-time pricing test...');
  
  try {
    // Register new user
    const registerResponse = await axios.post(`${BASE_URL}/sign-up`, {
      emails: [TEST_CONFIG.user.email, `backup${Date.now()}@example.com`],
      password: TEST_CONFIG.user.password,
      name: {
        firstName: TEST_CONFIG.user.name.split(' ')[0],
        lastName: TEST_CONFIG.user.name.split(' ')[1] || 'User'
      },
      mobiles: [`9${Math.floor(Math.random() * 1000000000)}`]
    });
    
    if (registerResponse.data.success || registerResponse.data.status_code === 'Ok') {
      userToken = registerResponse.data.data.token;
      userId = registerResponse.data.data.userId || registerResponse.data.data.user?._id;
      console.log('✅ User registered successfully');
      console.log(`   User ID: ${userId}`);
      console.log(`   Email: ${TEST_CONFIG.user.email}`);
      console.log('   Full response:', JSON.stringify(registerResponse.data, null, 2));
      return true;
    }
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data || error.message);
    return false;
  }
}

async function addWalletBalance() {
  console.log('\n2. Adding wallet balance...');
  
  try {
    // Check if BuddyCoins entry exists for user
    let userWallet = await BuddyCoins.findOne({ userId });
    
    if (userWallet) {
      // Update existing wallet
      userWallet.balance = 1000;
      await userWallet.save();
    } else {
      // Create new wallet entry
      userWallet = new BuddyCoins({
        userId: userId,
        balance: 1000
      });
      await userWallet.save();
    }
    
    console.log('✅ Added $1000 to user wallet (BuddyCoins)');
    return true;
  } catch (error) {
    console.log('❌ Failed to add wallet balance:', error.message);
    return false;
  }
}

async function checkUserBookingHistory() {
  console.log('\n3. Checking user booking history...');
  
  try {
    const bookingHistory = await MentorCall.find({ userId: userId });
    console.log(`📊 User has ${bookingHistory.length} previous bookings`);
    
    if (bookingHistory.length === 0) {
      console.log('✅ Confirmed: This is a first-time user (no previous bookings)');
      return true;
    } else {
      console.log('⚠️ User has previous bookings - not a first-time user');
      bookingHistory.forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.callType} - ${booking.time} mins - ${booking.createdAt}`);
      });
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to check booking history:', error.message);
    return false;
  }
}

async function testFirstTimeBooking() {
  console.log('\n4. Testing first-time chat booking (10 minutes for clearer price difference)...');
  
  try {
    const bookingResponse = await axios.put(`${BASE_URL}/slot/book`, {
      mentorId: TEST_CONFIG.mentor.id,
      callType: 'chat',
      time: '10',
      type: 'instant'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    if (bookingResponse.data.status_code === 'Ok') {
      const booking = bookingResponse.data.data;
      const actualPrice = booking.payment?.amount || booking.totalCost;
      const regularPriceFor10Min = TEST_CONFIG.regularChatPrice * 2; // 10 minutes = 2 * 5-minute blocks
      
      console.log('✅ First booking completed!');
      console.log(`   💰 Actual Price: ${actualPrice}`);
      console.log(`   🎯 Expected First-Time Price: ${TEST_CONFIG.expectedFirstTimePrice}`);
      console.log(`   📊 Regular Price for 10 min: ${regularPriceFor10Min}`);
      
      if (actualPrice === TEST_CONFIG.expectedFirstTimePrice) {
        console.log('🎉 FIRST-TIME PRICING IS WORKING!');
        return { success: true, price: actualPrice, isFirstTimePrice: true };
      } else if (actualPrice === regularPriceFor10Min) {
        console.log('❌ FIRST-TIME PRICING IS NOT IMPLEMENTED - Using regular pricing');
        return { success: true, price: actualPrice, isFirstTimePrice: false };
      } else {
        console.log(`⚠️ UNEXPECTED PRICING - Got ${actualPrice}, expected ${TEST_CONFIG.expectedFirstTimePrice} or ${regularPriceFor10Min}`);
        return { success: true, price: actualPrice, isFirstTimePrice: false };
      }
    }
  } catch (error) {
    console.log('❌ First booking failed:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

async function testSecondBooking() {
  console.log('\n5. Testing second chat booking (10 minutes - should use regular pricing)...');
  
  try {
    const bookingResponse = await axios.put(`${BASE_URL}/slot/book`, {
      mentorId: TEST_CONFIG.mentor.id,
      callType: 'chat',
      time: '10',
      type: 'instant'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    if (bookingResponse.data.status_code === 'Ok') {
      const booking = bookingResponse.data.data;
      const actualPrice = booking.payment?.amount || booking.totalCost;
      const regularPriceFor10Min = TEST_CONFIG.regularChatPrice * 2; // 10 minutes = 2 * 5-minute blocks
      
      console.log('✅ Second booking completed!');
      console.log(`   💰 Actual Price: ${actualPrice}`);
      console.log(`   🎯 Expected Price: ${regularPriceFor10Min} (regular pricing for 10 minutes)`);
      
      if (actualPrice === regularPriceFor10Min) {
        console.log('✅ Second booking uses regular pricing (correct)');
        return { success: true, price: actualPrice, isRegularPrice: true };
      } else {
        console.log(`⚠️ Second booking price unexpected: ${actualPrice}`);
        return { success: true, price: actualPrice, isRegularPrice: false };
      }
    }
  } catch (error) {
    console.log('❌ Second booking failed:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

async function analyzeCurrentImplementation() {
  console.log('\n6. Analyzing current pricing implementation...');
  
  try {
    // Check wallet transactions
    const walletTransactions = await UserWallet.find({ userId: userId }).sort({ createdAt: -1 });
    console.log(`📊 Found ${walletTransactions.length} wallet transactions`);
    
    walletTransactions.forEach((transaction, index) => {
      console.log(`   ${index + 1}. ${transaction.transactionType} - Amount: ${transaction.amount} - ${transaction.createdAt}`);
    });
    
    // Check mentor call records
    const mentorCalls = await MentorCall.find({ userId: userId }).sort({ createdAt: -1 });
    console.log(`📞 Found ${mentorCalls.length} mentor call records`);
    
    mentorCalls.forEach((call, index) => {
      console.log(`   ${index + 1}. ${call.callType} - Time: ${call.time} mins - Total Cost: ${call.totalCost} - ${call.createdAt}`);
    });
    
  } catch (error) {
    console.log('❌ Failed to analyze implementation:', error.message);
  }
}

async function generateReport(firstBookingResult, secondBookingResult) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 FIRST-TIME PRICING ANALYSIS REPORT');
  console.log('='.repeat(80));
  
  console.log('\n🎯 TEST OBJECTIVES:');
  console.log('   • Verify 1 rupee pricing for first 5-minute chat session');
  console.log('   • Confirm regular pricing for subsequent sessions');
  console.log('   • Identify if first-time pricing logic exists');
  
  console.log('\n📊 TEST RESULTS:');
  
  if (firstBookingResult.success) {
    console.log(`   First Booking: ${firstBookingResult.price} rupees`);
    if (firstBookingResult.isFirstTimePrice) {
      console.log('   ✅ First-time pricing is WORKING');
    } else {
      console.log('   ❌ First-time pricing is NOT IMPLEMENTED');
    }
  } else {
    console.log('   ❌ First booking failed');
  }
  
  if (secondBookingResult.success) {
    console.log(`   Second Booking: ${secondBookingResult.price} rupees`);
    if (secondBookingResult.isRegularPrice) {
      console.log('   ✅ Regular pricing is working for subsequent bookings');
    } else {
      console.log('   ⚠️ Unexpected pricing for second booking');
    }
  } else {
    console.log('   ❌ Second booking failed');
  }
  
  console.log('\n🔍 ANALYSIS:');
  
  if (!firstBookingResult.isFirstTimePrice) {
    console.log('   ❌ ISSUE IDENTIFIED: First-time pricing (1 rupee) is not implemented');
    console.log('   📝 RECOMMENDATION: Implement first-time user pricing logic in BookSlotByUserId function');
    console.log('   📍 LOCATION: /src/api/1.0/controller/mentor-call.controller.ts around line 660');
    console.log('   💡 IMPLEMENTATION: Add user booking history check before calculating totalCost');
    
    console.log('\n🛠️ SUGGESTED IMPLEMENTATION:');
    console.log('   1. Check if user has any previous successful bookings');
    console.log('   2. If first-time user and callType is "chat" and time <= 5 minutes:');
    console.log('      - Set totalCost = 1 (1 rupee)');
    console.log('   3. Otherwise use regular pricing: packages.price * parseInt(time)');
  } else {
    console.log('   ✅ First-time pricing is working correctly');
  }
  
  console.log('\n' + '='.repeat(80));
}

async function cleanup() {
  console.log('\n7. Cleaning up test data...');
  
  try {
    // Remove test user and related data
    await User.findByIdAndDelete(userId);
    await MentorCall.deleteMany({ userId: userId });
    await UserWallet.deleteMany({ userId: userId });
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error.message);
  }
}

async function runAnalysis() {
  console.log('🔍 FIRST-TIME PRICING ANALYSIS');
  console.log('='.repeat(50));
  
  try {
    await connectDatabase();
    
    const registered = await registerAndLoginUser();
    if (!registered) return;
    
    const balanceAdded = await addWalletBalance();
    if (!balanceAdded) return;
    
    const isFirstTime = await checkUserBookingHistory();
    if (!isFirstTime) {
      console.log('⚠️ User already has bookings - test may not be accurate');
    }
    
    const firstBookingResult = await testFirstTimeBooking();
    const secondBookingResult = await testSecondBooking();
    
    await analyzeCurrentImplementation();
    await generateReport(firstBookingResult, secondBookingResult);
    await cleanup();
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🏁 Analysis completed');
  }
}

// Run the analysis
runAnalysis().catch(console.error);
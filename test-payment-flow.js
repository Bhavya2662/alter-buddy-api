const axios = require('axios');
const mongoose = require('mongoose');
const config = require('config');

// Define User schema
const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  phoneNumber: String,
  mobile: String,
  isVerified: { type: Boolean, default: false },
  acType: { type: String, default: 'USER' },
  block: { type: Boolean, default: false },
  online: { type: Boolean, default: false },
  profilePicture: String,
  dateOfBirth: Date,
  gender: String,
  location: String,
  bio: String,
  interests: [String],
  socialLinks: {
    linkedin: String,
    twitter: String,
    instagram: String,
  },
  wallet: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

// Define UserWallet schema
const UserWalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Mentor",
    required: false,
  },
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CallSchedule",
    required: false,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["debit", "credit", "refund"],
    required: true,
  },
  status: {
    type: String,
    enum: ["confirmed", "refunded"],
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
}, { timestamps: true });

const UserWallet = mongoose.model('UserWallet', UserWalletSchema);

// Define MentorWallet schema
const MentorWalletSchema = new mongoose.Schema({
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Mentor",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CallSchedule",
    required: false,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["debit", "credit"],
    required: true,
  },
  status: {
    type: String,
    enum: ["confirmed", "refunded"],
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
}, { timestamps: true });

const MentorWallet = mongoose.model('MentorWallet', MentorWalletSchema);

const BASE_URL = 'http://localhost:8080/api/1.0';

async function testPaymentFlow() {
    try {
        console.log('💳 Testing Payment Flow...');
        
        // Connect to database
        await mongoose.connect(config.get('DB_PATH'));
        console.log('📦 Connected to MongoDB');
        
        // Login user
        const loginResponse = await axios.put(`${BASE_URL}/sign-in`, {
            mobileOrEmail: 'bhavyasharma2662@gmail.com',
            password: 'password123'
        });
        
        const token = loginResponse.data.data.token;
        console.log('🔑 User logged in successfully');
        console.log('🔍 Token preview:', token ? token.substring(0, 20) + '...' : 'No token found');
        
        // Check initial wallet balance via API
        const walletResponse = await axios.get(`${BASE_URL}/buddy-coins`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const initialBalance = walletResponse.data.data.balance;
        console.log(`💰 Initial wallet balance: $${initialBalance}`);
        
        // Also get user from database
        const user = await User.findOne({ email: 'bhavyasharma2662@gmail.com' });
        
        // Get mentor list
        const mentorsResponse = await axios.get(`${BASE_URL}/mentor`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const mentor = mentorsResponse.data.data[0];
        console.log(`👨‍🏫 Testing with mentor: ${mentor.name}`);
        
        // Test chat booking (should deduct 5 * price)
        console.log('\n📱 Testing chat booking payment...');
        const chatBooking = await axios.put(`${BASE_URL}/slot/book`, {
            mentorId: mentor._id,
            callType: 'chat',
            time: '5',
            type: 'instant'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (chatBooking.data.status_code === 'Ok') {
            console.log('✅ Chat booking successful');
            
            // Check wallet balance after booking
            const userAfterChat = await User.findOne({ email: 'bhavyasharma2662@gmail.com' });
            const balanceAfterChat = userAfterChat.wallet;
            const deductedAmount = initialBalance - balanceAfterChat;
            
            console.log(`💰 Balance after chat booking: $${balanceAfterChat}`);
            console.log(`💸 Amount deducted: $${deductedAmount}`);
            console.log(`📊 Expected deduction: $${5 * mentor.price} (5 mins * $${mentor.price}/min)`);
            
            // Verify wallet transaction was created
            const walletTransactions = await UserWallet.find({ 
                userId: user._id 
            }).sort({ createdAt: -1 }).limit(1);
            
            if (walletTransactions.length > 0) {
                const lastTransaction = walletTransactions[0];
                console.log(`📝 Last wallet transaction: ${lastTransaction.type} $${lastTransaction.amount}`);
                console.log(`📄 Transaction description: ${lastTransaction.description}`);
            }
            
            // Check if mentor received payment
            const mentorWalletTransactions = await MentorWallet.find({ 
                mentorId: mentor._id 
            }).sort({ createdAt: -1 }).limit(1);
            
            if (mentorWalletTransactions.length > 0) {
                const mentorTransaction = mentorWalletTransactions[0];
                console.log(`💰 Mentor received: ${mentorTransaction.type} $${mentorTransaction.amount}`);
            }
        } else {
            console.log('❌ Chat booking failed:', chatBooking.data.message);
        }
        
        // Test audio booking (should deduct 10 * price)
        console.log('\n🎵 Testing audio booking payment...');
        const audioBooking = await axios.put(`${BASE_URL}/slot/book`, {
            mentorId: mentor._id,
            callType: 'audio',
            time: '10',
            type: 'instant'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (audioBooking.data.status_code === 'Ok') {
            console.log('✅ Audio booking successful');
            
            const userAfterAudio = await User.findOne({ email: 'bhavyasharma2662@gmail.com' });
            const balanceAfterAudio = userAfterAudio.wallet;
            
            console.log(`💰 Balance after audio booking: $${balanceAfterAudio}`);
            console.log(`📊 Expected total deductions so far: $${(5 + 15) * mentor.price}`);
        } else {
            console.log('❌ Audio booking failed:', audioBooking.data.message);
        }
        
        // Test insufficient funds scenario
        console.log('\n💸 Testing insufficient funds scenario...');
        
        // Try to book a very long session that would exceed wallet balance
        try {
            const expensiveBooking = await axios.put(`${BASE_URL}/slot/book`, {
                mentorId: mentor._id,
                callType: 'video',
                time: '200',
                type: 'instant'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('❌ Should have failed due to insufficient funds');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Correctly rejected due to insufficient funds');
                console.log(`📝 Error message: ${error.response.data.message}`);
            } else {
                console.log('❌ Unexpected error:', error.message);
            }
        }
        
        // Final wallet summary
        console.log('\n📊 Final Payment Flow Summary:');
        const finalWalletResponse = await axios.get(`${BASE_URL}/buddy-coins`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const finalBalance = finalWalletResponse.data.data.balance;
        console.log(`💰 Final wallet balance: $${finalBalance}`);
        console.log(`💸 Total amount spent: $${initialBalance - finalBalance}`);
        
        // Show all user wallet transactions
        const allTransactions = await UserWallet.find({ userId: user._id }).sort({ createdAt: -1 });
        console.log(`\n📝 All wallet transactions (${allTransactions.length}):`);
        allTransactions.forEach((transaction, index) => {
            console.log(`   ${index + 1}. ${transaction.type}: $${transaction.amount} - ${transaction.description}`);
        });
        
    } catch (error) {
        console.error('❌ Payment flow test failed:', error.message);
        if (error.response) {
            console.error('📝 Response data:', error.response.data);
        }
    } finally {
        await mongoose.disconnect();
        console.log('📦 Disconnected from MongoDB');
    }
}

testPaymentFlow();
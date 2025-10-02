const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('📦 Connected to MongoDB');
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

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

// Define BuddyCoin schema (alternative wallet system)
const BuddyCoinSchema = new mongoose.Schema({
  balance: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const BuddyCoin = mongoose.model('BuddyCoin', BuddyCoinSchema);

async function addUserWalletBalance() {
  try {
    console.log('💰 Adding wallet balance to user...');
    
    // Find user
    const user = await User.findOne({ email: 'testuser@example.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 User found:', user._id);
    
    // Method 1: Update user wallet field directly
    user.wallet = 1000;
    await user.save();
    console.log('✅ Updated user wallet field to $1000');
    
    // Method 2: Create wallet transaction record
    const walletTransaction = new UserWallet({
      userId: user._id,
      amount: 1000,
      type: 'credit',
      status: 'confirmed',
      description: 'Initial wallet balance for testing',
    });
    
    await walletTransaction.save();
    console.log('✅ Created wallet transaction record');
    
    // Method 3: Create/Update BuddyCoin record (if this system is used)
    let buddyCoin = await BuddyCoin.findOne({ userId: user._id });
    
    if (!buddyCoin) {
      buddyCoin = new BuddyCoin({
        balance: 1000,
        userId: user._id,
      });
      await buddyCoin.save();
      console.log('✅ Created BuddyCoin wallet with $1000');
    } else {
      buddyCoin.balance = 1000;
      await buddyCoin.save();
      console.log('✅ Updated BuddyCoin wallet to $1000');
    }
    
    console.log('\n🎉 Wallet balance setup complete!');
    console.log('   User Wallet Field: $1000');
    console.log('   Wallet Transaction: $1000 credit');
    console.log('   BuddyCoin Balance: $1000');
    
  } catch (error) {
    console.error('❌ Error adding wallet balance:', error);
  } finally {
    mongoose.connection.close();
  }
}

addUserWalletBalance();
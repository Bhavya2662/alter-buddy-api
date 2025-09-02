const mongoose = require('mongoose');
const config = require('config');

// Define UserWallet schema
const UserWalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const UserWallet = mongoose.model('UserWallet', UserWalletSchema);

// Define User schema
const UserSchema = new mongoose.Schema({
  name: {
    firstName: String,
    lastName: String
  },
  email: String,
  mobile: String,
  password: String,
  acType: String,
  block: Boolean,
  verified: Boolean,
  online: Boolean
});

const User = mongoose.model('User', UserSchema);

async function addTestBalance() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(config.get('DB_PATH'));
    console.log('✅ Connected to database');
    
    // Find test user
    const testUser = await User.findOne({ email: 'testuser@example.com' });
    if (!testUser) {
      console.error('❌ Test user not found');
      return;
    }
    
    console.log(`✅ Found test user: ${testUser.name.firstName} ${testUser.name.lastName}`);
    console.log(`User ID: ${testUser._id}`);
    
    // Find or create wallet
    let wallet = await UserWallet.findOne({ userId: testUser._id });
    
    if (!wallet) {
      console.log('Creating new wallet...');
      wallet = new UserWallet({
        userId: testUser._id,
        balance: 0
      });
    }
    
    console.log(`Current balance: $${wallet.balance}`);
    
    // Add $20000 to balance
    const addAmount = 20000;
    wallet.balance += addAmount;
    wallet.updatedAt = new Date();
    
    await wallet.save();
    
    console.log(`✅ Added $${addAmount} to wallet`);
    console.log(`✅ New balance: $${wallet.balance}`);
    
  } catch (error) {
    console.error('❌ Error adding balance:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

addTestBalance().catch(console.error);
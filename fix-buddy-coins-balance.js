const mongoose = require('mongoose');
const config = require('config');

// Define BuddyCoins schema (the one used by the API)
const BuddyCoinSchema = new mongoose.Schema({
  balance: { type: mongoose.Schema.Types.Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const BuddyCoins = mongoose.model('BuddyCoin', BuddyCoinSchema);

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

async function fixBuddyCoinsBalance() {
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
    
    // Find BuddyCoins wallet
    let buddyCoins = await BuddyCoins.findOne({ userId: testUser._id });
    
    if (!buddyCoins) {
      console.log('Creating new BuddyCoins wallet...');
      buddyCoins = new BuddyCoins({
        userId: testUser._id,
        balance: 0
      });
    }
    
    console.log(`Current BuddyCoins balance: $${buddyCoins.balance}`);
    
    // Set balance to $50000 to ensure sufficient funds for all tests
    buddyCoins.balance = 50000;
    
    await buddyCoins.save();
    
    console.log(`✅ Updated BuddyCoins balance to: $${buddyCoins.balance}`);
    
    // Verify the update
    const verifyWallet = await BuddyCoins.findOne({ userId: testUser._id });
    console.log(`✅ Verified balance: $${verifyWallet.balance}`);
    
  } catch (error) {
    console.error('❌ Error fixing BuddyCoins balance:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

fixBuddyCoinsBalance().catch(console.error);
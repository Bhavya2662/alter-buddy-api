const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define schemas
const BuddyCoinSchema = new mongoose.Schema({
  balance: { type: mongoose.Schema.Types.Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name: {
    firstName: String,
    lastName: String,
  },
  email: String,
  // ... other fields
});

const BuddyCoins = mongoose.model('BuddyCoin', BuddyCoinSchema);
const User = mongoose.model('User', UserSchema);

async function addWalletBalanceToNewUser(userId) {
  try {
    console.log(`💰 Adding wallet balance to user ${userId}...`);
    
    // Find the user
    const testUser = await User.findById(userId);
    if (!testUser) {
      console.log('❌ User not found');
      return false;
    }

    console.log('✅ Found user:', testUser.email);

    // Find or create wallet
    let wallet = await BuddyCoins.findOne({ userId: testUser._id });
    
    if (!wallet) {
      // Create new wallet
      wallet = new BuddyCoins({
        balance: 1000,
        userId: testUser._id,
      });
      await wallet.save();
      console.log('✅ Created new wallet with balance 1000');
    } else {
      // Update existing wallet
      wallet.balance = 1000;
      await wallet.save();
      console.log('✅ Updated wallet balance to 1000');
    }

    console.log('🎉 Wallet balance updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating wallet balance:', error);
    return false;
  }
}

// If called directly with userId argument
if (require.main === module) {
  const userId = process.argv[2];
  if (!userId) {
    console.log('Usage: node add-balance-to-new-user.js <userId>');
    process.exit(1);
  }
  
  addWalletBalanceToNewUser(userId)
    .then((success) => {
      if (success) {
        console.log('✅ Balance added successfully');
      } else {
        console.log('❌ Failed to add balance');
      }
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { addWalletBalanceToNewUser };
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

async function addWalletBalance() {
  try {
    // Find the test user by email
    const testUser = await User.findOne({ email: 'testuser123@example.com' });
    if (!testUser) {
      console.log('User not found');
      return;
    }

    console.log('Found user:', testUser._id);

    // Find or create wallet
    let wallet = await BuddyCoins.findOne({ userId: testUser._id });
    
    if (!wallet) {
      // Create new wallet
      wallet = new BuddyCoins({
        balance: 1000,
        userId: testUser._id,
      });
      await wallet.save();
      console.log('Created new wallet with balance 1000');
    } else {
      // Update existing wallet
      wallet.balance = 1000;
      await wallet.save();
      console.log('Updated wallet balance to 1000');
    }

    console.log('Wallet balance updated successfully');
  } catch (error) {
    console.error('Error updating wallet balance:', error);
  } finally {
    mongoose.connection.close();
  }
}

addWalletBalance();
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

async function checkWalletBalance() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(config.get('DB_PATH'));
    console.log('✅ Connected to database');
    
    // Find all test users
    const testUsers = await User.find({ 
      email: { $in: ['testuser@example.com', 'bhavyasharma2662@gmail.com'] } 
    });
    
    console.log('\n👥 Found test users:');
    for (const user of testUsers) {
      console.log(`- ${user.email}: ID ${user._id}`);
      
      // Find all wallets for this user
      const wallets = await UserWallet.find({ userId: user._id });
      console.log(`  Wallets found: ${wallets.length}`);
      
      wallets.forEach((wallet, index) => {
        console.log(`    Wallet ${index + 1}: $${wallet.balance} (Created: ${wallet.createdAt})`);
      });
    }
    
    // Check all wallets in the system
    const allWallets = await UserWallet.find({}).populate('userId', 'email name');
    console.log(`\n💰 All wallets in system (${allWallets.length} total):`);
    
    allWallets.forEach((wallet, index) => {
      const userEmail = wallet.userId?.email || 'Unknown';
      const userName = wallet.userId?.name ? `${wallet.userId.name.firstName} ${wallet.userId.name.lastName}` : 'Unknown';
      console.log(`${index + 1}. ${userEmail} (${userName}): $${wallet.balance}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking wallet balance:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

checkWalletBalance().catch(console.error);
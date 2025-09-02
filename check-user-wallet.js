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

async function checkUserWallet() {
  try {
    console.log('💰 Checking user wallet...');
    
    // Find user
    const user = await User.findOne({ email: 'bhavyasharma2662@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 User found:');
    console.log('   ID:', user._id);
    console.log('   Email:', user.email);
    console.log('   Wallet Balance:', user.wallet || 0);
    
    // Check wallet transactions
    const walletTransactions = await UserWallet.find({ userId: user._id }).sort({ createdAt: -1 });
    console.log('\n💳 Wallet Transactions:', walletTransactions.length);
    
    if (walletTransactions.length > 0) {
      console.log('\n📊 Recent transactions:');
      walletTransactions.slice(0, 5).forEach((transaction, index) => {
        console.log(`   ${index + 1}. ${transaction.type.toUpperCase()}: $${transaction.amount} - ${transaction.description || 'No description'} (${transaction.status})`);
      });
    }
    
    // Calculate total balance from transactions
    let calculatedBalance = 0;
    walletTransactions.forEach(transaction => {
      if (transaction.type === 'credit' && transaction.status === 'confirmed') {
        calculatedBalance += transaction.amount;
      } else if (transaction.type === 'debit' && transaction.status === 'confirmed') {
        calculatedBalance -= transaction.amount;
      }
    });
    
    console.log('\n💰 Calculated Balance from Transactions:', calculatedBalance);
    console.log('💰 User Model Wallet Field:', user.wallet || 0);
    
  } catch (error) {
    console.error('❌ Error checking wallet:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUserWallet();
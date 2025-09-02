const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define schemas
const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  balance: { type: Number, default: 0 }
}, {
  timestamps: true
});

const transactionSchema = new mongoose.Schema({
  closingBal: { type: Number, required: true },
  creditAmt: { type: Number },
  debitAmt: { type: Number },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuddyCoin', required: true },
  transactionType: { type: String, required: true },
  status: { type: String, required: true },
  transactionId: { type: String, required: true }
}, {
  timestamps: true
});

const mentorWalletSchema = new mongoose.Schema({
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  balance: { type: Number, default: 0 }
}, {
  timestamps: true
});

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  sessionType: { type: String, enum: ['chat', 'audio', 'video'], required: true },
  duration: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' },
  startTime: { type: Date },
  endTime: { type: Date },
  chatRoomId: { type: String },
  recordingUrl: { type: String }
}, {
  timestamps: true
});

const BuddyCoins = mongoose.model('BuddyCoin', walletSchema);
const Transaction = mongoose.model('Transactions', transactionSchema);
const MentorWallet = mongoose.model('MentorWallet', mentorWalletSchema);
const Session = mongoose.model('Session', sessionSchema);

async function verifyWalletTransactions() {
  try {
    console.log('🔍 WALLET TRANSACTION VERIFICATION');
    console.log('==================================================');
    
    const userId = '68a2ffa2e50fb244ba4905dd';
    const mentorId = '681ce7a1c4222eb69ca553fe';
    
    // Check user wallet
    console.log('\n👤 USER WALLET ANALYSIS:');
    const userWallet = await BuddyCoins.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (userWallet) {
      console.log(`   Current Balance: ${userWallet.balance} coins`);
      
      // Check user transactions
      const userTransactions = await Transaction.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 }).limit(10);
      console.log(`   Total Transactions: ${userTransactions.length}`);
      
      if (userTransactions.length > 0) {
        console.log('\n   Recent Transactions:');
        userTransactions.forEach((tx, index) => {
          const amount = tx.debitAmt || tx.creditAmt || 0;
          const type = tx.debitAmt ? 'DEBIT' : 'CREDIT';
          console.log(`   ${index + 1}. ${type} - ${amount} coins - ${tx.transactionType} - ${tx.status} - ${tx.createdAt}`);
        });
      }
    } else {
      console.log('   ❌ No wallet found for user');
    }
    
    // Check mentor wallet
    console.log('\n🎓 MENTOR WALLET ANALYSIS:');
    const mentorWallet = await MentorWallet.findOne({ mentorId: new mongoose.Types.ObjectId(mentorId) });
    if (mentorWallet) {
      console.log(`   Current Balance: ${mentorWallet.balance} coins`);
      console.log(`   Total Transactions: 0 (Mentor transactions not implemented yet)`);
    } else {
      console.log('   ❌ No wallet found for mentor');
    }
    
    // Check recent sessions
    console.log('\n📋 RECENT SESSIONS:');
    const recentSessions = await Session.find({
      $or: [
        { userId: new mongoose.Types.ObjectId(userId) },
        { mentorId: new mongoose.Types.ObjectId(mentorId) }
      ]
    }).sort({ createdAt: -1 }).limit(10);
    
    if (recentSessions.length > 0) {
      recentSessions.forEach((session, index) => {
        console.log(`   ${index + 1}. ${session.sessionType.toUpperCase()} - ${session.duration}min - ${session.amount} coins - Status: ${session.status} - ${session.createdAt}`);
      });
    } else {
      console.log('   ❌ No sessions found');
    }
    
    // Calculate totals
    console.log('\n📊 TRANSACTION SUMMARY:');
    const userTransactions = await Transaction.find({ userId: new mongoose.Types.ObjectId(userId) });
    const totalUserDebits = userTransactions.reduce((sum, tx) => sum + (tx.debitAmt || 0), 0);
    const totalUserCredits = userTransactions.reduce((sum, tx) => sum + (tx.creditAmt || 0), 0);
    const totalSessionAmounts = recentSessions.reduce((sum, session) => sum + session.amount, 0);
    
    console.log(`   Total User Debits: ${totalUserDebits} coins`);
    console.log(`   Total User Credits: ${totalUserCredits} coins`);
    console.log(`   Total Session Amounts: ${totalSessionAmounts} coins`);
    console.log(`   Total Transactions: ${userTransactions.length}`);
    
    // Verification
    console.log('\n✅ VERIFICATION RESULTS:');
    if (totalUserDebits > 0) {
      console.log('   ✅ User wallet has debit transactions');
    } else {
      console.log('   ❌ No user wallet debits found');
    }
    
    if (userTransactions.length > 0) {
      console.log('   ✅ Transaction records are being created');
    } else {
      console.log('   ❌ No transaction records found');
    }
    
    if (recentSessions.length > 0) {
      console.log('   ✅ Sessions are being created');
    } else {
      console.log('   ❌ No sessions found');
    }
    
    // Check if wallet balance matches expected value after transactions
    const expectedBalance = 10000 - totalUserDebits + totalUserCredits;
    if (userWallet && Math.abs(userWallet.balance - expectedBalance) < 1) {
      console.log('   ✅ Wallet balance is consistent with transactions');
    } else {
      console.log(`   ⚠️  Wallet balance (${userWallet ? userWallet.balance : 'N/A'}) may not match expected (${expectedBalance})`);
    }
    
  } catch (error) {
    console.error('❌ Error verifying wallet transactions:', error);
  } finally {
    mongoose.connection.close();
  }
}

verifyWalletTransactions();
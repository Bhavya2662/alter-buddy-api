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

// Define BuddyCoin schema
const BuddyCoinSchema = new mongoose.Schema({
  balance: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const BuddyCoin = mongoose.model('BuddyCoin', BuddyCoinSchema);

// Define Packages schema
const PackagesSchema = new mongoose.Schema({
  packageType: { type: String, required: true },
  price: { type: Number, required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", required: true },
}, { timestamps: true });

const Packages = mongoose.model('Packages', PackagesSchema);

async function checkBuddyCoinsAndPackages() {
  try {
    console.log('🔍 Checking BuddyCoins and Packages...');
    
    // Find user
    const user = await User.findOne({ email: 'bhavyasharma2662@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 User found:', user._id);
    
    // Check BuddyCoin wallet
    const buddyCoin = await BuddyCoin.findOne({ userId: user._id });
    if (buddyCoin) {
      console.log('💰 BuddyCoin wallet found:');
      console.log('   Balance:', buddyCoin.balance);
      console.log('   Wallet ID:', buddyCoin._id);
    } else {
      console.log('❌ BuddyCoin wallet not found');
    }
    
    // Check packages for the mentor
    const mentorId = '68a37c625e4fb05bdff599d3';
    console.log('\n📦 Checking packages for mentor:', mentorId);
    
    const packages = await Packages.find({ mentorId });
    if (packages.length > 0) {
      console.log('✅ Packages found:');
      packages.forEach(pkg => {
        console.log(`   Type: ${pkg.packageType}, Price: $${pkg.price}`);
      });
    } else {
      console.log('❌ No packages found for mentor');
    }
    
    // Check specifically for chat package
    const chatPackage = await Packages.findOne({ 
      packageType: 'chat', 
      mentorId 
    });
    
    if (chatPackage) {
      console.log('\n✅ Chat package found:');
      console.log('   Price per minute: $' + chatPackage.price);
      console.log('   Total cost for 30 minutes: $' + (chatPackage.price * 30));
      
      if (buddyCoin) {
        const canAfford = buddyCoin.balance >= (chatPackage.price * 30);
        console.log('   Can afford 30-minute session:', canAfford ? '✅ Yes' : '❌ No');
        if (!canAfford) {
          console.log('   Need additional balance: $' + ((chatPackage.price * 30) - buddyCoin.balance));
        }
      }
    } else {
      console.log('\n❌ Chat package not found for mentor');
    }
    
  } catch (error) {
    console.error('❌ Error checking BuddyCoins and packages:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkBuddyCoinsAndPackages();
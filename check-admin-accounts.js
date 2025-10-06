const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './alter-buddy-api-main/.env' });
const config = require('config');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(config.get('DB_PATH'), {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// User Schema (simplified)
const userSchema = new mongoose.Schema({
  name: {
    firstName: String,
    lastName: String,
  },
  email: { type: String, unique: true },
  password: String,
  mobile: String,
  acType: { type: String, default: 'USER' },
  block: { type: Boolean, default: false },
  online: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  referralCode: String,
  myInitialCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory' }],
  dob: String,
}, { collection: 'users', timestamps: true });

const User = mongoose.model('User', userSchema);

// Mentor Schema (simplified)
const mentorSchema = new mongoose.Schema({
  auth: {
    username: String,
    password: String
  },
  contact: {
    mobile: String,
    email: String
  },
  acType: String,
  accountStatus: {
    block: Boolean,
    online: Boolean
  }
}, { collection: 'mentors' });

const Mentor = mongoose.model('Mentor', mentorSchema);

async function checkAccounts() {
  await connectDB();
  
  console.log('\n🔍 Checking Admin Accounts...');
  console.log('=' * 40);
  
  try {
    // Find admin users
    const adminUsers = await User.find({ acType: 'ADMIN' }).select('email mobile verified block deactivation');
    
    console.log(`Found ${adminUsers.length} admin accounts:`);
    adminUsers.forEach((admin, index) => {
      console.log(`\n${index + 1}. Admin Account:`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Mobile: ${admin.mobile}`);
      console.log(`   Verified: ${admin.verified}`);
      console.log(`   Blocked: ${admin.block}`);
      console.log(`   Deactivated: ${admin.deactivation?.isDeactivated || false}`);
    });
    
    // Find regular users
    console.log('\n\n🔍 Checking User Accounts...');
    console.log('=' * 40);
    
    const regularUsers = await User.find({ acType: 'USER' }).limit(5).select('email mobile verified block deactivation');
    
    console.log(`Found ${regularUsers.length} user accounts (showing first 5):`);
    regularUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. User Account:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Mobile: ${user.mobile}`);
      console.log(`   Verified: ${user.verified}`);
      console.log(`   Blocked: ${user.block}`);
      console.log(`   Deactivated: ${user.deactivation?.isDeactivated || false}`);
    });
    
    // Find mentors
    console.log('\n\n🔍 Checking Mentor Accounts...');
    console.log('=' * 40);
    
    const mentors = await Mentor.find({ acType: 'MENTOR' }).limit(5).select('auth.username contact accountStatus');
    
    console.log(`Found ${mentors.length} mentor accounts (showing first 5):`);
    mentors.forEach((mentor, index) => {
      console.log(`\n${index + 1}. Mentor Account:`);
      console.log(`   Username: ${mentor.auth?.username}`);
      console.log(`   Email: ${mentor.contact?.email}`);
      console.log(`   Mobile: ${mentor.contact?.mobile}`);
      console.log(`   Blocked: ${mentor.accountStatus?.block}`);
      console.log(`   Online: ${mentor.accountStatus?.online}`);
    });
    
    // Create test admin if none exists
    if (adminUsers.length === 0) {
      console.log('\n⚠️  No admin accounts found. Creating test admin...');
      
      const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);
      
      const testAdmin = new User({
        name: {
          firstName: 'admin',
          lastName: 'user',
        },
        email: 'admin@alterbuddy.com',
        mobile: '9999999999',
        password: hashedPassword,
        acType: 'ADMIN',
        verified: true,
        block: false,
        online: false
      });
      
      await testAdmin.save();
      console.log('✅ Test admin created successfully!');
      console.log('   Email: admin@alterbuddy.com');
      console.log('   Password: AdminPassword123!');
    }
    
    // Create test user if needed
    const testUser = await User.findOne({ email: 'bhavya.sharma@example.com' });
    if (!testUser) {
      console.log('\n⚠️  Test user not found. Creating test user...');
      
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      
      const newTestUser = new User({
        name: {
          firstName: 'Bhavya',
          lastName: 'Sharma',
        },
        email: 'bhavya.sharma@example.com',
        mobile: '8888888888',
        password: hashedPassword,
        acType: 'USER',
        verified: true,
        block: false,
        online: false
      });
      
      await newTestUser.save();
      console.log('✅ Test user created successfully!');
      console.log('   Email: bhavya.sharma@example.com');
      console.log('   Password: TestPassword123!');
    }
    
    // Create test mentor if needed
    const testMentor = await Mentor.findOne({ 'auth.username': 'testmentor' });
    if (!testMentor) {
      console.log('\n⚠️  Test mentor not found. Creating test mentor...');
      
      const hashedPassword = await bcrypt.hash('MentorPassword123!', 10);
      
      const newTestMentor = new Mentor({
        auth: {
          username: 'testmentor',
          password: hashedPassword
        },
        contact: {
          email: 'mentor@alterbuddy.com',
          mobile: '7777777777'
        },
        acType: 'MENTOR',
        accountStatus: {
          block: false,
          online: false
        }
      });
      
      await newTestMentor.save();
      console.log('✅ Test mentor created successfully!');
      console.log('   Username: testmentor');
      console.log('   Password: MentorPassword123!');
    }
    
  } catch (error) {
    console.error('❌ Error checking accounts:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

checkAccounts();
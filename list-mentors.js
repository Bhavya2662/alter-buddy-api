const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define User schema (simplified)
const UserSchema = new mongoose.Schema({
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
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function listMentors() {
  try {
    console.log('🔍 Searching for mentors in database...');
    
    const mentors = await User.find({ acType: 'MENTOR' }).limit(10);
    
    if (mentors.length === 0) {
      console.log('❌ No mentors found in database');
      return;
    }
    
    console.log(`✅ Found ${mentors.length} mentor(s):`);
    console.log('\n' + '='.repeat(80));
    
    mentors.forEach((mentor, index) => {
      console.log(`\n📋 MENTOR ${index + 1}:`);
      console.log(`   ID: ${mentor._id}`);
      console.log(`   Name: ${mentor.name?.firstName || 'N/A'} ${mentor.name?.lastName || 'N/A'}`);
      console.log(`   Email: ${mentor.email}`);
      console.log(`   Mobile: ${mentor.mobile || 'N/A'}`);
      console.log(`   acType: ${mentor.acType}`);
      console.log(`   Block: ${mentor.block}`);
      console.log(`   Online: ${mentor.online}`);
      console.log(`   Verified: ${mentor.verified}`);
      console.log(`   Created: ${mentor.createdAt}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Use any of the above mentor IDs in your tests.');
    
  } catch (error) {
    console.error('❌ Error listing mentors:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

listMentors();
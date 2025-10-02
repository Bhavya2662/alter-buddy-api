const mongoose = require('mongoose');
const config = require('config');
const { User } = require('./build/model');

// MongoDB connection
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});

async function checkMentorUser() {
  try {
    
    const mentorId = '681ce7a1c4222eb69ca553fe';
    console.log(`\n🔍 Checking mentor ID: ${mentorId}`);
    
    // Check if mentor exists in User collection
    const mentorUser = await User.findById(mentorId).lean();
    
    if (mentorUser) {
      console.log('✅ Mentor found in User collection:');
      console.log(`   Name: ${mentorUser.name?.firstName} ${mentorUser.name?.lastName}`);
      console.log(`   Email: ${mentorUser.email}`);
      console.log(`   Account Type: ${mentorUser.acType}`);
      console.log(`   ID: ${mentorUser._id}`);
      
      if (mentorUser.acType === 'MENTOR') {
        console.log('✅ Account type is correct (MENTOR)');
      } else {
        console.log('❌ Account type is incorrect. Expected: MENTOR, Got:', mentorUser.acType);
      }
    } else {
      console.log('❌ Mentor not found in User collection');
      
      // Let's find a valid mentor
      console.log('\n🔍 Looking for valid mentors...');
      const validMentors = await User.find({ acType: 'MENTOR' }).limit(5).lean();
      
      if (validMentors.length > 0) {
        console.log(`✅ Found ${validMentors.length} valid mentors:`);
        validMentors.forEach((mentor, index) => {
          console.log(`   ${index + 1}. ${mentor.name?.firstName} ${mentor.name?.lastName} (${mentor._id})`);
        });
      } else {
        console.log('❌ No mentors found with acType: MENTOR');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkMentorUser();
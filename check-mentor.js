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

const TEST_MENTOR_ID = '68a37ad37de01f8431c91ee3';

async function checkMentor() {
  try {
    console.log(`Checking mentor with ID: ${TEST_MENTOR_ID}`);
    
    const mentor = await User.findById(TEST_MENTOR_ID);
    
    if (!mentor) {
      console.log('❌ Mentor not found in database');
      
      // Check all mentors in the database
      const allMentors = await User.find({ acType: 'MENTOR' });
      console.log(`\nFound ${allMentors.length} mentors in database:`);
      allMentors.forEach((m, index) => {
        console.log(`${index + 1}. ${m.name?.firstName} ${m.name?.lastName} (${m.email}) - ID: ${m._id}`);
      });
      
      process.exit(1);
    }
    
    console.log('Mentor found:');
    console.log(`ID: ${mentor._id}`);
    console.log(`Name: ${mentor.name}`);
    console.log(`Email: ${mentor.email}`);
    console.log(`Mobile: ${mentor.mobile}`);
    console.log(`acType: ${mentor.acType}`);
    console.log(`block: ${mentor.block}`);
    console.log(`online: ${mentor.online}`);
    console.log(`verified: ${mentor.verified}`);
    console.log(`Created: ${mentor.createdAt}`);
    console.log(`Updated: ${mentor.updatedAt}`);
    
    // Check if acType is MENTOR
    if (mentor.acType === 'MENTOR') {
      console.log('✅ Mentor acType is correct');
    } else {
      console.log(`❌ Expected acType: MENTOR, but got: ${mentor.acType}`);
    }
    
    // Check if mentor is not blocked
    if (!mentor.block) {
      console.log('✅ Mentor is not blocked');
    } else {
      console.log('❌ Mentor is blocked');
    }
    
  } catch (error) {
    console.error('Error checking mentor:', error.message);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

checkMentor();
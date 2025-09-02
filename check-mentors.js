const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define User schema (for mentors)
const UserSchema = new mongoose.Schema({
  name: {
    firstName: String,
    lastName: String,
  },
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
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

// Define MentorConfig schema
const MentorConfigSchema = new mongoose.Schema({
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  chatPrice: Number,
  audioCallPrice: Number,
  videoCallPrice: Number,
  isActive: { type: Boolean, default: true },
  availability: {
    monday: { available: Boolean, slots: [String] },
    tuesday: { available: Boolean, slots: [String] },
    wednesday: { available: Boolean, slots: [String] },
    thursday: { available: Boolean, slots: [String] },
    friday: { available: Boolean, slots: [String] },
    saturday: { available: Boolean, slots: [String] },
    sunday: { available: Boolean, slots: [String] },
  },
}, { timestamps: true });

const MentorConfig = mongoose.model('MentorConfig', MentorConfigSchema);

async function checkMentors() {
  try {
    console.log('🔍 Checking mentors and configurations...');
    
    // Check for mentors (users with acType 'MENTOR')
    const mentors = await User.find({ acType: 'MENTOR' });
    console.log(`\n📊 Found ${mentors.length} mentors in the system:`);
    
    if (mentors.length > 0) {
      mentors.forEach((mentor, index) => {
        console.log(`${index + 1}. ${mentor.name?.firstName || 'N/A'} ${mentor.name?.lastName || ''} (${mentor.email}) - ID: ${mentor._id}`);
      });
    }
    
    // Check for mentor configurations
    const configs = await MentorConfig.find({ isActive: true });
    console.log(`\n⚙️ Found ${configs.length} active mentor configurations:`);
    
    if (configs.length > 0) {
      for (const config of configs) {
        const mentor = await User.findById(config.mentorId);
        console.log(`- Mentor: ${mentor?.name?.firstName || 'N/A'} ${mentor?.name?.lastName || ''} (${mentor?.email || 'N/A'})`);
        console.log(`  Chat: $${config.chatPrice || 'N/A'}, Audio: $${config.audioCallPrice || 'N/A'}, Video: $${config.videoCallPrice || 'N/A'}`);
        console.log(`  Active: ${config.isActive}`);
        console.log('');
      }
    } else {
      console.log('❌ No active mentor configurations found!');
      console.log('\n💡 This explains the "not valid configs found" error.');
      console.log('   You need to create mentor configurations for the booking system to work.');
    }
    
  } catch (error) {
    console.error('❌ Error checking mentors:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

checkMentors();
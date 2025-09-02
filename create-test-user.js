const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define User schema
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

async function createTestUser() {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'testuser@example.com' });
    if (existingUser) {
      console.log('Test user already exists:', existingUser._id);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create new user
    const user = new User({
      name: {
        firstName: 'Test',
        lastName: 'User',
      },
      email: 'testuser@example.com',
      password: hashedPassword,
      phoneNumber: '1234567890',
      mobile: '1234567890',
      isVerified: true,
      acType: 'USER',
      block: false,
      online: false,
      gender: 'male',
      location: 'Test City',
      bio: 'Test user for booking slots',
      interests: ['technology', 'mentoring'],
    });

    await user.save();
    console.log('Created test user:', user._id);
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestUser();
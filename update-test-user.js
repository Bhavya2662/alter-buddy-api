const mongoose = require('mongoose');
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
  verified: { type: Boolean, default: false },
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
  otp: {
    email: {
      code: String,
      expiresAt: Date,
      verified: { type: Boolean, default: false }
    }
  },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function updateTestUser() {
  try {
    // Update the existing user
    const result = await User.findOneAndUpdate(
      { email: 'testuser@example.com' },
      {
        $set: {
          mobile: '1234567890',
          acType: 'USER',
          block: false,
          online: false,
          isVerified: true,
          verified: true,
          'otp.email.verified': true,
        }
      },
      { new: true }
    );

    if (result) {
      console.log('Updated test user:', result._id);
      console.log('acType:', result.acType);
      console.log('block:', result.block);
      console.log('mobile:', result.mobile);
      console.log('verified:', result.verified);
      console.log('otp.email.verified:', result.otp?.email?.verified);
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error updating test user:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateTestUser();
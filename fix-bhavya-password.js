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

async function fixBhavyaPassword() {
  try {
    // Find the user
    const user = await User.findOne({ email: 'bhavyasharma2662@gmail.com' });
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Current user data:');
    console.log('ID:', user._id);
    console.log('Email:', user.email);
    console.log('acType:', user.acType);
    console.log('block:', user.block);
    console.log('Current password hash:', user.password);

    // Test current password
    const currentPasswordMatch = bcrypt.compareSync('password123', user.password);
    console.log('Current password matches:', currentPasswordMatch);

    if (!currentPasswordMatch) {
      // Hash new password
      const newHashedPassword = await bcrypt.hash('password123', 10);
      console.log('New password hash:', newHashedPassword);

      // Update password
      const result = await User.findOneAndUpdate(
        { email: 'bhavyasharma2662@gmail.com' },
        { $set: { password: newHashedPassword } },
        { new: true }
      );

      console.log('Password updated successfully');
      
      // Test new password
      const newPasswordMatch = bcrypt.compareSync('password123', result.password);
      console.log('New password matches:', newPasswordMatch);
    }
  } catch (error) {
    console.error('Error fixing user password:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixBhavyaPassword();
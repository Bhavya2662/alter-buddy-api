const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb+srv://alterbuddy8:lrp1NloOTKnTiQyI@alter-buddy.latngxs.mongodb.net/myApp?retryWrites=true&w=majority&appName=alter-buddy', {
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
  wallet: { type: Number, default: 0 },
  isDeactivated: { type: Boolean, default: false },
  deactivationType: { type: String, enum: ['temporary', 'permanent'] },
  deactivationReason: String,
  deactivationDate: Date,
  reactivationDate: Date,
  markedForDeletion: { type: Boolean, default: false },
  scheduledDeletionDate: Date,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function resetTestUser() {
  try {
    console.log('🔄 Resetting test user deactivation status...');
    
    const result = await User.findOneAndUpdate(
      { email: 'testuser@example.com' },
      {
        $set: {
          'deactivation.isDeactivated': false,
          'deactivation.markedForDeletion': false,
          block: false,
          online: false
        },
        $unset: {
          'deactivation.type': 1,
          'deactivation.reason': 1,
          'deactivation.deactivatedAt': 1,
          'deactivation.reactivationDate': 1,
          'deactivation.deletionScheduledAt': 1
        }
      },
      { new: true }
    );

    if (result) {
      console.log('✅ Test user reset successfully:');
      console.log('   - Email:', result.email);
      console.log('   - ID:', result._id);
      console.log('   - isDeactivated:', result.deactivation?.isDeactivated);
      console.log('   - markedForDeletion:', result.deactivation?.markedForDeletion);
      console.log('   - block:', result.block);
    } else {
      console.log('❌ Test user not found');
    }
  } catch (error) {
    console.error('❌ Error resetting test user:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

resetTestUser();
const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
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

async function checkUser() {
  try {
    const userId = '6893af3764b3ae9ab7485a0d';
    console.log('Checking user with ID:', userId);
    
    const user = await User.findOne({ _id: userId });
    
    if (user) {
      console.log('User found:');
      console.log('ID:', user._id);
      console.log('Name:', user.name?.firstName, user.name?.lastName);
      console.log('Email:', user.email);
      console.log('Mobile:', user.mobile);
      console.log('acType:', user.acType);
      console.log('block:', user.block);
      console.log('online:', user.online);
      console.log('verified:', user.verified);
      console.log('Created:', user.createdAt);
      console.log('Updated:', user.updatedAt);
      
      // Check if user meets AuthForUser requirements
      if (user.acType !== 'USER') {
        console.log('❌ ISSUE: User acType is not USER');
      } else {
        console.log('✅ User acType is correct');
      }
      
      if (user.block) {
        console.log('❌ ISSUE: User is blocked');
      } else {
        console.log('✅ User is not blocked');
      }
    } else {
      console.log('❌ User not found in database');
    }
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUser();
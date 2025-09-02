const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const UserSchema = new mongoose.Schema({
  name: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobile: { type: String, required: true },
  acType: { type: String, default: 'USER' },
  block: { type: Boolean, default: false },
  online: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
}, {
  timestamps: true,
});

const User = mongoose.model('User', UserSchema);

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@alterbuddy.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin._id);
      return existingAdmin;
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync('admin123', 10);

    // Create admin user
    const adminUser = new User({
      name: {
        firstName: 'Admin',
        lastName: 'User',
      },
      email: 'admin@alterbuddy.com',
      password: hashedPassword,
      mobile: '9999999999',
      acType: 'ADMIN',
      block: false,
      online: false,
      verified: true,
    });

    const savedAdmin = await adminUser.save();
    console.log('Admin user created successfully:', savedAdmin._id);
    return savedAdmin;
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.connection.close();
  }
}

createAdminUser();
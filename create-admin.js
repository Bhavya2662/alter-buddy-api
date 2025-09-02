const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User schema (simplified)
const userSchema = new mongoose.Schema({
  name: {
    firstName: String,
    lastName: String,
  },
  mobile: String,
  email: String,
  password: String,
  acType: String,
  verified: Boolean,
  block: Boolean,
  online: Boolean,
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@alterbuddy.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const admin = new User({
      name: {
        firstName: 'Admin',
        lastName: 'User',
      },
      mobile: '1234567890',
      email: 'admin@alterbuddy.com',
      password: hashedPassword,
      acType: 'ADMIN',
      verified: true,
      block: false,
      online: false,
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@alterbuddy.com');
    console.log('Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
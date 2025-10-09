const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const BASE_URL = 'http://localhost:8080/api/1.0';

// Connect to MongoDB directly
async function connectToDatabase() {
  try {
    const mongoUri = process.env.DB_PATH || 'mongodb://localhost:27017/alterbuddy';
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.log('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
}

// Define User schema (simplified)
const UserSchema = new mongoose.Schema({
  acType: { type: String, required: true, default: "USER" },
  email: { type: String, required: true, lowercase: true },
  password: { type: String },
  name: {
    firstName: { type: String, lowercase: true },
    lastName: { type: String, lowercase: true },
  },
  block: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  otp: {
    email: {
      code: { type: String },
      expiresAt: { type: Date },
      verified: { type: Boolean, default: false }
    }
  },
  canWriteBlog: { type: Boolean, default: false },
  deactivation: {
    isDeactivated: { type: Boolean, default: false },
  }
}, {
  timestamps: true,
});

const User = mongoose.model('User', UserSchema);

async function verifyDemoUserDirectly() {
  try {
    console.log('🔧 Verifying demo user directly in database...');
    
    // Find and update the demo user
    const updatedUser = await User.findOneAndUpdate(
      { email: 'demo@demo.com' },
      { 
        $set: { 
          verified: true,
          'otp.email.verified': true,
          canWriteBlog: true
        }
      },
      { new: true }
    );
    
    if (updatedUser) {
      console.log('✅ Demo user verified and blog permission granted directly in database');
      console.log('User ID:', updatedUser._id);
      console.log('Email verified:', updatedUser.verified);
      console.log('Can write blog:', updatedUser.canWriteBlog);
      return updatedUser;
    } else {
      console.log('❌ Demo user not found in database');
      return null;
    }
    
  } catch (error) {
    console.log('❌ Error updating user in database:', error.message);
    return null;
  }
}

async function testDemoUserLogin() {
  try {
    console.log('\n🧪 Testing demo user login...');
    
    const loginResponse = await axios.put(`${BASE_URL}/sign-in`, {
      mobileOrEmail: 'demo@demo.com',
      password: 'demo123'
    });
    
    if (loginResponse.data && loginResponse.data.data) {
      console.log('✅ Demo user login successful!');
      console.log('Full response:', JSON.stringify(loginResponse.data, null, 2));
      
      const userData = loginResponse.data.data;
      const userId = userData.user?._id || userData.userId || userData._id;
      const token = userData.token;
      
      console.log('User ID:', userId);
      console.log('Token:', token ? token.substring(0, 20) + '...' : 'No token');
      
      return {
        userId: userId,
        token: token,
        user: userData.user || userData
      };
    } else {
      console.log('❌ Login failed:', loginResponse.data);
      return null;
    }
    
  } catch (error) {
    console.log('❌ Login error:', error.response?.data || error.message);
    return null;
  }
}

async function testBlogCreation(token) {
  try {
    console.log('\n📝 Testing blog creation...');
    
    const blogData = {
      label: 'Demo Blog Post',
      subLabel: 'A test blog post created by demo user',
      body: 'This is a test blog post to verify that the demo user can create blogs.',
      htmlContent: '<p>This is a test blog post to verify that the demo user can create blogs.</p>',
      author: 'Demo User',
      tags: ['demo', 'test'],
      isPublished: true,
      readTime: 2
    };
    
    const response = await axios.post(`${BASE_URL}/blog`, blogData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Blog created successfully!');
    console.log('Blog ID:', response.data.data?._id || 'N/A');
    return true;
    
  } catch (error) {
    console.log('❌ Blog creation failed:', error.response?.data || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Verifying demo user and granting blog permissions...');
  
  // Connect to database
  const connected = await connectToDatabase();
  if (!connected) {
    console.log('❌ Cannot proceed without database connection');
    return;
  }
  
  // Verify user directly in database
  const user = await verifyDemoUserDirectly();
  if (!user) {
    console.log('❌ Failed to verify demo user');
    await mongoose.disconnect();
    return;
  }
  
  // Close database connection
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  
  // Test login
  const loginResult = await testDemoUserLogin();
  if (!loginResult) {
    console.log('❌ Login test failed');
    return;
  }
  
  // Test blog creation
  const blogCreated = await testBlogCreation(loginResult.token);
  
  if (blogCreated) {
    console.log('\n🎉 SUCCESS! Demo user can now create blogs!');
    console.log('\nSummary:');
    console.log('- Demo user email verified: ✅');
    console.log('- Blog permission granted: ✅');
    console.log('- Login working: ✅');
    console.log('- Blog creation working: ✅');
  } else {
    console.log('\n❌ Blog creation still not working');
  }
}

// Run the script
main().catch(console.error);
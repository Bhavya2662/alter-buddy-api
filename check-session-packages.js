const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.DB_PATH || 'mongodb://localhost:27017/alterbuddy';

async function checkSessionPackages() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Check existing session packages
    console.log('\n🔍 Checking Session Packages...');
    const packages = await db.collection('sessionpackages').find({}).limit(10).toArray();
    
    if (packages.length === 0) {
      console.log('❌ No session packages found in database');
    } else {
      console.log(`✅ Found ${packages.length} session packages:\n`);
      
      packages.forEach((pkg, index) => {
        console.log(`${index + 1}. Session Package:`);
        console.log(`   ID: ${pkg._id}`);
        console.log(`   User ID: ${pkg.userId}`);
        console.log(`   Mentor ID: ${pkg.mentorId}`);
        console.log(`   Type: ${pkg.type}`);
        console.log(`   Total Sessions: ${pkg.totalSessions}`);
        console.log(`   Remaining Sessions: ${pkg.remainingSessions}`);
        console.log(`   Price: ${pkg.price} coins`);
        console.log(`   Status: ${pkg.status}`);
        console.log(`   Created: ${pkg.createdAt}`);
        console.log(`   Expires: ${pkg.expiryDate}`);
        console.log('');
      });
    }
    
    // Check if we can update user verification status for testing
    console.log('\n🔍 Checking User Verification Status...');
    const users = await db.collection('users').find({}).limit(5).toArray();
    
    console.log(`Found ${users.length} users:\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. User:`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Mobile: ${user.mobile}`);
      console.log(`   Verified: ${user.isVerified}`);
      console.log(`   Email Verified: ${user.isEmailVerified}`);
      console.log(`   Mobile Verified: ${user.isMobileVerified}`);
      console.log('');
    });
    
    // Try to verify a user for testing purposes
    console.log('\n🔧 Attempting to verify a user for testing...');
    const testUser = users.find(u => u.email === 'kg224245@gmail.com');
    if (testUser) {
      const updateResult = await db.collection('users').updateOne(
        { _id: testUser._id },
        { 
          $set: { 
            verified: true
          }
        }
      );
      
      if (updateResult.modifiedCount > 0) {
        console.log(`✅ Successfully verified user: ${testUser.email}`);
      } else {
        console.log(`⚠️ User ${testUser.email} may already be verified or update failed`);
      }
    }
    
    // Check mentor passwords (we might need to reset them)
    console.log('\n🔍 Checking Mentor Authentication...');
    const mentors = await db.collection('mentors').find({}).limit(3).toArray();
    
    console.log(`Found ${mentors.length} mentors:\n`);
    mentors.forEach((mentor, index) => {
      console.log(`${index + 1}. Mentor:`);
      console.log(`   ID: ${mentor._id}`);
      console.log(`   Username: ${mentor.username}`);
      console.log(`   Email: ${mentor.email}`);
      console.log(`   Has Password: ${mentor.password ? 'Yes' : 'No'}`);
      console.log(`   Password Length: ${mentor.password ? mentor.password.length : 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

checkSessionPackages().catch(console.error);
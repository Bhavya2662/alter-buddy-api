const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
require('dotenv').config();

const MONGODB_URI = process.env.DB_PATH || 'mongodb://localhost:27017/alterbuddy';

async function resetUserPassword() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Find the verified user
    const testUser = await db.collection('users').findOne({ email: 'kg224245@gmail.com' });
    
    if (!testUser) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('📋 Current user details:');
    console.log('Email:', testUser.email);
    console.log('Mobile:', testUser.mobile);
    console.log('Verified:', testUser.verified);
    console.log('Current password hash:', testUser.password ? testUser.password.substring(0, 20) + '...' : 'No password');
    
    // Hash the new password
    const newPassword = 'password123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('\n🔧 Updating password...');
    const updateResult = await db.collection('users').updateOne(
      { _id: testUser._id },
      { 
        $set: { 
          password: hashedPassword
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log(`✅ Successfully updated password for user: ${testUser.email}`);
      console.log(`New password: ${newPassword}`);
      console.log(`New password hash: ${hashedPassword.substring(0, 20)}...`);
    } else {
      console.log(`⚠️ Password update failed or no changes made`);
    }
    
    // Also verify another user for testing
    console.log('\n🔧 Verifying another user for testing...');
    const anotherUser = await db.collection('users').findOne({ email: 'abc@gmail.com' });
    if (anotherUser) {
      const anotherHashedPassword = await bcrypt.hash('password123', saltRounds);
      const updateResult2 = await db.collection('users').updateOne(
        { _id: anotherUser._id },
        { 
          $set: { 
            verified: true,
            password: anotherHashedPassword
          }
        }
      );
      
      if (updateResult2.modifiedCount > 0) {
        console.log(`✅ Successfully verified and updated password for: ${anotherUser.email}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

resetUserPassword().catch(console.error);
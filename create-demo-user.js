const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/1.0';

async function createDemoUser() {
  try {
    console.log('🔧 Creating demo user...');
    
    // Step 1: Register demo user
    console.log('\n1. Registering demo user...');
    const registerResponse = await axios.post(`${BASE_URL}/sign-up`, {
      email: 'demo@demo.com',
      password: 'demo123',
      name: {
        firstName: 'Demo',
        lastName: 'User'
      }
    });
    
    if (registerResponse.data && registerResponse.data.data) {
      console.log('✅ Demo user registered successfully');
      console.log('User ID:', registerResponse.data.data.userId);
      console.log('Token:', registerResponse.data.data.token.substring(0, 20) + '...');
      
      return {
        userId: registerResponse.data.data.userId,
        token: registerResponse.data.data.token
      };
    } else {
      console.log('❌ Failed to register demo user:', registerResponse.data);
      return null;
    }
    
  } catch (error) {
    if (error.response?.data?.message?.includes('already registered')) {
      console.log('ℹ️  Demo user already exists, trying to login...');
      
      try {
        const loginResponse = await axios.put(`${BASE_URL}/sign-in`, {
          mobileOrEmail: 'demo@demo.com',
          password: 'demo123'
        });
        
        if (loginResponse.data && loginResponse.data.data) {
          console.log('✅ Demo user login successful');
          return {
            userId: loginResponse.data.data.user._id,
            token: loginResponse.data.data.token
          };
        }
      } catch (loginError) {
        console.log('❌ Failed to login existing demo user:', loginError.response?.data || loginError.message);
        return null;
      }
    } else {
      console.log('❌ Error creating demo user:', error.response?.data || error.message);
      return null;
    }
  }
}

async function grantBlogPermission(userId, adminToken) {
  try {
    console.log('\n2. Granting blog permission to demo user...');
    
    const response = await axios.put(`${BASE_URL}/website/users/${userId}/grant-blog-permission`, {}, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Blog permission granted successfully:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Failed to grant blog permission:', error.response?.data || error.message);
    return false;
  }
}

async function loginAsAdmin() {
  try {
    console.log('\n🔑 Logging in as admin...');
    
    // Try common admin credentials
    const adminCredentials = [
      { email: 'admin@admin.com', password: 'admin123' },
      { email: 'admin@alterbuddy.com', password: 'admin123' },
      { email: 'admin@demo.com', password: 'admin123' }
    ];
    
    for (const creds of adminCredentials) {
      try {
        const response = await axios.put(`${BASE_URL}/admin/sign-in`, creds);
        
        if (response.data && response.data.data && response.data.data.token) {
          console.log(`✅ Admin login successful with ${creds.email}`);
          return response.data.data.token;
        }
      } catch (error) {
        console.log(`❌ Failed to login with ${creds.email}`);
      }
    }
    
    console.log('❌ Could not login as admin with any credentials');
    return null;
  } catch (error) {
    console.log('❌ Admin login error:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Setting up demo user with blog permissions...');
  
  // Step 1: Create/get demo user
  const demoUser = await createDemoUser();
  if (!demoUser) {
    console.log('❌ Failed to create or login demo user');
    return;
  }
  
  // Step 2: Login as admin
  const adminToken = await loginAsAdmin();
  if (!adminToken) {
    console.log('❌ Failed to login as admin');
    return;
  }
  
  // Step 3: Grant blog permission
  const permissionGranted = await grantBlogPermission(demoUser.userId, adminToken);
  
  if (permissionGranted) {
    console.log('\n🎉 Demo user setup complete!');
    console.log('Demo user credentials:');
    console.log('  Email: demo@demo.com');
    console.log('  Password: demo123');
    console.log('  Blog Permission: ✅ Granted');
  } else {
    console.log('\n⚠️  Demo user created but blog permission not granted');
    console.log('You may need to grant permission manually from the admin panel');
  }
}

main();
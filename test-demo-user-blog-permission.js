const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/1.0';

async function testDemoUserBlogPermission() {
  try {
    console.log('🔍 Testing demo user blog permissions...');
    
    // Step 1: Login as demo user
    console.log('\n1. Logging in as demo user...');
    const loginResponse = await axios.put(`${BASE_URL}/sign-in`, {
      mobileOrEmail: 'demo@demo.com', // Assuming demo user email
      password: 'demo123' // Assuming demo user password
    });
    
    if (loginResponse.data && loginResponse.data.success && loginResponse.data.data && loginResponse.data.data.token) {
      const token = loginResponse.data.data.token;
      console.log('✅ Demo user login successful');
      console.log('Token:', token.substring(0, 20) + '...');
      
      // Step 2: Get user profile
      console.log('\n2. Fetching user profile...');
      const profileResponse = await axios.get(`${BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (profileResponse.data) {
        console.log('✅ User profile fetched successfully');
        console.log('Full profile response:', JSON.stringify(profileResponse.data, null, 2));
        
        const userData = profileResponse.data.data || profileResponse.data;
        console.log('User ID:', userData._id);
        console.log('User Name:', userData.name?.firstName, userData.name?.lastName);
        console.log('User Email:', userData.email);
        console.log('Can Write Blog:', userData.canWriteBlog);
        
        if (userData.canWriteBlog) {
          console.log('\n🎉 Demo user HAS blog writing permissions!');
          
          // Step 3: Test blog creation endpoint
          console.log('\n3. Testing blog creation endpoint...');
          const testBlogData = {
            body: 'This is a test blog content.',
            label: 'Test Blog Title',
            subLabel: 'Test blog subtitle',
            blogLink: 'test-blog-' + Date.now(),
            htmlContent: '<p>This is a test blog content.</p>',
            author: userData.name?.firstName + ' ' + userData.name?.lastName,
            tags: ['test'],
            isPublished: false, // Don't publish test blog
            readTime: 2
          };
          
          try {
            const blogResponse = await axios.post(`${BASE_URL}/blog`, testBlogData, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            console.log('✅ Blog creation test successful:', blogResponse.data);
          } catch (blogError) {
            console.log('❌ Blog creation test failed:', blogError.response?.data || blogError.message);
          }
          
        } else {
          console.log('\n❌ Demo user does NOT have blog writing permissions!');
          console.log('\n🔧 The admin needs to grant blog permissions to this user.');
        }
        
      } else {
        console.log('❌ Failed to fetch user profile');
      }
      
    } else {
      console.log('❌ Demo user login failed');
      console.log('Response:', loginResponse.data);
      return;
    }
    
  } catch (error) {
    console.log('❌ Error during test:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Possible issues:');
      console.log('   - Demo user credentials might be incorrect');
      console.log('   - Demo user might not exist');
      console.log('   - Try different credentials like:');
      console.log('     Email: demo@example.com, Password: password123');
      console.log('     Email: test@test.com, Password: test123');
    }
  }
}

// Run the test
testDemoUserBlogPermission();
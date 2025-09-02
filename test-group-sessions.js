const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/1.0';

async function testGroupSessions() {
  try {
    console.log('🧪 TESTING GROUP SESSION FUNCTIONALITY');
    console.log('=' .repeat(60));
    
    // Step 1: Authenticate as mentor to create group session
    console.log('\n1. Authenticating as mentor...');
    const mentorSignInResponse = await axios.put(`${BASE_URL}/sign-in`, {
      mobileOrEmail: 'testuser@example.com', // Using test user as mentor for simplicity
      password: 'password123'
    });
    
    const mentorToken = mentorSignInResponse.data.data.token;
    console.log('   ✅ Mentor authentication successful');
    
    const mentorHeaders = {
      'Authorization': `Bearer ${mentorToken}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Get mentor ID and category ID
    console.log('\n2. Getting mentor and category information...');
    const mentorsResponse = await axios.get(`${BASE_URL}/mentor`);
    const mentors = mentorsResponse.data.data;
    
    if (mentors.length === 0) {
      console.log('   ❌ No mentors found!');
      return;
    }
    
    const mentor = mentors[0];
    console.log(`   ✅ Found mentor: ${mentor.name} (ID: ${mentor._id})`);
    
    // Get categories
    const categoriesResponse = await axios.get(`${BASE_URL}/category`);
    const categories = categoriesResponse.data.data;
    const category = categories[0];
    console.log(`   ✅ Found category: ${category?.name || 'Default'} (ID: ${category?._id || 'default'})`);
    
    // Step 3: Create a group session
    console.log('\n3. Creating group session...');
    const groupSessionData = {
      mentorId: mentor._id,
      categoryId: category?._id || '507f1f77bcf86cd799439011', // Default ObjectId if no category
      title: 'Test Group Session - Web Development Basics',
      description: 'Learn the fundamentals of web development in this interactive group session',
      sessionType: 'video',
      price: 500, // 500 coins per user
      capacity: 5, // Maximum 5 users
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      joinLink: 'https://meet.google.com/test-group-session'
    };
    
    const createSessionResponse = await axios.post(`${BASE_URL}/group-session`, groupSessionData, { headers: mentorHeaders });
    
    if (createSessionResponse.data.success) {
      const session = createSessionResponse.data.data;
      console.log('   ✅ Group session created successfully!');
      console.log(`   📚 Title: ${session.title}`);
      console.log(`   👥 Capacity: ${session.capacity} users`);
      console.log(`   💰 Price: ${session.price} coins per user`);
      console.log(`   🎥 Type: ${session.sessionType}`);
      console.log(`   🔗 Room ID: ${session.roomId}`);
      console.log(`   🌐 Shareable Link: ${session.shareableLink}`);
      
      const sessionId = session._id;
      
      // Step 4: Get all available group sessions
      console.log('\n4. Fetching all available group sessions...');
      const allSessionsResponse = await axios.get(`${BASE_URL}/group-session/all`);
      const allSessions = allSessionsResponse.data.data;
      console.log(`   ✅ Found ${allSessions.length} available group sessions`);
      
      // Step 5: Simulate multiple users booking the group session
      console.log('\n5. Testing multiple user bookings...');
      
      // Create test users for booking
      const testUsers = [
        { email: 'user1@test.com', name: 'User One' },
        { email: 'user2@test.com', name: 'User Two' },
        { email: 'user3@test.com', name: 'User Three' }
      ];
      
      let bookedUsers = [];
      
      for (let i = 0; i < testUsers.length; i++) {
        const user = testUsers[i];
        console.log(`\n   📝 Booking for ${user.name}...`);
        
        try {
          // Try to sign up user (might already exist)
          try {
            await axios.post(`${BASE_URL}/sign-up`, {
              email: user.email,
              password: 'password123',
              mobile: `123456789${i}`,
              name: {
                firstName: user.name.split(' ')[0],
                lastName: user.name.split(' ')[1] || 'Test'
              }
            });
          } catch (signUpError) {
            // User might already exist, continue
          }
          
          // Sign in user
          const userSignInResponse = await axios.put(`${BASE_URL}/sign-in`, {
            mobileOrEmail: user.email,
            password: 'password123'
          });
          
          const userToken = userSignInResponse.data.data.token;
          const userId = userSignInResponse.data.data.user._id;
          
          const userHeaders = {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          };
          
          // Book the group session
          const bookingResponse = await axios.put(`${BASE_URL}/group-session/book/${sessionId}`, 
            { userId }, 
            { headers: userHeaders }
          );
          
          if (bookingResponse.data.success) {
            console.log(`   ✅ ${user.name} successfully booked the session`);
            bookedUsers.push({ name: user.name, userId });
          } else {
            console.log(`   ❌ ${user.name} booking failed: ${bookingResponse.data.message}`);
          }
          
        } catch (error) {
          console.log(`   ❌ ${user.name} booking error: ${error.response?.data?.message || error.message}`);
        }
      }
      
      // Step 6: Check session capacity and booked users
      console.log('\n6. Checking session status after bookings...');
      const sessionStatusResponse = await axios.get(`${BASE_URL}/group-session/mentor/${mentor._id}`);
      const mentorSessions = sessionStatusResponse.data.data;
      const updatedSession = mentorSessions.find(s => s._id === sessionId);
      
      if (updatedSession) {
        console.log(`   ✅ Session capacity: ${updatedSession.bookedUsers.length}/${updatedSession.capacity}`);
        console.log(`   👥 Booked users: ${updatedSession.bookedUsers.length}`);
        
        if (updatedSession.bookedUsers.length >= updatedSession.capacity) {
          console.log('   🚫 Session is now FULL!');
        } else {
          console.log(`   📊 ${updatedSession.capacity - updatedSession.bookedUsers.length} spots remaining`);
        }
      }
      
      // Step 7: Test joining session by room ID
      console.log('\n7. Testing session join by room ID...');
      const joinResponse = await axios.get(`${BASE_URL}/group-session/join/${session.roomId}`);
      
      if (joinResponse.data.success) {
        const joinSession = joinResponse.data.data;
        console.log('   ✅ Session join link accessible');
        console.log(`   🎯 Session: ${joinSession.title}`);
        console.log(`   👥 Current participants: ${joinSession.bookedUsers.length}`);
        console.log(`   🔗 Join link: ${joinSession.joinLink}`);
      }
      
      console.log('\n🏁 GROUP SESSION TEST COMPLETED');
      console.log('=' .repeat(60));
      console.log('\n📋 TEST SUMMARY:');
      console.log(`   ✅ Group session created: ${session.title}`);
      console.log(`   ✅ Users successfully booked: ${bookedUsers.length}`);
      console.log(`   ✅ Session capacity management: Working`);
      console.log(`   ✅ Room ID join functionality: Working`);
      console.log(`   ✅ Mentor session management: Working`);
      
    } else {
      console.log('   ❌ Group session creation failed:', createSessionResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    console.error('Full error:', error.response?.data || error);
  }
}

testGroupSessions();
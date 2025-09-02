const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/1.0';

async function testBookingFlow() {
  try {
    console.log('=== Testing Booking Flow ===');
    
    // Step 1: Create a test user
    console.log('\n1. Creating test user...');
    try {
      const signUpResponse = await axios.post(`${BASE_URL}/sign-up`, {
        email: 'testuser@example.com',
        password: 'password123',
        mobile: '1234567890',
        name: {
          firstName: 'Test',
          lastName: 'User'
        }
      });
      console.log('User created:', signUpResponse.data);
    } catch (error) {
      const errorData = error.response?.data;
      if (typeof errorData === 'string' && errorData.includes('already registered')) {
        console.log('User already exists, proceeding to login...');
      } else {
        console.log('Sign up error:', errorData || error.message);
      }
    }
    
    // Step 2: Sign in to get token
    console.log('\n2. Signing in...');
    const signInResponse = await axios.put(`${BASE_URL}/sign-in`, {
      mobileOrEmail: 'testuser@example.com',
      password: 'password123'
    });
    
    const token = signInResponse.data.data.token;
    console.log('Login successful, token:', token.substring(0, 50) + '...');
    
    // Step 3: Get mentors list to find a valid mentor ID
    console.log('\n3. Getting mentors list...');
    const mentorsResponse = await axios.get(`${BASE_URL}/mentor`);
    const mentors = mentorsResponse.data.data;
    
    if (mentors.length === 0) {
      console.log('No mentors found!');
      return;
    }
    
    const mentor = mentors[0];
    console.log(`Found mentor: ${mentor.name.firstName} ${mentor.name.lastName} (ID: ${mentor._id})`);
    
    // Step 4: Try to book a slot
    console.log('\n4. Attempting to book slot...');
    const bookingResponse = await axios.put(`${BASE_URL}/slot/book`, {
      mentorId: mentor._id,
      callType: 'video',
      time: '10:00 AM',
      type: 'instant',
      slotId: '676b8b8b8b8b8b8b8b8b8b8c' // This might be invalid, but let's see what happens
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Booking successful:', bookingResponse.data);
    
  } catch (error) {
    console.log('\nError occurred:');
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    console.log('Message:', error.message);
  }
}

testBookingFlow();
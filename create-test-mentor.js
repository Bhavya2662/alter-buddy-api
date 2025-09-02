const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/1.0';

async function createTestMentor() {
  try {
    console.log('Authenticating as admin...');
    
    // First, authenticate as admin
    const adminLoginResponse = await axios.put(`${API_BASE_URL}/admin/sign-in`, {
      email: 'admin@alterbuddy.com',
      password: 'admin123'
    });
    
    const adminToken = adminLoginResponse.data.data.token;
    console.log('Admin authenticated successfully');
    
    console.log('Creating test mentor account...');
    
    const mentorData = {
      auth: {
        username: 'testmentor',
        password: 'password123'
      },
      name: {
        firstName: 'Test',
        lastName: 'Mentor'
      },
      contact: {
        email: 'testmentor@example.com',
        mobile: '9876543210',
        address: 'Test Address'
      },
      category: [],
      specialists: ['General Counseling'],
      languages: ['English'],
      description: 'Test mentor for recording access verification',
      qualification: 'Test Qualification',
      image: 'test-image.jpg'
    };

    const response = await axios.post(`${API_BASE_URL}/mentor/sign-up`, mentorData, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Test mentor created successfully:', response.data);
    console.log('Username: testmentor');
    console.log('Password: password123');
    
  } catch (error) {
    console.error('Full error object:', error);
    console.error('Error response:', error.response);
    console.error('Error response data:', error.response?.data);
    console.error('Error message:', error.message);
    
    if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('already registered')) {
      console.log('Test mentor already exists');
    } else {
      console.error('Error creating test mentor:', error.response?.data || error.message);
    }
  }
}

createTestMentor();
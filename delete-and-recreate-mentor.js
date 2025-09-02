const axios = require('axios');
const mongoose = require('mongoose');

const API_BASE_URL = 'http://localhost:8080/api/1.0';

// Define Mentor schema (simplified)
const mentorSchema = new mongoose.Schema({
  auth: {
    username: String,
    password: String
  },
  name: {
    firstName: String,
    lastName: String
  },
  acType: String
}, { collection: 'mentors' });

const Mentor = mongoose.model('Mentor', mentorSchema);

async function deleteAndRecreateMentor() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://alterbuddy8:lrp1NloOTKnTiQyI@alter-buddy.latngxs.mongodb.net/myApp?retryWrites=true&w=majority&appName=alter-buddy', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to database');
    
    // Delete existing mentor
    const deleteResult = await Mentor.deleteOne({ 'auth.username': 'testmentor' });
    console.log('Deleted mentor:', deleteResult.deletedCount > 0 ? 'Success' : 'Not found');
    
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    
    // Now create new mentor via API
    console.log('\nAuthenticating as admin...');
    
    const adminLoginResponse = await axios.put(`${API_BASE_URL}/admin/sign-in`, {
      email: 'admin@alterbuddy.com',
      password: 'admin123'
    });
    
    const adminToken = adminLoginResponse.data.data.token;
    console.log('Admin authenticated successfully');
    
    console.log('Creating new test mentor account...');
    
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
    
    console.log('New test mentor created successfully!');
    console.log('Username: testmentor');
    console.log('Password: password123');
    
    // Test the new mentor login
    console.log('\nTesting mentor login...');
    const loginResponse = await axios.put(`${API_BASE_URL}/mentor/sign-in`, {
      username: 'testmentor',
      password: 'password123'
    });
    
    console.log('✅ Mentor login successful!');
    console.log('Token received:', loginResponse.data.data.token ? 'Yes' : 'No');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

deleteAndRecreateMentor();
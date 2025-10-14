const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/1.0';

async function seedSecondMentorWithSlots() {
  const mentorCreds = {
    username: 'videomentor',
    password: 'password123',
    email: 'videomentor@example.com',
    mobile: '9876500001',
    firstName: 'Video',
    lastName: 'Mentor'
  };

  try {
    console.log('🔐 Authenticating as admin...');
    const adminLoginResponse = await axios.put(`${API_BASE_URL}/admin/sign-in`, {
      email: 'admin@alterbuddy.com',
      password: 'admin123'
    });
    const adminToken = adminLoginResponse.data?.data?.token;
    if (!adminToken) throw new Error('Admin token not received');
    console.log('✅ Admin authenticated');

    console.log('👤 Creating second mentor account (or skipping if exists)...');
    const mentorData = {
      auth: {
        username: mentorCreds.username,
        password: mentorCreds.password
      },
      name: {
        firstName: mentorCreds.firstName,
        lastName: mentorCreds.lastName
      },
      contact: {
        email: mentorCreds.email,
        mobile: mentorCreds.mobile,
        address: 'Seeded Address'
      },
      category: [],
      specialists: ['General Counseling'],
      languages: ['English'],
      description: 'Seeded mentor for multi-mentor booking scenario',
      qualification: 'Licensed Therapist',
      image: 'seed-image.jpg'
    };

    let created = false;
    try {
      const response = await axios.post(`${API_BASE_URL}/mentor/sign-up`, mentorData, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Second mentor created:', response.data?.data || response.data);
      created = true;
    } catch (error) {
      const msg = error.response?.data || error.message;
      // If already exists, proceed
      if (typeof msg === 'string' && msg.toLowerCase().includes('already registered')) {
        console.log('ℹ️ Mentor already exists, proceeding to sign-in.');
      } else {
        console.warn('⚠️ Create mentor error (will still try sign-in):', msg);
      }
    }

    console.log('🔑 Signing in as mentor to obtain token...');
    let mentorToken;

    // Ensure mentor is verified: fetch mentor ID and set verification true via admin
    console.log('🔍 Fetching mentors to find seeded mentor ID...');
    const mentorsList = await axios.get(`${API_BASE_URL}/mentor/all`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const mentors = mentorsList.data?.data || mentorsList.data;
    const seededMentor = Array.isArray(mentors) ? mentors.find(m => (m.contact?.email || '').toLowerCase() === mentorCreds.email.toLowerCase()) : null;
    if (!seededMentor) {
      throw new Error('Seeded mentor not found in /mentor/all list');
    }
    const mentorId = seededMentor._id;

    console.log('✅ Found mentor ID:', mentorId);
    console.log('✅ Verifying mentor account via admin...');
    await axios.put(`${API_BASE_URL}/mentor/update/${mentorId}`, {
      'accountStatus.verification': true,
      'accountStatus.block': false
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    try {
      const mentorLoginResponse = await axios.put(`${API_BASE_URL}/mentor/sign-in`, {
        email: mentorCreds.email,
        password: mentorCreds.password
      });
      mentorToken = mentorLoginResponse.data?.data?.token || mentorLoginResponse.data?.token;
    } catch (e) {
      console.error('❌ Mentor email sign-in failed:', e.response?.data || e.message);
      throw e;
    }

    if (!mentorToken) throw new Error('Mentor token not received');
    console.log('✅ Mentor authenticated');

    // Prepare slots for tomorrow
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];

    const scheduleData = {
      slots: [
        { time: '11:00 AM', callType: 'video', duration: 30, status: 'available', booked: false },
        { time: '01:00 PM', callType: 'video', duration: 30, status: 'available', booked: false },
        { time: '03:00 PM', callType: 'video', duration: 30, status: 'available', booked: false }
      ],
      slotsDate: dateString
    };

    console.log('📅 Scheduling video slots for', dateString);
    const scheduleResponse = await axios.post(`${API_BASE_URL}/mentor/schedule`, scheduleData, {
      headers: {
        'Authorization': `Bearer ${mentorToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Slots scheduled successfully');
    console.log('📊 Schedule Response:', JSON.stringify(scheduleResponse.data, null, 2));

    // Verify schedules
    console.log('🔍 Fetching mentor schedules to verify...');
    const schedulesResponse = await axios.get(`${API_BASE_URL}/mentor/schedule`, {
      headers: {
        'Authorization': `Bearer ${mentorToken}`
      }
    });

    console.log('📋 Current schedules:', JSON.stringify(schedulesResponse.data, null, 2));
    console.log('🎉 Seeding completed.');

  } catch (error) {
    console.error('❌ Error during seeding:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    process.exit(1);
  }
}

seedSecondMentorWithSlots();
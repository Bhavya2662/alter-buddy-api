const axios = require('axios');

async function checkMentorAuth() {
    try {
        console.log('Testing mentor authentication...');
        
        // First, try to login with test mentor credentials
        const loginResponse = await axios.put('http://localhost:8080/mentor/sign-in', {
            username: 'testmentor',
            password: 'password123'
        });
        
        console.log('Login successful!');
        console.log('Token:', loginResponse.data.data.token);
        
        const token = loginResponse.data.data.token;
        
        // Now try to fetch mentor schedules with the token
        const schedulesResponse = await axios.get('http://localhost:8080/mentor/schedule', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('\nMentor schedules fetched successfully!');
        console.log('Number of schedules:', schedulesResponse.data.data.length);
        
        // Check if our 12 PM slot exists
        const today = new Date().toISOString().split('T')[0];
        const todaySchedule = schedulesResponse.data.data.find(schedule => 
            schedule.slotsDate === today
        );
        
        if (todaySchedule) {
            console.log('\n✅ Found schedule for today:', today);
            console.log('Slots:', todaySchedule.slots.map(slot => slot.time));
            
            const twelvePMSlot = todaySchedule.slots.find(slot => slot.time === '12:00 PM');
            if (twelvePMSlot) {
                console.log('\n🎉 12 PM slot found!');
                console.log('Slot details:', twelvePMSlot);
            } else {
                console.log('\n❌ 12 PM slot not found in today\'s schedule');
            }
        } else {
            console.log('\n❌ No schedule found for today:', today);
        }
        
    } catch (error) {
        console.error('Error details:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n❌ Backend server is not running on port 8080');
            console.error('Please start the backend server first');
        }
    }
}

checkMentorAuth();
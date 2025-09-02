const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Connect to MongoDB
mongoose.connect('mongodb+srv://alterbuddy8:lrp1NloOTKnTiQyI@alter-buddy.latngxs.mongodb.net/myApp?retryWrites=true&w=majority&appName=alter-buddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

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

async function checkMentorData() {
  try {
    console.log('Checking mentor data...');
    
    const mentor = await Mentor.findOne({ 'auth.username': 'testmentor' });
    
    if (!mentor) {
      console.log('❌ Mentor not found');
      return;
    }
    
    console.log('✅ Mentor found:');
    console.log('Username:', mentor.auth.username);
    console.log('Password (hashed):', mentor.auth.password);
    console.log('Account Type:', mentor.acType);
    console.log('Name:', mentor.name?.firstName, mentor.name?.lastName);
    
    // Test password comparison
    const testPassword = 'password123';
    const isValid = await bcrypt.compare(testPassword, mentor.auth.password);
    console.log('\n🔐 Password Test:');
    console.log('Test password:', testPassword);
    console.log('Password valid:', isValid);
    
    // Also test if it's stored as plain text (shouldn't be)
    const isPlainText = testPassword === mentor.auth.password;
    console.log('Is plain text:', isPlainText);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkMentorData();
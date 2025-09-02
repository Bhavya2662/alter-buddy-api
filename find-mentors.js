const mongoose = require('mongoose');
const config = require('config');

mongoose.connect(config.get('DB_PATH'), { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new mongoose.Schema({
  name: { firstName: String, lastName: String },
  email: String,
  accountType: String,
});

const User = mongoose.model('User', UserSchema);

async function findMentors() {
  try {
    const mentors = await User.find({ accountType: 'MENTOR' }).limit(5);
    console.log('Available mentors:');
    mentors.forEach(mentor => {
      console.log('ID:', mentor._id);
      console.log('Name:', mentor.name?.firstName, mentor.name?.lastName);
      console.log('Email:', mentor.email);
      console.log('---');
    });
    
    if (mentors.length === 0) {
      console.log('No mentors found. Checking all users...');
      const allUsers = await User.find({}).limit(5);
      allUsers.forEach(user => {
        console.log('ID:', user._id, 'Type:', user.accountType, 'Email:', user.email);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

findMentors();
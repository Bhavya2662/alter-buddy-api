const mongoose = require('mongoose');
const config = require('config');

mongoose.connect(config.get('DB_PATH'), { useNewUrlParser: true, useUnifiedTopology: true });

const ChatSchema = new mongoose.Schema({
  mentorId: mongoose.Schema.Types.ObjectId,
  userId: mongoose.Schema.Types.ObjectId,
  callType: String,
  sessionDetails: {
    duration: String
  }
}, { timestamps: true });

const Chat = mongoose.model('Chat', ChatSchema);

async function checkSessions() {
  try {
    const sessions = await Chat.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('Recent sessions:');
    sessions.forEach((session, index) => {
      console.log(`${index + 1}. Mentor ID: ${session.mentorId}`);
      console.log(`   User ID: ${session.userId}`);
      console.log(`   Call Type: ${session.callType}`);
      console.log(`   Duration: ${session.sessionDetails?.duration || 'N/A'}`);
      console.log(`   Created: ${session.createdAt}`);
      console.log('---');
    });
    
    // Get unique mentor IDs
    const uniqueMentorIds = [...new Set(sessions.map(s => s.mentorId?.toString()).filter(Boolean))];
    console.log('\nUnique Mentor IDs found:');
    uniqueMentorIds.forEach(id => console.log(id));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkSessions();
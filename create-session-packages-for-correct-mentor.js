const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('📦 Connected to MongoDB');
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Define SessionPackage schema
const SessionPackageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  type: { type: String, enum: ["chat", "audio", "video"], required: true },
  totalSessions: { type: Number, required: true },
  remainingSessions: { type: Number, required: true },
  price: { type: Number, required: true },
  duration: { type: Number, required: true },
  status: { type: String, enum: ["active", "expired", "cancelled"], default: "active" },
  purchaseDate: { type: Date, default: Date.now },
  expiryDate: { type: Date }
}, { timestamps: true });

const SessionPackage = mongoose.model('SessionPackage', SessionPackageSchema);

const TEST_USER_ID = '68a2ffa2e50fb244ba4905dd'; // Updated to use working user token
const TEST_MENTOR_ID = '68a3849fa4e79f23deb23bf1'; // Correct mentor ID from Mentor collection
const TEST_CATEGORY_ID = '676a0b5b2a73a70013a718c9';

async function createSessionPackagesForCorrectMentor() {
  try {
    console.log('🔄 Creating session packages for correct mentor...');
    
    // Delete existing session packages for this user to avoid conflicts
    const deleteResult = await SessionPackage.deleteMany({ userId: TEST_USER_ID });
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing session packages`);
    
    // Create new session packages for the correct mentor
    const packages = [
      {
        userId: TEST_USER_ID,
        mentorId: TEST_MENTOR_ID,
        categoryId: TEST_CATEGORY_ID,
        type: 'chat',
        totalSessions: 5,
        remainingSessions: 5,
        price: 500,
        duration: 30,
        status: 'active',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      {
        userId: TEST_USER_ID,
        mentorId: TEST_MENTOR_ID,
        categoryId: TEST_CATEGORY_ID,
        type: 'audio',
        totalSessions: 3,
        remainingSessions: 3,
        price: 600,
        duration: 45,
        status: 'active',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        userId: TEST_USER_ID,
        mentorId: TEST_MENTOR_ID,
        categoryId: TEST_CATEGORY_ID,
        type: 'video',
        totalSessions: 2,
        remainingSessions: 2,
        price: 800,
        duration: 60,
        status: 'active',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    ];
    
    const createdPackages = await SessionPackage.insertMany(packages);
    
    console.log('✅ Successfully created session packages:');
    createdPackages.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.type.toUpperCase()}: ${pkg.totalSessions} sessions, ID: ${pkg._id}`);
    });
    
    console.log('\n📊 Summary:');
    console.log(`   User ID: ${TEST_USER_ID}`);
    console.log(`   Mentor ID: ${TEST_MENTOR_ID}`);
    console.log(`   Category ID: ${TEST_CATEGORY_ID}`);
    console.log(`   Total packages created: ${createdPackages.length}`);
    
  } catch (error) {
    console.error('❌ Error creating session packages:', error);
  } finally {
    mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createSessionPackagesForCorrectMentor();
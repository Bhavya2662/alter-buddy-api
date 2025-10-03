const mongoose = require('mongoose');
const config = require('config');
const axios = require('axios');

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

// Define Packages schema
const PackagesSchema = new mongoose.Schema({
  packageType: { type: String, required: true },
  price: { type: Number, required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", required: true },
}, { timestamps: true });

const Packages = mongoose.model('Packages', PackagesSchema);

// Define Mentor schema to find the mentor
const MentorSchema = new mongoose.Schema({
  auth: {
    username: String,
    password: String
  },
  name: {
    firstName: String,
    lastName: String
  },
  contact: {
    email: String,
    phone: String
  },
  category: String,
  specialists: [String],
  accountStatus: String,
  acType: String
}, { timestamps: true });

const Mentor = mongoose.model('Mentor', MentorSchema);

async function createPackagesForTestMentor() {
  try {
    console.log('🔍 Finding testmentor...');
    
    // Find the mentor by username
    const mentor = await Mentor.findOne({ 'auth.username': 'testmentor' });
    
    if (!mentor) {
      console.error('❌ testmentor not found in database');
      process.exit(1);
    }
    
    const mentorId = mentor._id;
    console.log('✅ Found testmentor with ID:', mentorId);
    
    // Check if packages already exist
    const existingPackages = await Packages.find({ mentorId });
    if (existingPackages.length > 0) {
      console.log('⚠️  Packages already exist for testmentor:');
      existingPackages.forEach(pkg => {
        console.log(`   ${pkg.packageType}: $${pkg.price}/minute (ID: ${pkg._id})`);
      });
      return;
    }
    
    console.log('📦 Creating packages for testmentor...');
    
    // Create packages for different call types
    const packages = [
      {
        packageType: 'chat',
        price: 2, // $2 per minute
        mentorId: mentorId
      },
      {
        packageType: 'audio',
        price: 3, // $3 per minute
        mentorId: mentorId
      },
      {
        packageType: 'video',
        price: 5, // $5 per minute
        mentorId: mentorId
      }
    ];
    
    // Insert packages
    const createdPackages = await Packages.insertMany(packages);
    
    console.log('✅ Successfully created packages:');
    createdPackages.forEach(pkg => {
      console.log(`   ${pkg.packageType}: $${pkg.price}/minute (ID: ${pkg._id})`);
    });
    
    console.log('\n💰 Pricing summary:');
    console.log('   Chat (30 min): $' + (2 * 30));
    console.log('   Audio (30 min): $' + (3 * 30));
    console.log('   Video (30 min): $' + (5 * 30));
    console.log('\n🎉 testmentor packages setup complete!');
    
  } catch (error) {
    console.error('❌ Error creating packages for testmentor:', error);
  } finally {
    mongoose.connection.close();
  }
}

createPackagesForTestMentor();
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

// Define Packages schema
const PackagesSchema = new mongoose.Schema({
  packageType: { type: String, required: true },
  price: { type: Number, required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", required: true },
}, { timestamps: true });

const Packages = mongoose.model('Packages', PackagesSchema);

async function createMentorPackages() {
  try {
    console.log('📦 Creating packages for mentor...');
    
    const mentorId = '68a37ad37de01f8431c91ee3';
    
    // Check if packages already exist
    const existingPackages = await Packages.find({ mentorId });
    if (existingPackages.length > 0) {
      console.log('⚠️  Packages already exist for this mentor:');
      existingPackages.forEach(pkg => {
        console.log(`   ${pkg.packageType}: $${pkg.price}/minute`);
      });
      return;
    }
    
    // Create packages for different call types
    const packages = [
      {
        packageType: 'chat',
        price: 2, // $2 per minute
        mentorId: new mongoose.Types.ObjectId(mentorId)
      },
      {
        packageType: 'audio',
        price: 3, // $3 per minute
        mentorId: new mongoose.Types.ObjectId(mentorId)
      },
      {
        packageType: 'video',
        price: 5, // $5 per minute
        mentorId: new mongoose.Types.ObjectId(mentorId)
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
    console.log('\n🎉 Mentor packages setup complete!');
    
  } catch (error) {
    console.error('❌ Error creating mentor packages:', error);
  } finally {
    mongoose.connection.close();
  }
}

createMentorPackages();
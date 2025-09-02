const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Package schema
const PackageSchema = new mongoose.Schema({
  packageType: { type: String, required: true },
  price: { type: Number, required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor" },
  subServices: [{
    type: String
  }]
}, { timestamps: true });

const Packages = mongoose.model('Package', PackageSchema);

async function createMentorPackages() {
  try {
    const mentorId = '68a3849fa4e79f23deb23bf1';
    
    // Check if packages already exist for this mentor
    const existingPackages = await Packages.find({ mentorId: new mongoose.Types.ObjectId(mentorId) });
    
    if (existingPackages.length > 0) {
      console.log('Packages already exist for this mentor:', existingPackages.length);
      return;
    }
    
    // Create packages for the mentor
    const packages = [
      {
        packageType: 'chat',
        price: 2,
        mentorId: new mongoose.Types.ObjectId(mentorId),
        subServices: []
      },
      {
        packageType: 'audio',
        price: 3,
        mentorId: new mongoose.Types.ObjectId(mentorId),
        subServices: []
      },
      {
        packageType: 'video',
        price: 5,
        mentorId: new mongoose.Types.ObjectId(mentorId),
        subServices: []
      }
    ];
    
    const createdPackages = await Packages.insertMany(packages);
    console.log('Created packages for mentor:', createdPackages.length);
    console.log('Package IDs:', createdPackages.map(p => p._id));
    
  } catch (error) {
    console.error('Error creating mentor packages:', error);
  } finally {
    mongoose.connection.close();
  }
}

createMentorPackages();
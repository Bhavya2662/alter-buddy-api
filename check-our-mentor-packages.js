const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Package schema
const PackageSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  packageType: { type: String, required: true },
  packageName: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", required: true },
  subServices: [String],
}, { timestamps: true });

const Packages = mongoose.model('Package', PackageSchema);

async function checkPackages() {
  try {
    const mentorId = '68736084e846910f077f3d5e';
    console.log('Checking packages for mentor:', mentorId);
    
    const packages = await Packages.find({ mentorId });
    console.log('Found packages:', packages.length);
    
    packages.forEach(pkg => {
      console.log(`- ${pkg.packageType}: $${pkg.price} (ID: ${pkg._id})`);
    });
    
    // Check specifically for chat package
    const chatPackage = await Packages.findOne({ 
      mentorId, 
      packageType: 'chat' 
    });
    
    console.log('\nChat package exists:', chatPackage ? 'YES' : 'NO');
    if (chatPackage) {
      console.log('Chat package details:', {
        price: chatPackage.price,
        packageName: chatPackage.packageName,
        id: chatPackage._id
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPackages();
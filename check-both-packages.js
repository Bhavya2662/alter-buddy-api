const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
mongoose.connect(config.get('DB_PATH'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define schemas
const PackageSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  packageType: { type: String, required: true },
  packageName: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", required: true },
  subServices: [String],
}, { timestamps: true });

const SessionPackageSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  packageType: { type: String, required: true },
  packageName: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", required: true },
  subServices: [String],
}, { timestamps: true });

const Packages = mongoose.model('Package', PackageSchema);
const SessionPackage = mongoose.model('SessionPackage', SessionPackageSchema);

async function checkBothPackages() {
  try {
    const mentorId = '68a37ad37de01f8431c91ee3';
    
    console.log('🔍 Checking both package collections for mentor:', mentorId);
    
    // Check regular Packages collection
    const packages = await Packages.find({ mentorId }).populate('categoryId');
    console.log('\n📦 Regular Packages collection:');
    if (packages.length > 0) {
      packages.forEach((pkg, index) => {
        console.log(`${index + 1}. ${pkg.packageName} (${pkg.packageType}) - $${pkg.price}`);
      });
    } else {
      console.log('❌ No packages found in Packages collection');
    }
    
    // Check SessionPackage collection
    const sessionPackages = await SessionPackage.find({ mentorId }).populate('categoryId');
    console.log('\n📦 SessionPackage collection:');
    if (sessionPackages.length > 0) {
      sessionPackages.forEach((pkg, index) => {
        console.log(`${index + 1}. ${pkg.packageName} (${pkg.packageType}) - $${pkg.price}`);
      });
    } else {
      console.log('❌ No packages found in SessionPackage collection');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkBothPackages();
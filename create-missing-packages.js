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
  status: { type: Boolean, default: true },
  subServices: [String],
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
  categoryName: String,
  categoryDescription: String,
});

const Packages = mongoose.model('Package', PackageSchema);
const Category = mongoose.model('Category', CategorySchema);

async function createMissingPackages() {
  try {
    const mentorId = '68736084e846910f077f3d5e';
    
    // Find a category to use
    const category = await Category.findOne();
    if (!category) {
      console.log('No category found, creating default category');
      const newCategory = new Category({
        categoryName: 'General Counseling',
        categoryDescription: 'General counseling services'
      });
      await newCategory.save();
      categoryId = newCategory._id;
    } else {
      categoryId = category._id;
    }
    
    console.log('Using category:', categoryId);
    
    // Check existing packages
    const existingPackages = await Packages.find({ mentorId });
    console.log('Existing packages:', existingPackages.map(p => p.packageType));
    
    const packagesToCreate = [
      { type: 'chat', price: 2, name: 'Chat Session' },
      { type: 'audio', price: 3, name: 'Audio Session' },
    ];
    
    for (const pkg of packagesToCreate) {
      const exists = existingPackages.find(p => p.packageType === pkg.type);
      if (!exists) {
        console.log(`Creating ${pkg.type} package...`);
        const newPackage = new Packages({
          categoryId,
          packageType: pkg.type,
          packageName: pkg.name,
          description: `${pkg.name} with mentor`,
          price: pkg.price,
          mentorId,
          status: true
        });
        await newPackage.save();
        console.log(`✅ Created ${pkg.type} package with price $${pkg.price}`);
      } else {
        console.log(`${pkg.type} package already exists`);
      }
    }
    
    // Verify all packages
    const allPackages = await Packages.find({ mentorId });
    console.log('\nFinal packages for mentor:');
    allPackages.forEach(pkg => {
      console.log(`- ${pkg.packageType}: $${pkg.price}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createMissingPackages();
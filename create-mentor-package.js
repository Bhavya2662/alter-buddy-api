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

const CategorySchema = new mongoose.Schema({
  categoryName: String,
  categoryDescription: String,
});

const MentorSchema = new mongoose.Schema({
  name: {
    firstName: String,
    lastName: String,
  },
  email: String,
  // ... other fields
});

const Packages = mongoose.model('Package', PackageSchema);
const Category = mongoose.model('Category', CategorySchema);
const Mentor = mongoose.model('Mentor', MentorSchema);

async function createMentorPackage() {
  try {
    // Find or create a category
    let category = await Category.findOne({ categoryName: 'General Consultation' });
    if (!category) {
      category = new Category({
        categoryName: 'General Consultation',
        categoryDescription: 'General consultation services',
      });
      await category.save();
      console.log('Created category:', category._id);
    }

    // Find the mentor with ID from our previous tests
    const mentorId = '681ce7a1c4222eb69ca553fe'; // Sachi Shah
    
    // Create packages for all call types
    const packageTypes = [
      { type: 'chat', name: 'Chat Consultation', price: 50 },
      { type: 'audio', name: 'Audio Call', price: 75 },
      { type: 'video', name: 'Video Call', price: 100 }
    ];

    for (const pkg of packageTypes) {
      // Check if package already exists
      const existingPackage = await Packages.findOne({ 
        mentorId: new mongoose.Types.ObjectId(mentorId),
        packageType: pkg.type
      });
      
      if (existingPackage) {
        console.log(`${pkg.type} package already exists:`, existingPackage._id);
        continue;
      }

      // Create new package
      const newPackage = new Packages({
        categoryId: category._id,
        packageType: pkg.type,
        packageName: pkg.name,
        description: `Professional ${pkg.name.toLowerCase()} service`,
        price: pkg.price,
        mentorId: new mongoose.Types.ObjectId(mentorId),
        subServices: ['Career Guidance', 'Technical Support'],
      });

      await newPackage.save();
      console.log(`Created ${pkg.type} package:`, newPackage._id);
      console.log('Package details:', {
        packageType: newPackage.packageType,
        price: newPackage.price,
        mentorId: newPackage.mentorId
      });
    }

  } catch (error) {
    console.error('Error creating package:', error);
  } finally {
    mongoose.connection.close();
  }
}

createMentorPackage();
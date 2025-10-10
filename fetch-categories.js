const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(config.get('DB_PATH'), {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Category Schema
const CategorySchema = new mongoose.Schema({
  title: { type: mongoose.Schema.Types.String, required: true },
  status: { type: mongoose.Schema.Types.Boolean },
}, {
  timestamps: true,
});

const Category = mongoose.model('Category', CategorySchema);

const fetchCategories = async () => {
  try {
    await connectDB();
    
    console.log('\n🔍 Fetching all categories...');
    const categories = await Category.find().sort({ createdAt: -1 });
    
    if (categories.length === 0) {
      console.log('❌ No categories found. Creating a default category...');
      
      const defaultCategory = new Category({
        title: 'General Counseling',
        status: true
      });
      
      const savedCategory = await defaultCategory.save();
      console.log('✅ Created default category:', {
        _id: savedCategory._id,
        title: savedCategory.title,
        status: savedCategory.status
      });
      
      return [savedCategory];
    }
    
    console.log(`✅ Found ${categories.length} categories:`);
    categories.forEach((category, index) => {
      console.log(`${index + 1}. ID: ${category._id}, Title: "${category.title}", Status: ${category.status}`);
    });
    
    return categories;
    
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Run the script
fetchCategories()
  .then((categories) => {
    console.log('\n📋 Categories fetched successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
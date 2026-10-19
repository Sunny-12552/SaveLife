import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedTestDonors, clearTestDonors } from './utils/seedDonors.js';

// Load environment variables
dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully!');

    // Check if we should clear existing data
    const args = process.argv.slice(2);
    if (args.includes('--clear')) {
      await clearTestDonors();
    }

    // Seed donors
    await seedTestDonors();

    console.log('\n🎉 Database seeded successfully!');
    console.log('📝 You can now login with any of these accounts:');
    console.log('   Email: donor1@test.com to donor20@test.com');
    console.log('   Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
};

seedDatabase();

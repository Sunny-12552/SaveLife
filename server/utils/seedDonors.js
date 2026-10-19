import User from '../models/User.js';
import Donor from '../models/Donor.js';
import bcrypt from 'bcryptjs';

/**
 * Seed test donor data for development
 * Creates 20 test donors with different blood groups and locations
 */
export const seedTestDonors = async () => {
  try {
    console.log('🌱 Seeding test donor data...');

    const cities = [
      'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
      'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
      'Chandigarh', 'Indore', 'Kochi', 'Coimbatore', 'Nagpur'
    ];

    const states = [
      'Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu',
      'Maharashtra', 'West Bengal', 'Gujarat', 'Rajasthan', 'Uttar Pradesh',
      'Punjab', 'Madhya Pradesh', 'Kerala', 'Tamil Nadu', 'Maharashtra'
    ];

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    const names = [
      'Rahul Kumar',
      'Priya Sharma',
      'Amit Patel',
      'Sneha Reddy',
      'Vikram Singh',
      'Anjali Verma',
      'Rohan Gupta',
      'Neha Joshi',
      'Arjun Mehta',
      'Pooja Iyer',
      'Sanjay Deshmukh',
      'Kavita Nair',
      'Rajesh Malhotra',
      'Deepika Rao',
      'Karan Kapoor',
      'Meera Saxena',
      'Aditya Jain',
      'Ritu Bansal',
      'Suresh Yadav',
      'Divya Menon',
    ];

    const donors = [];

    for (let i = 0; i < 20; i++) {
      // Create user first
      const userExists = await User.findOne({ email: `donor${i + 1}@test.com` });

      if (!userExists) {
        const user = await User.create({
          name: names[i],
          email: `donor${i + 1}@test.com`,
          password: await bcrypt.hash('password123', 10),
          role: 'donor',
          phone: `+9198765${4321 + i}0`,
          isActive: true,
        });

        // Create donor profile
        const donor = await Donor.create({
          userId: user._id,
          bloodGroup: bloodGroups[i % bloodGroups.length],
          dateOfBirth: new Date(1990 + (i % 10), i % 12, (i % 28) + 1),
          gender: i % 3 === 0 ? 'Male' : i % 3 === 1 ? 'Female' : 'Other',
          address: {
            street: `${i + 1} Test Street`,
            city: cities[i % cities.length],
            state: states[i % states.length],
            zipCode: `${400001 + i}`,
            country: 'India',
          },
          lastDonationDate: i % 2 === 0 ? new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) : null, // 120 days ago
          isEligible: true,
          healthInfo: {
            weight: 55 + (i % 20),
            height: 160 + (i % 20),
            hemoglobin: 13 + (i % 3),
            medicalConditions: [],
            medications: [],
            allergies: [],
          },
          totalDonations: i % 3,
          isActive: true,
        });

        donors.push({
          user: user.name,
          email: user.email,
          bloodGroup: donor.bloodGroup,
          city: donor.address.city,
          phone: user.phone,
        });
      }
    }

    console.log('✅ Test donors created successfully!');
    console.log('📋 Created donors:', donors);
    return donors;
  } catch (error) {
    console.error('❌ Error seeding donors:', error.message);
    throw error;
  }
};

/**
 * Clear all test donor data
 */
export const clearTestDonors = async () => {
  try {
    console.log('🧹 Clearing test donor data...');

    // Delete test donors
    const testUsers = await User.find({ email: /^donor\d+@test\.com$/ });
    const userIds = testUsers.map(u => u._id);

    await Donor.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });

    console.log(`✅ Cleared ${userIds.length} test donors`);
  } catch (error) {
    console.error('❌ Error clearing test donors:', error.message);
    throw error;
  }
};

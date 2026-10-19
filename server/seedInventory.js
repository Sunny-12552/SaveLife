import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Inventory from './models/Inventory.js';
import User from './models/User.js';
import Donation from './models/Donation.js';
import Donor from './models/Donor.js';

// Load environment variables
dotenv.config();

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const seedInventory = async () => {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully!');

    // Find an admin user to attribute the inventory additions to
    let adminUser = await User.findOne({ role: 'admin' });

    if (!adminUser) {
      console.log('⚠️  No admin user found. Creating a temporary admin user for seeding...');
      adminUser = await User.create({
        name: 'System Admin',
        email: 'admin@bloodbank.com',
        password: 'admin123',
        phone: '9999999999',
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Temporary admin user created');
    }

    console.log(`\n📦 Using admin user: ${adminUser.name} (${adminUser.email})`);

    // Check if we should clear existing inventory
    const args = process.argv.slice(2);
    if (args.includes('--clear')) {
      console.log('\n🗑️  Clearing existing inventory...');
      await Inventory.deleteMany({});
      console.log('✅ Existing inventory cleared');
    }

    console.log('\n💉 Adding blood units to inventory...\n');

    // Add different amounts for each blood group
    const inventoryData = [
      { bloodGroup: 'O+', units: 15 },
      { bloodGroup: 'O-', units: 8 },
      { bloodGroup: 'A+', units: 12 },
      { bloodGroup: 'A-', units: 6 },
      { bloodGroup: 'B+', units: 10 },
      { bloodGroup: 'B-', units: 5 },
      { bloodGroup: 'AB+', units: 7 },
      { bloodGroup: 'AB-', units: 4 },
    ];

    for (const data of inventoryData) {
      // Since each donation can only be max 2 units, we need to create multiple donations
      // for larger quantities
      const donors = await Donor.find({ bloodGroup: data.bloodGroup }).limit(10);
      let totalUnitsAdded = 0;
      let remainingUnits = data.units;

      // Create multiple donations to reach the target number of units
      while (remainingUnits > 0) {
        const unitsForThisDonation = Math.min(remainingUnits, 2); // Max 2 units per donation
        const donor = donors[totalUnitsAdded % donors.length] || null;

        let mockDonation;
        if (donor) {
          mockDonation = await Donation.create({
            donorId: donor._id,
            donationType: 'direct',
            donationDate: new Date(),
            bloodGroup: data.bloodGroup,
            unitsCollected: unitsForThisDonation,
            location: {
              facility: 'Main Blood Bank',
              city: 'Mumbai',
              state: 'Maharashtra',
            },
            verifiedBy: adminUser._id,
            status: 'completed',
          });
        }

        // Add to inventory using the static method
        const donation = {
          bloodGroup: data.bloodGroup,
          unitsCollected: unitsForThisDonation,
          _id: mockDonation?._id || new mongoose.Types.ObjectId(),
          donationDate: new Date(),
        };

        await Inventory.addFromDonation(donation, adminUser._id);

        totalUnitsAdded += unitsForThisDonation;
        remainingUnits -= unitsForThisDonation;
      }

      console.log(`✅ Added ${data.units} unit(s) of ${data.bloodGroup} blood`);
    }

    // Display summary
    console.log('\n📊 Inventory Summary:');
    console.log('━'.repeat(50));

    const inventories = await Inventory.find({}).sort({ bloodGroup: 1 });
    let totalUnits = 0;

    for (const inv of inventories) {
      const available = inv.unitsAvailable;
      const reserved = inv.unitsReserved;
      totalUnits += available + reserved;

      console.log(`${inv.bloodGroup.padEnd(4)} | Available: ${available.toString().padStart(2)} | Reserved: ${reserved.toString().padStart(2)} | Total: ${(available + reserved).toString().padStart(2)}`);
    }

    console.log('━'.repeat(50));
    console.log(`Total units in inventory: ${totalUnits}`);

    console.log('\n🎉 Inventory seeded successfully!');
    console.log('\n💡 Tips:');
    console.log('   • Run with --clear flag to reset inventory before seeding');
    console.log('   • Units expire 35 days after collection date');
    console.log('   • Each unit has a unique ID for tracking');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding inventory:', error.message);
    console.error(error);
    process.exit(1);
  }
};

seedInventory();

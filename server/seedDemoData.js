import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Donor from './models/Donor.js';
import Camp from './models/Camp.js';
import Donation from './models/Donation.js';
import Request from './models/Request.js';
import Inventory from './models/Inventory.js';

dotenv.config();

const DEMO_PASSWORD = 'SaveLifeDemo2026!';
const DEMO_EMAILS = {
  admin: 'demo.admin@savelife.test',
  organizer: 'demo.organizer@savelife.test',
  donor: 'demo.donor@savelife.test',
  patient: 'demo.patient@savelife.test',
};

const dateOffset = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return date;
};

const saveDemoUser = async (role, name, phone) => {
  const email = DEMO_EMAILS[role];
  const user = await User.findOne({ email }) || new User({ email });
  user.name = name;
  user.password = DEMO_PASSWORD;
  user.role = role;
  user.phone = phone;
  user.isActive = true;
  await user.save();
  return user;
};

const saveDemoCamp = async ({ organizer, donor, name, date, status, donated, donationId }) => {
  const camp = await Camp.findOne({ organizerId: organizer._id, name })
    || new Camp({ organizerId: organizer._id, name });
  Object.assign(camp, {
    description: status === 'upcoming'
      ? 'Demo camp for testing camp discovery, QR details, maps, registration, and editing.'
      : 'Completed demo camp with a recorded donation and certificate.',
    date,
    startTime: '09:00',
    endTime: '15:00',
    location: {
      venueName: 'SaveLife Community Hall',
      address: '12 Anna Salai',
      city: 'Chennai',
      state: 'Tamil Nadu',
      zipCode: '600002',
      landmark: 'Near the central bus station',
      coordinates: { latitude: 13.0604, longitude: 80.2496 },
    },
    capacity: 80,
    status,
    totalUnitsCollected: donated ? 1 : 0,
    requirements: { bloodGroups: ['O+', 'A+', 'B+'], targetUnits: 40 },
    contactInfo: {
      phone: organizer.phone,
      email: organizer.email,
      coordinatorName: organizer.name,
    },
    isActive: true,
  });

  const donorRegistration = {
    donorId: donor._id,
    registeredAt: dateOffset(-2),
    attended: Boolean(donated),
    donated: Boolean(donated),
    unitsCollected: donated ? 1 : 0,
  };
  if (donationId) donorRegistration.donationId = donationId;

  const otherRegistrations = camp.registeredDonors.filter(
    (registration) => registration.donorId?.toString() !== donor._id.toString()
  );
  camp.registeredDonors = [...otherRegistrations, donorRegistration];
  await camp.save();
  return camp;
};

const saveDemoRequest = async ({ patient, donor, notes, status, urgency, unitsFulfilled }) => {
  const request = await Request.findOne({ requesterId: patient._id, notes })
    || new Request({ requesterId: patient._id, notes });
  Object.assign(request, {
    patientName: patient.name,
    patientAge: 34,
    bloodGroup: 'O+',
    unitsRequired: 3,
    urgency,
    requiredBy: dateOffset(urgency === 'critical' ? 2 : 7),
    hospital: {
      name: 'SaveLife Demo General Hospital',
      address: '45 Marina Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      zipCode: '600004',
    },
    contactInfo: { phone: patient.phone, email: patient.email },
    reason: 'Demo record for testing patient blood-request tracking.',
    status,
    unitsFulfilled,
    matchedDonors: status === 'partially_fulfilled'
      ? [{
        donorId: donor._id,
        contacted: true,
        agreedToDonate: true,
        donated: false,
        unitsContributed: 1,
      }]
      : [],
    isActive: true,
  });
  await request.save();
};

const seedDemoInventory = async (admin) => {
  const stockByGroup = {
    'O+': 12,
    'O-': 5,
    'A+': 9,
    'A-': 4,
    'B+': 7,
    'B-': 3,
    'AB+': 5,
    'AB-': 2,
  };

  for (const [bloodGroup, count] of Object.entries(stockByGroup)) {
    let inventory = await Inventory.findOne({ bloodGroup });
    if (
      inventory &&
      (!inventory.isDemoData || inventory.location !== 'SaveLife Demo Blood Bank')
    ) {
      console.log(`Keeping existing ${bloodGroup} inventory unchanged.`);
      continue;
    }
    inventory = inventory || new Inventory({ bloodGroup });
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + 35);
    const unitPrefix = `DEMO-${bloodGroup.replace('+', 'POS').replace('-', 'NEG')}`;
    inventory.unitsAvailable = count;
    inventory.unitsReserved = 0;
    inventory.location = 'SaveLife Demo Blood Bank';
    inventory.isDemoData = true;
    inventory.units = Array.from({ length: count }, (_, index) => ({
      unitId: `${unitPrefix}-${String(index + 1).padStart(3, '0')}`,
      collectedDate: now,
      expiryDate,
      status: 'available',
    }));
    inventory.history = [{
      action: 'added',
      units: count,
      performedBy: admin._id,
      reason: 'Repeatable SaveLife demo inventory seed',
      timestamp: now,
    }];
    inventory.lastUpdated = now;
    await inventory.save();
  }
};

const seedDemoData = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not configured. Set it in server/.env before seeding.');
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Demo data seeding is disabled when NODE_ENV is production.');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);

    const admin = await saveDemoUser('admin', 'SaveLife Demo Admin', '+919876500001');
    const organizer = await saveDemoUser('organizer', 'SaveLife Demo Organizer', '+919876500002');
    const donorUser = await saveDemoUser('donor', 'SaveLife Demo Donor', '+919876500003');
    const patient = await saveDemoUser('patient', 'SaveLife Demo Patient', '+919876500004');

    let donor = await Donor.findOne({ userId: donorUser._id }) || new Donor({ userId: donorUser._id });
    Object.assign(donor, {
      bloodGroup: 'O+',
      dateOfBirth: new Date('1996-05-12'),
      gender: 'Other',
      address: {
        street: '12 Demo Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600002',
        country: 'India',
      },
      healthInfo: {
        weight: 68,
        height: 170,
        hemoglobin: 14,
        medicalConditions: [],
        medications: [],
        allergies: [],
      },
      totalDonations: 0,
      donationHistory: [],
      isActive: true,
    });
    await donor.save();

    const completedCamp = await saveDemoCamp({
      organizer,
      donor,
      name: 'SaveLife Demo - Completed Camp',
      date: dateOffset(-120),
      status: 'completed',
      donated: true,
    });
    const donationDate = dateOffset(-120);
    const donationNotes = 'SaveLife demo donation certificate';
    let donation = await Donation.findOne({ donorId: donor._id, notes: donationNotes })
      || new Donation({ donorId: donor._id, notes: donationNotes });
    Object.assign(donation, {
      campId: completedCamp._id,
      donationType: 'camp',
      donationDate,
      bloodGroup: 'O+',
      unitsCollected: 1,
      preCheckup: {
        weight: 68,
        hemoglobin: 14,
        eligible: true,
        notes: 'Demo checkup',
      },
      postCheckup: { condition: 'good', notes: 'No concerns reported.' },
      location: {
        facility: 'SaveLife Community Hall',
        city: 'Chennai',
        state: 'Tamil Nadu',
      },
      verifiedBy: organizer._id,
      status: 'completed',
      certificate: { issued: false },
    });
    await donation.save();

    await saveDemoCamp({
      organizer,
      donor,
      name: 'SaveLife Demo - Completed Camp',
      date: donationDate,
      status: 'completed',
      donated: true,
      donationId: donation._id,
    });
    await saveDemoCamp({
      organizer,
      donor,
      name: 'SaveLife Demo - Upcoming Camp',
      date: dateOffset(30),
      status: 'upcoming',
      donated: false,
    });

    donor = await Donor.findById(donor._id);
    donor.lastDonationDate = donationDate;
    donor.totalDonations = 1;
    donor.donationHistory = [{
      campId: completedCamp._id,
      donationDate,
      unitsCollected: 1,
      notes: donationNotes,
    }];
    await donor.save();

    await saveDemoRequest({
      patient,
      donor,
      notes: 'SaveLife demo patient request - pending',
      status: 'pending',
      urgency: 'critical',
      unitsFulfilled: 0,
    });
    await saveDemoRequest({
      patient,
      donor,
      notes: 'SaveLife demo patient request - partial',
      status: 'partially_fulfilled',
      urgency: 'medium',
      unitsFulfilled: 1,
    });
    await seedDemoInventory(admin);

    console.log('\nSaveLife demo data is ready.');
    console.log(`Created or refreshed demo accounts: ${Object.values(DEMO_EMAILS).join(', ')}`);
    console.log('Sample records: 2 camps, 1 completed donation certificate, 2 patient requests, and demo inventory.');
  } catch (error) {
    console.error('Failed to seed SaveLife demo data:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedDemoData();

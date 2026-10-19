import Donation from '../models/Donation.js';
import User from '../models/User.js';
import Donor from '../models/Donor.js';
import Inventory from '../models/Inventory.js';
import sendResponse from '../utils/responseHandler.js';
import { randomBytes } from 'crypto';

export const recordQuickDonation = async (req, res, next) => {
  try {
    const { donorInfo, healthInfo, campId, donationDate, unitsCollected, notes } = req.body;

    if (req.user.role !== 'admin' && req.user.role !== 'organizer') {
      res.status(403);
      throw new Error('Only organizers and admins can record quick donations');
    }

    // Check if user already exists by phone or email
    let user = null;
    let donor = null;

    // Check by email only if a valid email is provided (not empty string)
    if (donorInfo.email && donorInfo.email.trim() !== '') {
      user = await User.findOne({ email: donorInfo.email.toLowerCase() });
    }
    
    // Check by phone if user not found and phone is provided
    if (!user && donorInfo.phone && donorInfo.phone.trim() !== '') {
      user = await User.findOne({ phone: donorInfo.phone });
    }

    // If user doesn't exist, create one
    if (!user) {
      // Use provided email if valid, otherwise generate temp email
      const emailToUse = (donorInfo.email && donorInfo.email.trim() !== '') 
        ? donorInfo.email.toLowerCase()
        : `walkin_${Date.now()}@bdcms.temp`;

      user = await User.create({
        name: donorInfo.name,
        email: emailToUse,
        password: Math.random().toString(36).slice(-8) + 'Aa1!', // Random password
        phone: donorInfo.phone,
        role: 'donor',
      });
    }

    // Check if donor profile exists
    donor = await Donor.findOne({ userId: user._id });

    // If donor profile doesn't exist, create one
    if (!donor) {
      donor = await Donor.create({
        userId: user._id,
        bloodGroup: donorInfo.bloodGroup,
        dateOfBirth: donorInfo.dateOfBirth,
        gender: donorInfo.gender,
        address: {
          city: donorInfo.city,
          state: donorInfo.state,
        },
        healthInfo: {
          weight: healthInfo.weight,
          hemoglobin: healthInfo.hemoglobin,
          bloodPressure: healthInfo.bloodPressure,
        },
        lastDonationDate: donationDate || new Date(),
        totalDonations: 0, // Will be incremented by Donation pre-save hook
      });
    }

    // Create donation record
    const donation = await Donation.create({
      donorId: donor._id,
      donationType: campId ? 'camp' : 'direct',
      campId: campId || undefined,
      donationDate: donationDate || new Date(),
      bloodGroup: donorInfo.bloodGroup,
      unitsCollected: unitsCollected || 1,
      preCheckup: {
        weight: healthInfo.weight,
        bloodPressure: healthInfo.bloodPressure,
        hemoglobin: healthInfo.hemoglobin,
        eligible: true,
        notes: `Walk-in donor recorded by ${req.user.name}`,
      },
      location: {
        facility: campId ? 'Camp' : 'Direct',
        city: donorInfo.city,
        state: donorInfo.state,
      },
      verifiedBy: req.user._id,
      status: 'completed',
      notes: notes || `Walk-in Donor Entry`,
    });

    // Update camp stats if applicable
    if (campId) {
      const Camp = (await import('../models/Camp.js')).default;
      await Camp.findByIdAndUpdate(campId, {
        $inc: { totalUnitsCollected: unitsCollected || 1 },
      });
    }

    // Add units to inventory automatically
    try {
      await Inventory.addFromDonation(
        {
          bloodGroup: donorInfo.bloodGroup,
          unitsCollected: unitsCollected || 1,
          _id: donation._id,
          donationDate: donationDate || new Date(),
        },
        req.user._id
      );
      console.log(`✅ Added ${unitsCollected || 1} unit(s) of ${donorInfo.bloodGroup} to inventory`);
    } catch (inventoryError) {
      console.error('⚠️  Failed to add to inventory:', inventoryError.message);
      // Continue even if inventory update fails - donation is still recorded
    }

    // Populate the donation for response
    const populatedDonation = await Donation.findById(donation._id)
      .populate('donorId')
      .populate({
        path: 'donorId',
        populate: {
          path: 'userId',
          select: 'name email phone',
        },
      });

    return sendResponse(
      res,
      201,
      true,
      'Quick donation recorded successfully. Donor profile created/updated and units added to inventory.',
      populatedDonation
    );
  } catch (error) {
    next(error);
  }
};

export const getAllDonations = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const donations = await Donation.find()
      .populate('donorId', 'bloodGroup userId')
      .populate('campId', 'name date location')
      .populate('verifiedBy', 'name email')
      .sort({ donationDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Donation.countDocuments();

    return sendResponse(res, 200, true, 'Donations retrieved successfully', {
      donations,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const issueDonationCertificate = async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id).populate('campId', 'organizerId name');
    if (!donation) {
      res.status(404);
      throw new Error('Donation not found');
    }

    if (donation.status !== 'completed' || donation.donationType !== 'camp' || !donation.campId) {
      res.status(400);
      throw new Error('Certificates can only be issued for completed camp donations');
    }

    if (
      req.user.role !== 'admin' &&
      donation.campId.organizerId.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error('Not authorized to issue a certificate for this camp');
    }

    if (!donation.certificate.issued) {
      donation.certificate.issued = true;
      donation.certificate.issuedDate = new Date();
      donation.certificate.certificateNumber =
        `SL-${new Date().getUTCFullYear()}-${randomBytes(5).toString('hex').toUpperCase()}`;
      await donation.save();
    }

    const issuedDonation = await Donation.findById(donation._id)
      .populate({
        path: 'donorId',
        select: 'bloodGroup userId',
        populate: { path: 'userId', select: 'name' },
      })
      .populate('campId', 'name date location');

    return sendResponse(res, 200, true, 'Donation certificate issued successfully', issuedDonation);
  } catch (error) {
    next(error);
  }
};

export const getMyCertificates = async (req, res, next) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) {
      return sendResponse(res, 200, true, 'Your certificates retrieved successfully', []);
    }

    const certificates = await Donation.find({
      donorId: donor._id,
      status: 'completed',
      'certificate.issued': true,
    })
      .populate('campId', 'name date location')
      .sort({ 'certificate.issuedDate': -1 });

    return sendResponse(res, 200, true, 'Your certificates retrieved successfully', certificates);
  } catch (error) {
    next(error);
  }
};

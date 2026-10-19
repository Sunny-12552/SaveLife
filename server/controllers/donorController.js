import Donor from '../models/Donor.js';
import User from '../models/User.js';
import sendResponse from '../utils/responseHandler.js';

export const registerDonor = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const existingDonor = await Donor.findOne({ userId });
    if (existingDonor) {
      res.status(400);
      throw new Error('Donor profile already exists for this user');
    }

    const donorData = {
      userId,
      bloodGroup: req.body.bloodGroup,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      address: req.body.address,
      healthInfo: req.body.healthInfo,
      emergencyContact: req.body.emergencyContact,
    };

    const donor = await Donor.create(donorData);

    const populatedDonor = await Donor.findById(donor._id).populate(
      'userId',
      'name email phone'
    );

    return sendResponse(
      res,
      201,
      true,
      'Donor registered successfully',
      populatedDonor
    );
  } catch (error) {
    next(error);
  }
};

export const getAllDonors = async (req, res, next) => {
  try {
    const { bloodGroup, city, isEligible, page = 1, limit = 10 } = req.query;

    const filter = { isActive: true };

    if (bloodGroup) {
      filter.bloodGroup = bloodGroup;
    }

    if (city) {
      filter['address.city'] = { $regex: city, $options: 'i' };
    }

    if (isEligible !== undefined) {
      filter.isEligible = isEligible === 'true';
    }

    const skip = (page - 1) * limit;

    const donors = await Donor.find(filter)
      .populate('userId', 'name email phone')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Donor.countDocuments(filter);

    return sendResponse(res, 200, true, 'Donors retrieved successfully', {
      donors,
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

export const getDonorById = async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id).populate(
      'userId',
      'name email phone'
    );

    if (!donor) {
      res.status(404);
      throw new Error('Donor not found');
    }

    return sendResponse(res, 200, true, 'Donor retrieved successfully', donor);
  } catch (error) {
    next(error);
  }
};

export const getMyDonorProfile = async (req, res, next) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id }).populate(
      'userId',
      'name email phone'
    );

    if (!donor) {
      res.status(404);
      throw new Error('Donor profile not found');
    }

    return sendResponse(res, 200, true, 'Donor profile retrieved successfully', donor);
  } catch (error) {
    next(error);
  }
};

export const updateDonor = async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id);

    if (!donor) {
      res.status(404);
      throw new Error('Donor not found');
    }

    if (donor.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized to update this donor profile');
    }

    const allowedUpdates = [
      'bloodGroup',
      'dateOfBirth',
      'gender',
      'address',
      'healthInfo',
      'emergencyContact',
      'lastDonationDate',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        donor[field] = req.body[field];
      }
    });

    await donor.save();

    const updatedDonor = await Donor.findById(donor._id).populate(
      'userId',
      'name email phone'
    );

    return sendResponse(
      res,
      200,
      true,
      'Donor updated successfully',
      updatedDonor
    );
  } catch (error) {
    next(error);
  }
};

export const deleteDonor = async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id);

    if (!donor) {
      res.status(404);
      throw new Error('Donor not found');
    }

    if (donor.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized to delete this donor profile');
    }

    donor.isActive = false;
    await donor.save();

    return sendResponse(
      res,
      200,
      true,
      'Donor profile deactivated successfully',
      null
    );
  } catch (error) {
    next(error);
  }
};

export const checkDonorEligibility = async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id);

    if (!donor) {
      res.status(404);
      throw new Error('Donor not found');
    }

    const isEligible = donor.checkEligibility();
    
    let daysUntilEligible = 0;
    if (!isEligible && donor.lastDonationDate) {
      const daysSinceLastDonation = Math.floor(
        (Date.now() - donor.lastDonationDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      daysUntilEligible = 90 - daysSinceLastDonation;
    }

    return sendResponse(res, 200, true, 'Eligibility checked successfully', {
      donorId: donor._id,
      isEligible,
      lastDonationDate: donor.lastDonationDate,
      daysUntilEligible: isEligible ? 0 : daysUntilEligible,
    });
  } catch (error) {
    next(error);
  }
};

export const searchDonorsByBloodGroup = async (req, res, next) => {
  try {
    const { bloodGroup } = req.params;
    const { city, state } = req.query;

    const filter = {
      bloodGroup,
      isEligible: true,
      isActive: true,
    };

    if (city) {
      filter['address.city'] = { $regex: city, $options: 'i' };
    }

    if (state) {
      filter['address.state'] = { $regex: state, $options: 'i' };
    }

    const donors = await Donor.find(filter)
      .populate('userId', 'name email phone')
      .sort({ totalDonations: -1 });

    return sendResponse(
      res,
      200,
      true,
      `Found ${donors.length} eligible donors with blood group ${bloodGroup}`,
      donors
    );
  } catch (error) {
    next(error);
  }
};

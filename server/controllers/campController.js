import Camp from '../models/Camp.js';
import mongoose from 'mongoose';
import Donor from '../models/Donor.js';
import Donation from '../models/Donation.js';
import User from '../models/User.js';
import Inventory from '../models/Inventory.js';
import geocodeLocation from '../utils/geocodeLocation.js';
import sendResponse from '../utils/responseHandler.js';
import { sendBulkSMS } from '../utils/sendSMS.js';

const MAX_CAMP_IMAGE_BYTES = 2 * 1024 * 1024;

const startOfUtcToday = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};

const withEffectiveCampStatus = (camp) => {
  const result = camp.toObject ? camp.toObject() : camp;
  const campDate = new Date(result.date);
  campDate.setUTCHours(0, 0, 0, 0);
  if (result.status === 'upcoming' && campDate < startOfUtcToday()) {
    result.status = 'expired';
  }
  return result;
};

const withCampPermissions = (camp, user) => {
  const result = withEffectiveCampStatus(camp);
  const organizerId = result.organizerId?._id || result.organizerId;
  result.canEdit = user.role === 'admin'
    || (
      user.role === 'organizer'
      && organizerId?.toString() === user._id.toString()
    );
  return result;
};

const validateLocationCoordinates = (coordinates, res) => {
  if (!coordinates) return null;

  const hasLatitude = coordinates.latitude !== undefined && coordinates.latitude !== '';
  const hasLongitude = coordinates.longitude !== undefined && coordinates.longitude !== '';
  if (!hasLatitude && !hasLongitude) return null;

  const latitude = Number(coordinates.latitude);
  const longitude = Number(coordinates.longitude);
  if (
    !hasLatitude ||
    !hasLongitude ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    res.status(400);
    throw new Error('Camp coordinates must include a valid latitude (-90 to 90) and longitude (-180 to 180).');
  }

  return { latitude, longitude };
};

const validateCampImage = (campImage, res) => {
  if (campImage === undefined || campImage === '') return;

  if (typeof campImage !== 'string') {
    res.status(400);
    throw new Error('Camp image must be a JPG, PNG, or WebP image.');
  }

  const match = campImage.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) {
    res.status(400);
    throw new Error('Camp image must be a JPG, PNG, or WebP image.');
  }

  if (Buffer.from(match[2], 'base64').byteLength > MAX_CAMP_IMAGE_BYTES) {
    res.status(400);
    throw new Error('Camp image must be 2 MB or smaller.');
  }
};

export const createCamp = async (req, res, next) => {
  try {
    const organizerId = req.user._id;

    if (req.user.role !== 'admin' && req.user.role !== 'organizer') {
      res.status(403);
      throw new Error('Only admins and organizers can create camps');
    }

    validateCampImage(req.body.campImage, res);
    const campData = {
      organizerId,
      ...req.body,
    };

    const providedCoordinates = validateLocationCoordinates(
      campData.location.coordinates,
      res
    );
    if (!providedCoordinates) {
      res.status(400);
      throw new Error('Select a valid camp location before creating the camp.');
    }
    campData.location.coordinates = providedCoordinates;

    const camp = await Camp.create(campData);

    const populatedCamp = await Camp.findById(camp._id).populate(
      'organizerId',
      'name email phone'
    );

    // Send SMS notification to all admins about new camp creation
    try {
      const admins = await User.find({ role: 'admin', isActive: true });
      const adminsWithPhone = admins.filter(admin => admin.phone);

      if (adminsWithPhone.length > 0) {
        const campDate = new Date(camp.date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        const message = `🏥 New Blood Donation Camp Created\n\nCamp: ${camp.name}\nOrganizer: ${req.user.name}\nDate: ${campDate}\nTime: ${camp.startTime} - ${camp.endTime}\nLocation: ${camp.location.venueName}, ${camp.location.city}\nCapacity: ${camp.capacity}\n\nPlease review and approve.\n\nBlood Donation Management`;

        const recipients = adminsWithPhone.map(admin => ({
          userId: admin._id,
          phone: admin.phone,
        }));

        await sendBulkSMS({
          recipients,
          message,
          sentBy: organizerId,
          type: 'camp_created',
          relatedEntity: {
            entityType: 'Camp',
            entityId: camp._id,
          },
        });

        console.log(`✅ Sent camp creation notifications to ${adminsWithPhone.length} admin(s)`);
      }
    } catch (smsError) {
      console.error('❌ Error sending SMS notifications to admins:', smsError.message);
      // Don't fail the camp creation if SMS fails
    }

    return sendResponse(
      res,
      201,
      true,
      'Camp created successfully',
      populatedCamp
    );
  } catch (error) {
    next(error);
  }
};

export const getAllCamps = async (req, res, next) => {
  try {
    const {
      status,
      city,
      state,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = { isActive: true };

    if (status === 'expired') {
      filter.status = 'upcoming';
      filter.date = { $lt: startOfUtcToday() };
    } else if (status) {
      filter.status = status;
      if (status === 'upcoming') filter.date = { $gte: startOfUtcToday() };
    }

    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    if (state) {
      filter['location.state'] = { $regex: state, $options: 'i' };
    }

    if (fromDate || toDate) {
      filter.date = filter.date || {};
      if (fromDate) {
        const requestedStart = new Date(fromDate);
        filter.date.$gte = filter.date.$gte && filter.date.$gte > requestedStart
          ? filter.date.$gte
          : requestedStart;
      }
      if (toDate) {
        filter.date.$lte = new Date(toDate);
      }
    }

    const skip = (page - 1) * limit;

    const camps = await Camp.find(filter)
      .populate('organizerId', 'name email phone')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ date: 1 });

    const total = await Camp.countDocuments(filter);

    return sendResponse(res, 200, true, 'Camps retrieved successfully', {
      camps: camps.map((camp) => withCampPermissions(camp, req.user)),
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

export const getCampById = async (req, res, next) => {
  try {
    const camp = await Camp.findById(req.params.id)
      .populate('organizerId', 'name email phone')
      .populate('registeredDonors.donorId', 'bloodGroup userId')
      .populate({
        path: 'registeredDonors.donorId',
        populate: {
          path: 'userId',
          select: 'name email phone',
        },
      })
      .populate('registeredDonors.donationId', 'certificate status unitsCollected donationDate');

    if (!camp) {
      res.status(404);
      throw new Error('Camp not found');
    }

    return sendResponse(res, 200, true, 'Camp retrieved successfully', withCampPermissions(camp, req.user));
  } catch (error) {
    next(error);
  }
};

export const getPublicCampById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(404);
      throw new Error('Camp not found');
    }

    const camp = await Camp.findOne({ _id: req.params.id, isActive: true })
      .select(
        'name description date startTime endTime location.venueName location.address location.city location.state location.zipCode location.landmark capacity status requirements.bloodGroups requirements.targetUnits'
        + ' location.coordinates.latitude location.coordinates.longitude campImage'
      )
      .lean();

    if (!camp) {
      res.status(404);
      throw new Error('Camp not found');
    }

    return sendResponse(res, 200, true, 'Camp retrieved successfully', withEffectiveCampStatus(camp));
  } catch (error) {
    next(error);
  }
};

export const updateCamp = async (req, res, next) => {
  try {
    const camp = await Camp.findById(req.params.id);

    if (!camp) {
      res.status(404);
      throw new Error('Camp not found');
    }

    if (
      camp.organizerId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      res.status(403);
      throw new Error('Not authorized to update this camp');
    }

    const allowedUpdates = [
      'name',
      'description',
      'date',
      'startTime',
      'endTime',
      'location',
      'capacity',
      'status',
      'requirements',
      'contactInfo',
      'campImage',
      'images',
    ];

    if (req.body.campImage !== undefined) {
      validateCampImage(req.body.campImage, res);
    }

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        camp[field] = req.body[field];
      }
    });

    if (req.body.location !== undefined) {
      const providedCoordinates = validateLocationCoordinates(
        req.body.location.coordinates,
        res
      );
      if (providedCoordinates) {
        camp.location.coordinates = providedCoordinates;
      } else {
        camp.location.coordinates = {};
        try {
          camp.location.coordinates = await geocodeLocation(camp.location);
        } catch (geocodeError) {
          console.warn(`Could not update camp map location: ${geocodeError.message}`);
        }
      }
    }

    await camp.save();

    const updatedCamp = await Camp.findById(camp._id).populate(
      'organizerId',
      'name email phone'
    );

    return sendResponse(res, 200, true, 'Camp updated successfully', updatedCamp);
  } catch (error) {
    next(error);
  }
};

export const deleteCamp = async (req, res, next) => {
  try {
    const camp = await Camp.findById(req.params.id);

    if (!camp) {
      res.status(404);
      throw new Error('Camp not found');
    }

    if (
      camp.organizerId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      res.status(403);
      throw new Error('Not authorized to delete this camp');
    }

    camp.isActive = false;
    camp.status = 'cancelled';
    await camp.save();

    return sendResponse(
      res,
      200,
      true,
      'Camp cancelled successfully',
      null
    );
  } catch (error) {
    next(error);
  }
};

export const registerForCamp = async (req, res, next) => {
  try {
    const campId = req.params.id;
    const userId = req.user._id;

    const camp = await Camp.findById(campId);

    if (!camp) {
      res.status(404);
      throw new Error('Camp not found');
    }

    if (!camp.isRegistrationOpen()) {
      res.status(400);
      throw new Error('Registration is closed for this camp');
    }

    const donor = await Donor.findOne({ userId });

    if (!donor) {
      res.status(404);
      throw new Error('Donor profile not found. Please create a donor profile first.');
    }

    if (!donor.isEligible) {
      res.status(400);
      throw new Error('You are not eligible to donate yet. Please wait 90 days from your last donation.');
    }

    const alreadyRegistered = camp.registeredDonors.some(
      (reg) => reg.donorId.toString() === donor._id.toString()
    );

    if (alreadyRegistered) {
      res.status(400);
      throw new Error('Already registered for this camp');
    }

    camp.registeredDonors.push({
      donorId: donor._id,
    });

    await camp.save();

    const updatedCamp = await Camp.findById(campId)
      .populate('organizerId', 'name email phone')
      .populate('registeredDonors.donorId', 'bloodGroup userId');

    return sendResponse(
      res,
      200,
      true,
      'Successfully registered for camp',
      updatedCamp
    );
  } catch (error) {
    next(error);
  }
};

export const markAttendance = async (req, res, next) => {
  try {
    const { campId, donorId } = req.params;
    const { attended, donated, unitsCollected } = req.body;

    const camp = await Camp.findById(campId);

    if (!camp) {
      res.status(404);
      throw new Error('Camp not found');
    }

    if (
      camp.organizerId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      res.status(403);
      throw new Error('Not authorized to mark attendance');
    }

    const registration = camp.registeredDonors.find(
      (reg) => reg.donorId.toString() === donorId
    );

    if (!registration) {
      res.status(404);
      throw new Error('Donor not registered for this camp');
    }

    if (attended !== undefined) registration.attended = attended;

    if (donated && !registration.donated) {
      const collectedUnits = Number(unitsCollected);
      if (!registration.attended) {
        res.status(400);
        throw new Error('Mark the donor present before recording a donation');
      }
      if (!Number.isFinite(collectedUnits) || collectedUnits < 0.5 || collectedUnits > 2) {
        res.status(400);
        throw new Error('Units collected must be between 0.5 and 2');
      }

      const donor = await Donor.findById(donorId);
      if (!donor) {
        res.status(404);
        throw new Error('Donor profile not found');
      }
      const existingDonation = await Donation.findOne({
        donorId,
        campId,
        donationType: 'camp',
        status: 'completed',
      });
      if (existingDonation) {
        registration.donationId = existingDonation._id;
        registration.donated = true;
        registration.unitsCollected = existingDonation.unitsCollected;
      } else {
        const donation = await Donation.create({
          donorId,
          campId,
          donationType: 'camp',
          donationDate: new Date(),
          bloodGroup: donor.bloodGroup,
          unitsCollected: collectedUnits,
          location: {
            facility: camp.location.venueName,
            city: camp.location.city,
            state: camp.location.state,
          },
          verifiedBy: req.user._id,
          status: 'completed',
        });
        registration.donationId = donation._id;
        registration.donated = true;
        registration.unitsCollected = collectedUnits;
        camp.totalUnitsCollected += collectedUnits;

        try {
          await Inventory.addFromDonation(
            {
              bloodGroup: donor.bloodGroup,
              unitsCollected: collectedUnits,
              _id: donation._id,
              donationDate: new Date(),
            },
            req.user._id
          );
          console.log(`✅ Added ${collectedUnits} unit(s) of ${donor.bloodGroup} to inventory from camp donation`);
        } catch (inventoryError) {
          console.error('⚠️  Failed to add camp donation to inventory:', inventoryError.message);
        }
      }
    }

    await camp.save();

    const updatedCamp = await Camp.findById(campId)
      .populate('organizerId', 'name email phone')
      .populate('registeredDonors.donorId')
      .populate('registeredDonors.donationId', 'certificate status unitsCollected donationDate');

    return sendResponse(
      res,
      200,
      true,
      'Attendance marked successfully',
      updatedCamp
    );
  } catch (error) {
    next(error);
  }
};

export const getMyCamps = async (req, res, next) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });

    if (!donor) {
      res.status(404);
      throw new Error('Donor profile not found');
    }

    const camps = await Camp.find({
      'registeredDonors.donorId': donor._id,
      isActive: true,
    })
      .populate('organizerId', 'name email phone')
      .sort({ date: -1 });

    return sendResponse(
      res,
      200,
      true,
      'Your camps retrieved successfully',
      camps.map(withEffectiveCampStatus)
    );
  } catch (error) {
    next(error);
  }
};

export const getUpcomingCamps = async (req, res, next) => {
  try {
    const { city, state } = req.query;

    const filter = {
      isActive: true,
      status: 'upcoming',
      date: { $gte: startOfUtcToday() },
    };

    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    if (state) {
      filter['location.state'] = { $regex: state, $options: 'i' };
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const camps = await Camp.find(filter)
      .populate('organizerId', 'name email phone')
      .sort({ date: 1 })
      .limit(Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 20) : 20);

    return sendResponse(
      res,
      200,
      true,
      'Upcoming camps retrieved successfully',
      camps.map(withEffectiveCampStatus)
    );
  } catch (error) {
    next(error);
  }
};

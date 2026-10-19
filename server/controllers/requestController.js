import Request from '../models/Request.js';
import Donor from '../models/Donor.js';
import Donation from '../models/Donation.js';
import sendResponse from '../utils/responseHandler.js';

export const createRequest = async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const requestData = {
      ...req.body,
      requesterId,
    };

    if (req.user.role === 'patient') {
      Object.assign(requestData, {
        status: 'pending',
        unitsFulfilled: 0,
        matchedDonors: [],
        isActive: true,
      });
    }

    const request = await Request.create(requestData);

    const populatedRequest = await Request.findById(request._id).populate(
      'requesterId',
      'name email phone'
    );

    return sendResponse(
      res,
      201,
      true,
      'Blood request created successfully',
      populatedRequest
    );
  } catch (error) {
    next(error);
  }
};

export const getAllRequests = async (req, res, next) => {
  try {
    const {
      status,
      bloodGroup,
      city,
      state,
      urgency,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = { isActive: true };

    if (req.user.role === 'patient') {
      filter.requesterId = req.user._id;
    }

    if (status) {
      filter.status = status;
    }

    if (bloodGroup) {
      filter.bloodGroup = bloodGroup;
    }

    if (city) {
      filter['hospital.city'] = { $regex: city, $options: 'i' };
    }

    if (state) {
      filter['hospital.state'] = { $regex: state, $options: 'i' };
    }

    if (urgency) {
      filter.urgency = urgency;
    }

    const skip = (page - 1) * limit;

    const requests = await Request.find(filter)
      .populate('requesterId', 'name email phone')
      .populate('matchedDonors.donorId', 'bloodGroup userId')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ urgency: -1, createdAt: -1 });

    const total = await Request.countDocuments(filter);

    return sendResponse(res, 200, true, 'Requests retrieved successfully', {
      requests,
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

export const getRequestById = async (req, res, next) => {
  try {
    let requestQuery = Request.findById(req.params.id).populate(
      'requesterId',
      'name email phone'
    );

    if (req.user.role === 'patient') {
      requestQuery = requestQuery.populate('matchedDonors.donorId', 'bloodGroup');
    } else {
      requestQuery = requestQuery
        .populate('matchedDonors.donorId')
        .populate({
          path: 'matchedDonors.donorId',
          populate: {
            path: 'userId',
            select: 'name email phone',
          },
        });
    }

    const request = await requestQuery;

    if (!request) {
      res.status(404);
      throw new Error('Request not found');
    }

    if (
      req.user.role === 'patient' &&
      (request.requesterId._id || request.requesterId).toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error('You can only view your own blood requests.');
    }

    return sendResponse(
      res,
      200,
      true,
      'Request retrieved successfully',
      request
    );
  } catch (error) {
    next(error);
  }
};

export const updateRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      res.status(404);
      throw new Error('Request not found');
    }

    if (
      request.requesterId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      res.status(403);
      throw new Error('Not authorized to update this request');
    }

    const allowedUpdates = [
      'patientName',
      'patientAge',
      'unitsRequired',
      'urgency',
      'requiredBy',
      'hospital',
      'contactInfo',
      'reason',
      'status',
      'notes',
    ];

    const userAllowedUpdates = req.user.role === 'patient'
      ? allowedUpdates.filter((field) => !['status', 'notes'].includes(field))
      : allowedUpdates;

    userAllowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        request[field] = req.body[field];
      }
    });

    await request.save();

    const updatedRequest = await Request.findById(request._id).populate(
      'requesterId',
      'name email phone'
    );

    return sendResponse(
      res,
      200,
      true,
      'Request updated successfully',
      updatedRequest
    );
  } catch (error) {
    next(error);
  }
};

export const deleteRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      res.status(404);
      throw new Error('Request not found');
    }

    if (
      request.requesterId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      res.status(403);
      throw new Error('Not authorized to delete this request');
    }

    request.isActive = false;
    request.status = 'cancelled';
    await request.save();

    return sendResponse(
      res,
      200,
      true,
      'Request cancelled successfully',
      null
    );
  } catch (error) {
    next(error);
  }
};

export const findMatchingDonors = async (req, res, next) => {
  try {
    const { bloodGroup } = req.params;
    const { city, state, limit = 50 } = req.query;

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
      .limit(parseInt(limit))
      .sort({ totalDonations: -1 });

    return sendResponse(
      res,
      200,
      true,
      `Found ${donors.length} matching eligible donors`,
      donors
    );
  } catch (error) {
    next(error);
  }
};

export const matchDonorsToRequest = async (req, res, next) => {
  try {
    const requestId = req.params.id;
    const { autoMatch = true, donorIds } = req.body;

    const request = await Request.findById(requestId);

    if (!request) {
      res.status(404);
      throw new Error('Request not found');
    }

    if (request.status === 'fulfilled' || request.status === 'cancelled') {
      res.status(400);
      throw new Error('Cannot match donors to fulfilled or cancelled request');
    }

    let matchedDonors = [];

    if (autoMatch) {
      const donors = await Donor.find({
        bloodGroup: request.bloodGroup,
        'address.city': { $regex: request.hospital.city, $options: 'i' },
        isEligible: true,
        isActive: true,
      })
        .limit(20)
        .sort({ totalDonations: -1 });

      // Get already matched donor IDs to prevent duplicates
      const existingDonorIds = request.matchedDonors.map(md => md.donorId.toString());

      matchedDonors = donors
        .filter(donor => !existingDonorIds.includes(donor._id.toString()))
        .map((donor) => ({
          donorId: donor._id,
        }));
    } else if (donorIds && donorIds.length > 0) {
      // Get already matched donor IDs to prevent duplicates
      const existingDonorIds = request.matchedDonors.map(md => md.donorId.toString());

      matchedDonors = donorIds
        .filter(id => !existingDonorIds.includes(id))
        .map((id) => ({
          donorId: id,
        }));
    }

    if (matchedDonors.length === 0) {
      res.status(400);
      throw new Error('No new donors found to match or all donors are already matched');
    }

    request.matchedDonors.push(...matchedDonors);
    await request.save();

    const updatedRequest = await Request.findById(requestId)
      .populate('requesterId', 'name email phone')
      .populate('matchedDonors.donorId')
      .populate({
        path: 'matchedDonors.donorId',
        populate: {
          path: 'userId',
          select: 'name email phone',
        },
      });

    return sendResponse(
      res,
      200,
      true,
      `Matched ${matchedDonors.length} donors to request`,
      updatedRequest
    );
  } catch (error) {
    next(error);
  }
};

export const updateDonorResponse = async (req, res, next) => {
  try {
    const { requestId, donorId } = req.params;
    const { contacted, agreedToDonate, donated, unitsContributed } = req.body;

    const request = await Request.findById(requestId);

    if (!request) {
      res.status(404);
      throw new Error('Request not found');
    }

    const matchedDonor = request.matchedDonors.find(
      (md) => md.donorId.toString() === donorId
    );

    if (!matchedDonor) {
      res.status(404);
      throw new Error('Donor not matched to this request');
    }

    if (contacted !== undefined) matchedDonor.contacted = contacted;
    if (agreedToDonate !== undefined) matchedDonor.agreedToDonate = agreedToDonate;
    if (donated !== undefined) {
      if (donated && !matchedDonor.donated) {
        const contributedUnits = Number(unitsContributed);
        if (!Number.isFinite(contributedUnits) || contributedUnits < 0.5 || contributedUnits > 2) {
          res.status(400);
          throw new Error('Units contributed must be between 0.5 and 2');
        }
        if (contributedUnits > request.getRemainingUnits()) {
          res.status(400);
          throw new Error('Units contributed cannot exceed the remaining request');
        }
        const donor = await Donor.findById(donorId);
        if (!donor) {
          res.status(404);
          throw new Error('Donor profile not found');
        }
        await Donation.create({
          donorId,
          requestId,
          donationType: 'request',
          donationDate: new Date(),
          bloodGroup: donor.bloodGroup,
          unitsCollected: contributedUnits,
          location: {
            facility: request.hospital.name,
            city: request.hospital.city,
            state: request.hospital.state,
          },
          verifiedBy: req.user._id,
          status: 'completed',
        });
        matchedDonor.donated = true;
        matchedDonor.unitsContributed = contributedUnits;
        request.unitsFulfilled += contributedUnits;
      } else if (!donated && matchedDonor.donated) {
        res.status(400);
        throw new Error('A completed donation cannot be undone from the donor response');
      } else if (donated) {
        res.status(400);
        throw new Error('This donor donation has already been recorded');
      } else {
        matchedDonor.donated = false;
      }
    }

    request.updateStatus();
    await request.save();

    const updatedRequest = await Request.findById(requestId)
      .populate('requesterId', 'name email phone')
      .populate('matchedDonors.donorId');

    return sendResponse(
      res,
      200,
      true,
      'Donor response updated successfully',
      updatedRequest
    );
  } catch (error) {
    next(error);
  }
};

export const getMyRequests = async (req, res, next) => {
  try {
    const requests = await Request.find({
      requesterId: req.user._id,
      isActive: true,
    })
      .populate('matchedDonors.donorId', 'bloodGroup')
      .sort({ createdAt: -1 });

    return sendResponse(
      res,
      200,
      true,
      'Your requests retrieved successfully',
      requests
    );
  } catch (error) {
    next(error);
  }
};

export const getUrgentRequests = async (req, res, next) => {
  try {
    const { city, state } = req.query;

    const filter = {
      isActive: true,
      status: { $in: ['pending', 'partially_fulfilled'] },
      urgency: { $in: ['high', 'critical'] },
      requiredBy: { $gte: new Date() },
    };

    if (req.user.role === 'patient') {
      filter.requesterId = req.user._id;
    }

    if (city) {
      filter['hospital.city'] = { $regex: city, $options: 'i' };
    }

    if (state) {
      filter['hospital.state'] = { $regex: state, $options: 'i' };
    }

    const requests = await Request.find(filter)
      .populate('requesterId', 'name email phone')
      .sort({ urgency: -1, requiredBy: 1 })
      .limit(20);

    return sendResponse(
      res,
      200,
      true,
      'Urgent requests retrieved successfully',
      requests
    );
  } catch (error) {
    next(error);
  }
};

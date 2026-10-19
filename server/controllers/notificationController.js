import asyncHandler from 'express-async-handler';
import { sendSMS, sendBulkSMS, getNotificationHistory, checkSMSStatus } from '../utils/sendSMS.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Donor from '../models/Donor.js';
import Request from '../models/Request.js';
import sendResponse from '../utils/responseHandler.js';

/**
 * @desc    Send SMS to a single recipient
 * @route   POST /api/notifications/sms
 * @access  Private (Admin/Organizer)
 */
export const sendSingleSMS = asyncHandler(async (req, res) => {
  const { recipientId, message, type = 'general', relatedEntity } = req.body;

  // Validate required fields
  if (!recipientId || !message) {
    return sendResponse(res, 400, false, 'Please provide recipientId and message');
  }

  // Get recipient details
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    return sendResponse(res, 404, false, 'Recipient not found');
  }

  if (!recipient.phone) {
    return sendResponse(res, 400, false, 'Recipient does not have a phone number');
  }

  // Send SMS
  const result = await sendSMS({
    to: recipient.phone,
    message,
    recipientId,
    sentBy: req.user._id,
    type,
    relatedEntity,
  });

  if (result.success) {
    return sendResponse(res, 200, true, 'SMS sent successfully', {
      notification: result.notification,
      twilioResponse: result.twilioResponse,
    });
  } else {
    return sendResponse(res, 500, false, result.error || 'Failed to send SMS');
  }
});

/**
 * @desc    Send SMS to eligible donors for emergency request
 * @route   POST /api/notifications/emergency-donors
 * @access  Private (Admin/Organizer)
 */
export const sendEmergencyNotificationToDonors = asyncHandler(async (req, res) => {
  const { requestId, selectedDonorIds } = req.body;

  if (!requestId || !selectedDonorIds || !Array.isArray(selectedDonorIds)) {
    return sendResponse(res, 400, false, 'Please provide requestId and selectedDonorIds array');
  }

  // Get request details
  const emergencyRequest = await Request.findById(requestId);
  if (!emergencyRequest) {
    return sendResponse(res, 404, false, 'Request not found');
  }

  // Get selected donors with their user details
  const donors = await Donor.find({
    _id: { $in: selectedDonorIds },
    isEligible: true,
    isActive: true,
  }).populate('userId', 'name phone email');

  if (donors.length === 0) {
    return sendResponse(res, 404, false, 'No eligible donors found');
  }

  // Filter donors who have phone numbers
  const donorsWithPhone = donors.filter(donor => donor.userId && donor.userId.phone);

  if (donorsWithPhone.length === 0) {
    return sendResponse(res, 400, false, 'No donors have phone numbers');
  }

  // Prepare message
  const message = `🩸 URGENT BLOOD NEEDED 🩸\n\nBlood Group: ${emergencyRequest.bloodGroup}\nUnits Required: ${emergencyRequest.unitsRequired}\nPatient: ${emergencyRequest.patientName}\nHospital: ${emergencyRequest.hospital.name}, ${emergencyRequest.hospital.city}\nContact: ${emergencyRequest.contactInfo.phone}\n\nYour help can save a life! Please contact urgently if you can donate.\n\nThank you,\nBlood Donation Management`;

  // Prepare recipients array
  const recipients = donorsWithPhone.map(donor => ({
    userId: donor.userId._id,
    phone: donor.userId.phone,
  }));

  // Send bulk SMS
  const result = await sendBulkSMS({
    recipients,
    message,
    sentBy: req.user._id,
    type: 'emergency_request',
    relatedEntity: {
      entityType: 'Request',
      entityId: requestId,
    },
  });

  return sendResponse(res, 200, true, 'Emergency notifications sent', {
    total: result.total,
    successful: result.successful,
    failed: result.failed,
    details: result.details,
  });
});

/**
 * @desc    Get eligible donors for emergency request
 * @route   GET /api/notifications/eligible-donors/:requestId
 * @access  Private (Admin/Organizer)
 */
export const getEligibleDonorsForRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  // Get request details
  const emergencyRequest = await Request.findById(requestId);
  if (!emergencyRequest) {
    return sendResponse(res, 404, false, 'Request not found');
  }

  // Find eligible donors matching blood group and location
  const eligibleDonors = await Donor.find({
    bloodGroup: emergencyRequest.bloodGroup,
    isEligible: true,
    isActive: true,
    'address.city': emergencyRequest.hospital.city,
  })
    .populate('userId', 'name phone email')
    .sort({ lastDonationDate: 1 }); // Sort by oldest donation first

  // Format response
  const donorsData = eligibleDonors.map(donor => ({
    donorId: donor._id,
    userId: donor.userId._id,
    name: donor.userId.name,
    phone: donor.userId.phone,
    email: donor.userId.email,
    bloodGroup: donor.bloodGroup,
    lastDonationDate: donor.lastDonationDate,
    totalDonations: donor.totalDonations,
    city: donor.address.city,
    hasPhone: !!donor.userId.phone,
  }));

  return sendResponse(res, 200, true, 'Eligible donors retrieved', {
    request: {
      id: emergencyRequest._id,
      patientName: emergencyRequest.patientName,
      bloodGroup: emergencyRequest.bloodGroup,
      unitsRequired: emergencyRequest.unitsRequired,
      urgency: emergencyRequest.urgency,
      hospital: emergencyRequest.hospital,
    },
    eligibleDonors: donorsData,
    totalEligible: donorsData.length,
    withPhone: donorsData.filter(d => d.hasPhone).length,
  });
});

/**
 * @desc    Notify admin about new camp creation
 * @route   POST /api/notifications/camp-created
 * @access  Private (System/Internal)
 */
export const notifyAdminAboutCamp = asyncHandler(async (req, res) => {
  const { campId, organizerId } = req.body;

  if (!campId || !organizerId) {
    return sendResponse(res, 400, false, 'Please provide campId and organizerId');
  }

  // Get all admin users
  const admins = await User.find({ role: 'admin', isActive: true });

  if (admins.length === 0) {
    return sendResponse(res, 404, false, 'No admin users found');
  }

  // Get camp and organizer details
  const Camp = (await import('../models/Camp.js')).default;
  const camp = await Camp.findById(campId).populate('organizerId', 'name email');

  if (!camp) {
    return sendResponse(res, 404, false, 'Camp not found');
  }

  // Prepare message
  const campDate = new Date(camp.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const message = `🏥 New Blood Donation Camp Created\n\nCamp: ${camp.name}\nOrganizer: ${camp.organizerId.name}\nDate: ${campDate}\nTime: ${camp.startTime} - ${camp.endTime}\nLocation: ${camp.location.venueName}, ${camp.location.city}\nCapacity: ${camp.capacity}\n\nPlease review and approve.\n\nBlood Donation Management`;

  // Filter admins with phone numbers
  const adminsWithPhone = admins.filter(admin => admin.phone);

  if (adminsWithPhone.length === 0) {
    return sendResponse(res, 400, false, 'No admin users have phone numbers');
  }

  // Prepare recipients array
  const recipients = adminsWithPhone.map(admin => ({
    userId: admin._id,
    phone: admin.phone,
  }));

  // Send bulk SMS
  const result = await sendBulkSMS({
    recipients,
    message,
    sentBy: organizerId,
    type: 'camp_created',
    relatedEntity: {
      entityType: 'Camp',
      entityId: campId,
    },
  });

  return sendResponse(res, 200, true, 'Admin notifications sent', {
    total: result.total,
    successful: result.successful,
    failed: result.failed,
  });
});

/**
 * @desc    Get notification history for current user
 * @route   GET /api/notifications/history
 * @access  Private
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  const notifications = await getNotificationHistory(req.user._id, limit);

  return sendResponse(res, 200, true, 'Notifications retrieved', {
    notifications,
    count: notifications.length,
  });
});

/**
 * @desc    Get all notifications (Admin only)
 * @route   GET /api/notifications
 * @access  Private (Admin)
 */
export const getAllNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = {};

  // Filter by status if provided
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Filter by type if provided
  if (req.query.type) {
    query.type = req.query.type;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('recipientId', 'name email')
    .populate('sentBy', 'name email');

  const total = await Notification.countDocuments(query);

  return sendResponse(res, 200, true, 'All notifications retrieved', {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Check SMS delivery status
 * @route   GET /api/notifications/status/:messageSid
 * @access  Private (Admin/Organizer)
 */
export const getSMSStatus = asyncHandler(async (req, res) => {
  const { messageSid } = req.params;

  const status = await checkSMSStatus(messageSid);

  return sendResponse(res, 200, true, 'SMS status retrieved', status);
});

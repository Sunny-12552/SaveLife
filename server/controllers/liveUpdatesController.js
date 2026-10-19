import Camp from '../models/Camp.js';
import Donation from '../models/Donation.js';
import Request from '../models/Request.js';
import sendResponse from '../utils/responseHandler.js';

const startOfToday = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};

export const getLiveUpdates = async (req, res, next) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [camps, fulfilledRequests, donations] = await Promise.all([
      Camp.find({
        isActive: true,
        status: 'upcoming',
        date: { $gte: startOfToday() },
      })
        .select('name date createdAt location.city location.state')
        .sort({ createdAt: -1, date: 1 })
        .limit(10)
        .lean(),
      Request.find({
        isActive: true,
        status: 'fulfilled',
        $or: [
          { fulfilledAt: { $gte: oneDayAgo } },
          { fulfilledAt: null, updatedAt: { $gte: oneDayAgo } },
        ],
      })
        .select('bloodGroup unitsFulfilled fulfilledAt updatedAt hospital.city')
        .sort({ fulfilledAt: -1, updatedAt: -1 })
        .limit(10)
        .lean(),
      Donation.find({
        status: 'completed',
        donationDate: { $gte: oneDayAgo, $lte: now },
      })
        .select('bloodGroup unitsCollected donationDate location.facility location.city campId')
        .populate('campId', 'name')
        .sort({ donationDate: -1 })
        .limit(10)
        .lean(),
    ]);

    const updates = [
      ...camps.map((camp) => ({
        id: `camp-${camp._id}`,
        kind: 'camp',
        icon: '🏕️',
        title: 'Upcoming blood donation camp',
        message: camp.name,
        detail: [
          new Date(camp.date).toLocaleDateString(),
          [camp.location?.city, camp.location?.state].filter(Boolean).join(', '),
        ].filter(Boolean).join(' · '),
        link: `/camp-info/${camp._id}`,
        linkLabel: 'View camp',
        sortAt: camp.createdAt,
      })),
      ...fulfilledRequests.map((request) => ({
        id: `request-${request._id}`,
        kind: 'request',
        icon: '✅',
        title: 'Blood request fulfilled',
        message: `${request.bloodGroup} request filled — ${request.unitsFulfilled} ${request.unitsFulfilled === 1 ? 'unit' : 'units'}`,
        detail: request.hospital?.city || 'A patient received the requested blood',
        link: '/requests',
        linkLabel: 'View requests',
        sortAt: request.fulfilledAt || request.updatedAt,
      })),
      ...donations.map((donation) => ({
        id: `donation-${donation._id}`,
        kind: 'donation',
        icon: '🩸',
        title: 'A donor gave blood',
        message: `${donation.unitsCollected} ${donation.unitsCollected === 1 ? 'unit' : 'units'} of ${donation.bloodGroup} donated`,
        detail: donation.campId?.name || [donation.location?.facility, donation.location?.city].filter(Boolean).join(' · ') || 'Thank you to our donor',
        link: donation.campId?._id ? `/camp-info/${donation.campId._id}` : '/dashboard',
        linkLabel: donation.campId?._id ? 'View camp' : 'View dashboard',
        sortAt: donation.donationDate,
      })),
    ].sort((first, second) => new Date(second.sortAt) - new Date(first.sortAt))
      .map(({ sortAt, ...update }) => update);

    return sendResponse(res, 200, true, 'Live updates retrieved successfully', updates);
  } catch (error) {
    next(error);
  }
};

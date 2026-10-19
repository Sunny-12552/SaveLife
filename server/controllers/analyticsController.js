import Analytics from '../models/Analytics.js';
import Donor from '../models/Donor.js';
import Camp from '../models/Camp.js';
import Request from '../models/Request.js';
import Donation from '../models/Donation.js';

// Get dashboard overview statistics
export const getDashboardStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get total counts
    const [
      totalDonors,
      totalCamps,
      totalRequests,
      totalDonations,
      eligibleDonors,
      activeCamps,
      activeRequests,
      completedCamps,
      fulfilledRequests
    ] = await Promise.all([
      Donor.countDocuments({ isActive: true, ...dateFilter }),
      Camp.countDocuments(dateFilter),
      Request.countDocuments(dateFilter),
      Donation.countDocuments({ status: 'completed', ...dateFilter }),
      Donor.countDocuments({ isActive: true, isEligible: true }),
      Camp.countDocuments({ status: { $in: ['upcoming', 'ongoing'] } }),
      Request.countDocuments({ status: { $in: ['pending', 'partially_fulfilled'] } }),
      Camp.countDocuments({ status: 'completed', ...dateFilter }),
      Request.countDocuments({ status: 'fulfilled', ...dateFilter })
    ]);

    // Get total units collected
    const unitsResult = await Donation.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      { $group: { _id: null, totalUnits: { $sum: '$unitsCollected' } } }
    ]);
    const totalUnits = unitsResult.length > 0 ? unitsResult[0].totalUnits : 0;

    // Get blood group distribution
    const bloodGroupDist = await Donor.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get top cities by donors
    const topCities = await Donor.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$address.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, city: '$_id', count: 1 } }
    ]);

    // Get donation trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const donationTrends = await Donation.aggregate([
      {
        $match: {
          status: 'completed',
          donationDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$donationDate' } },
          count: { $sum: 1 },
          units: { $sum: '$unitsCollected' }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1, units: 1 } }
    ]);

    // Get donation type breakdown
    const donationTypes = await Donation.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      { $group: { _id: '$donationType', count: { $sum: 1 } } },
      { $project: { _id: 0, type: '$_id', count: 1 } }
    ]);

    const stats = {
      overview: {
        totalDonors,
        totalCamps,
        totalRequests,
        totalDonations,
        totalUnits,
        eligibleDonors,
        activeCamps,
        activeRequests,
        completedCamps,
        fulfilledRequests
      },
      bloodGroupDistribution: bloodGroupDist,
      topCities,
      donationTrends,
      donationTypes
    };

    return res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// Get donor analytics
export const getDonorAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Donor registration trends
    const registrationTrends = await Donor.aggregate([
      { $match: { ...dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } }
    ]);

    // Donor eligibility stats
    const eligibilityStats = await Donor.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$isEligible',
          count: { $sum: 1 }
        }
      }
    ]);

    // Gender distribution
    const genderDistribution = await Donor.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$gender', count: { $sum: 1 } } },
      { $project: { _id: 0, gender: '$_id', count: 1 } }
    ]);

    // Age group distribution
    const ageDistribution = await Donor.aggregate([
      { $match: { isActive: true } },
      {
        $project: {
          age: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), '$dateOfBirth'] },
                1000 * 60 * 60 * 24 * 365
              ]
            }
          }
        }
      },
      {
        $bucket: {
          groupBy: '$age',
          boundaries: [18, 25, 35, 45, 55, 65],
          default: '65+',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    // Top donors by donation count
    const topDonors = await Donor.find({ isActive: true })
      .sort({ totalDonations: -1 })
      .limit(10)
      .populate('userId', 'name email')
      .select('userId bloodGroup totalDonations lastDonationDate');

    // Donors by location
    const donorsByLocation = await Donor.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: {
            city: '$address.city',
            state: '$address.state'
          },
          count: { $sum: 1 },
          eligibleCount: {
            $sum: { $cond: ['$isEligible', 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          city: '$_id.city',
          state: '$_id.state',
          totalDonors: '$count',
          eligibleDonors: '$eligibleCount'
        }
      }
    ]);

    const analytics = {
      registrationTrends,
      eligibilityStats,
      genderDistribution,
      ageDistribution,
      topDonors,
      donorsByLocation
    };

    return res.status(200).json({
      success: true,
      message: 'Donor analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// Get camp analytics
export const getCampAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    // Camp status distribution
    const statusDistribution = await Camp.aggregate([
      { $match: { ...dateFilter } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } }
    ]);

    // Camps by location
    const campsByLocation = await Camp.aggregate([
      { $match: { ...dateFilter } },
      {
        $group: {
          _id: {
            city: '$location.city',
            state: '$location.state'
          },
          count: { $sum: 1 },
          totalUnits: { $sum: '$totalUnitsCollected' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 15 },
      {
        $project: {
          _id: 0,
          city: '$_id.city',
          state: '$_id.state',
          totalCamps: '$count',
          totalUnits: 1
        }
      }
    ]);

    // Camp performance metrics
    const performanceMetrics = await Camp.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $project: {
          name: 1,
          date: 1,
          capacity: 1,
          registeredCount: { $size: '$registeredDonors' },
          attendedCount: {
            $size: {
              $filter: {
                input: '$registeredDonors',
                as: 'donor',
                cond: { $eq: ['$$donor.attended', true] }
              }
            }
          },
          donatedCount: {
            $size: {
              $filter: {
                input: '$registeredDonors',
                as: 'donor',
                cond: { $eq: ['$$donor.donated', true] }
              }
            }
          },
          totalUnitsCollected: 1,
          location: 1
        }
      },
      {
        $project: {
          name: 1,
          date: 1,
          capacity: 1,
          registeredCount: 1,
          attendedCount: 1,
          donatedCount: 1,
          totalUnitsCollected: 1,
          attendanceRate: {
            $cond: [
              { $eq: ['$registeredCount', 0] },
              0,
              { $multiply: [{ $divide: ['$attendedCount', '$registeredCount'] }, 100] }
            ]
          },
          donationRate: {
            $cond: [
              { $eq: ['$attendedCount', 0] },
              0,
              { $multiply: [{ $divide: ['$donatedCount', '$attendedCount'] }, 100] }
            ]
          },
          city: '$location.city'
        }
      },
      { $sort: { totalUnitsCollected: -1 } },
      { $limit: 20 }
    ]);

    // Monthly camp trends
    const monthlyTrends = await Camp.aggregate([
      { $match: { ...dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          count: { $sum: 1 },
          totalUnits: { $sum: '$totalUnitsCollected' },
          totalRegistrations: {
            $sum: { $size: '$registeredDonors' }
          }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          month: '$_id',
          campCount: '$count',
          totalUnits: 1,
          totalRegistrations: 1
        }
      }
    ]);

    // Average units per camp
    const averageStats = await Camp.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: null,
          avgUnitsPerCamp: { $avg: '$totalUnitsCollected' },
          avgRegistrationsPerCamp: { $avg: { $size: '$registeredDonors' } },
          totalCamps: { $sum: 1 }
        }
      }
    ]);

    const analytics = {
      statusDistribution,
      campsByLocation,
      performanceMetrics,
      monthlyTrends,
      averageStats: averageStats.length > 0 ? averageStats[0] : null
    };

    return res.status(200).json({
      success: true,
      message: 'Camp analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// Get request analytics
export const getRequestAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Request status distribution
    const statusDistribution = await Request.aggregate([
      { $match: { ...dateFilter } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } }
    ]);

    // Urgency level distribution
    const urgencyDistribution = await Request.aggregate([
      { $match: { ...dateFilter } },
      { $group: { _id: '$urgency', count: { $sum: 1 } } },
      { $project: { _id: 0, urgency: '$_id', count: 1 } }
    ]);

    // Blood group demand
    const bloodGroupDemand = await Request.aggregate([
      { $match: { ...dateFilter } },
      {
        $group: {
          _id: '$bloodGroup',
          requestCount: { $sum: 1 },
          totalUnitsRequested: { $sum: '$unitsRequired' },
          totalUnitsFulfilled: { $sum: '$unitsFulfilled' }
        }
      },
      { $sort: { requestCount: -1 } },
      {
        $project: {
          _id: 0,
          bloodGroup: '$_id',
          requestCount: 1,
          totalUnitsRequested: 1,
          totalUnitsFulfilled: 1,
          fulfillmentRate: {
            $cond: [
              { $eq: ['$totalUnitsRequested', 0] },
              0,
              { $multiply: [{ $divide: ['$totalUnitsFulfilled', '$totalUnitsRequested'] }, 100] }
            ]
          }
        }
      }
    ]);

    // Requests by location
    const requestsByLocation = await Request.aggregate([
      { $match: { ...dateFilter } },
      {
        $group: {
          _id: {
            city: '$hospital.city',
            state: '$hospital.state'
          },
          count: { $sum: 1 },
          totalUnitsRequested: { $sum: '$unitsRequired' },
          totalUnitsFulfilled: { $sum: '$unitsFulfilled' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 15 },
      {
        $project: {
          _id: 0,
          city: '$_id.city',
          state: '$_id.state',
          requestCount: '$count',
          totalUnitsRequested: 1,
          totalUnitsFulfilled: 1
        }
      }
    ]);

    // Request fulfillment trends
    const fulfillmentTrends = await Request.aggregate([
      { $match: { ...dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalRequests: { $sum: 1 },
          fulfilledRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'fulfilled'] }, 1, 0] }
          },
          unitsRequested: { $sum: '$unitsRequired' },
          unitsFulfilled: { $sum: '$unitsFulfilled' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalRequests: 1,
          fulfilledRequests: 1,
          unitsRequested: 1,
          unitsFulfilled: 1
        }
      }
    ]);

    // Average fulfillment time
    const fulfillmentTime = await Request.aggregate([
      {
        $match: {
          status: 'fulfilled',
          ...dateFilter
        }
      },
      {
        $project: {
          fulfillmentTime: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgFulfillmentTime: { $avg: '$fulfillmentTime' },
          minFulfillmentTime: { $min: '$fulfillmentTime' },
          maxFulfillmentTime: { $max: '$fulfillmentTime' }
        }
      }
    ]);

    const analytics = {
      statusDistribution,
      urgencyDistribution,
      bloodGroupDemand,
      requestsByLocation,
      fulfillmentTrends,
      fulfillmentTime: fulfillmentTime.length > 0 ? fulfillmentTime[0] : null
    };

    return res.status(200).json({
      success: true,
      message: 'Request analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// Get donation analytics
export const getDonationAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.donationDate = {};
      if (startDate) dateFilter.donationDate.$gte = new Date(startDate);
      if (endDate) dateFilter.donationDate.$lte = new Date(endDate);
    }

    // Donation trends over time
    const donationTrends = await Donation.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$donationDate' } },
          count: { $sum: 1 },
          totalUnits: { $sum: '$unitsCollected' }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1, totalUnits: 1 } }
    ]);

    // Donation type distribution
    const typeDistribution = await Donation.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: '$donationType',
          count: { $sum: 1 },
          totalUnits: { $sum: '$unitsCollected' }
        }
      },
      { $project: { _id: 0, type: '$_id', count: 1, totalUnits: 1 } }
    ]);

    // Blood group collection
    const bloodGroupCollection = await Donation.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: '$bloodGroup',
          count: { $sum: 1 },
          totalUnits: { $sum: '$unitsCollected' }
        }
      },
      { $sort: { count: -1 } },
      { $project: { _id: 0, bloodGroup: '$_id', count: 1, totalUnits: 1 } }
    ]);

    // Monthly donation summary
    const monthlySummary = await Donation.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$donationDate' } },
          totalDonations: { $sum: 1 },
          totalUnits: { $sum: '$unitsCollected' },
          avgUnitsPerDonation: { $avg: '$unitsCollected' }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: '$_id', totalDonations: 1, totalUnits: 1, avgUnitsPerDonation: 1 } }
    ]);

    // Donation location analysis
    const locationAnalysis = await Donation.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: {
            city: '$location.city',
            state: '$location.state'
          },
          count: { $sum: 1 },
          totalUnits: { $sum: '$unitsCollected' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 15 },
      {
        $project: {
          _id: 0,
          city: '$_id.city',
          state: '$_id.state',
          donationCount: '$count',
          totalUnits: 1
        }
      }
    ]);

    // Health metrics averages
    const healthMetrics = await Donation.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: null,
          avgWeight: { $avg: '$preCheckup.weight' },
          avgHemoglobin: { $avg: '$preCheckup.hemoglobin' },
          avgTemperature: { $avg: '$preCheckup.temperature' },
          avgPulse: { $avg: '$preCheckup.pulse' }
        }
      }
    ]);

    const analytics = {
      donationTrends,
      typeDistribution,
      bloodGroupCollection,
      monthlySummary,
      locationAnalysis,
      healthMetrics: healthMetrics.length > 0 ? healthMetrics[0] : null
    };

    return res.status(200).json({
      success: true,
      message: 'Donation analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// Generate comprehensive report
export const generateReport = async (req, res, next) => {
  try {
    const { reportType, startDate, endDate, format } = req.query;

    if (!reportType) {
      return res.status(400).json({
        success: false,
        message: 'Report type is required'
      });
    }

    const dateFilter = {};
    if (startDate || endDate) {
      const dateField = reportType === 'camp' ? 'date' :
                       reportType === 'donation' ? 'donationDate' : 'createdAt';
      dateFilter[dateField] = {};
      if (startDate) dateFilter[dateField].$gte = new Date(startDate);
      if (endDate) dateFilter[dateField].$lte = new Date(endDate);
    }

    let reportData = {};

    switch (reportType) {
      case 'donor':
        reportData = await Donor.find({ isActive: true, ...dateFilter })
          .populate('userId', 'name email phone')
          .select('-__v')
          .lean();
        break;

      case 'camp':
        reportData = await Camp.find({ ...dateFilter })
          .populate('organizerId', 'name email')
          .populate('registeredDonors.donorId', 'bloodGroup')
          .select('-__v')
          .lean();
        break;

      case 'request':
        reportData = await Request.find({ ...dateFilter })
          .populate('requesterId', 'name email phone')
          .select('-__v')
          .lean();
        break;

      case 'donation':
        reportData = await Donation.find({ ...dateFilter })
          .populate('donorId', 'bloodGroup')
          .populate('campId', 'name')
          .populate('requestId', 'patientName')
          .select('-__v')
          .lean();
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // If CSV format requested, convert to CSV
    if (format === 'csv') {
      const csvData = convertToCSV(reportData, reportType);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report-${Date.now()}.csv`);
      return res.send(csvData);
    }

    return res.status(200).json({
      success: true,
      message: `${reportType} report generated successfully`,
      data: reportData
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to convert data to CSV
const convertToCSV = (data, reportType) => {
  if (!data || data.length === 0) {
    return '';
  }

  let headers = [];
  let rows = [];

  switch (reportType) {
    case 'donor':
      headers = ['Name', 'Email', 'Phone', 'Blood Group', 'City', 'State', 'Last Donation', 'Total Donations', 'Eligible'];
      rows = data.map(d => [
        d.userId?.name || '',
        d.userId?.email || '',
        d.userId?.phone || '',
        d.bloodGroup,
        d.address?.city || '',
        d.address?.state || '',
        d.lastDonationDate ? new Date(d.lastDonationDate).toLocaleDateString() : 'Never',
        d.totalDonations,
        d.isEligible ? 'Yes' : 'No'
      ]);
      break;

    case 'camp':
      headers = ['Name', 'Date', 'City', 'State', 'Organizer', 'Status', 'Capacity', 'Registered', 'Units Collected'];
      rows = data.map(c => [
        c.name,
        new Date(c.date).toLocaleDateString(),
        c.location?.city || '',
        c.location?.state || '',
        c.organizerId?.name || '',
        c.status,
        c.capacity,
        c.registeredDonors?.length || 0,
        c.totalUnitsCollected || 0
      ]);
      break;

    case 'request':
      headers = ['Patient Name', 'Blood Group', 'Units Required', 'Units Fulfilled', 'Urgency', 'Hospital', 'City', 'Status', 'Created Date'];
      rows = data.map(r => [
        r.patientName,
        r.bloodGroup,
        r.unitsRequired,
        r.unitsFulfilled,
        r.urgency,
        r.hospital?.name || '',
        r.hospital?.city || '',
        r.status,
        new Date(r.createdAt).toLocaleDateString()
      ]);
      break;

    case 'donation':
      headers = ['Blood Group', 'Donation Date', 'Units Collected', 'Type', 'Camp', 'City', 'Status'];
      rows = data.map(d => [
        d.bloodGroup,
        new Date(d.donationDate).toLocaleDateString(),
        d.unitsCollected,
        d.donationType,
        d.campId?.name || 'N/A',
        d.location?.city || '',
        d.status
      ]);
      break;
  }

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
};

export default {
  getDashboardStats,
  getDonorAnalytics,
  getCampAnalytics,
  getRequestAnalytics,
  getDonationAnalytics,
  generateReport
};

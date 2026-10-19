import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [dashboardStats, setDashboardStats] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchDashboardStats();
  }, [dateRange]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await analyticsAPI.getDashboardStats(dateRange);
      setDashboardStats(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            This page is only accessible to administrators.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blood-red mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchDashboardStats}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { overview, bloodGroupDistribution, topCities, donationTrends, donationTypes } = dashboardStats || {};

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive insights and statistics for blood donation activities
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter by Date Range</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blood-red focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blood-red focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setDateRange({ startDate: '', endDate: '' })}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Donors"
            value={overview?.totalDonors || 0}
            subtitle={`${overview?.eligibleDonors || 0} eligible`}
            icon="👥"
            color="blue"
          />
          <StatCard
            title="Total Donations"
            value={overview?.totalDonations || 0}
            subtitle={`${overview?.totalUnits || 0} units collected`}
            icon="🩸"
            color="red"
          />
          <StatCard
            title="Blood Camps"
            value={overview?.totalCamps || 0}
            subtitle={`${overview?.activeCamps || 0} active`}
            icon="🏕️"
            color="green"
          />
          <StatCard
            title="Blood Requests"
            value={overview?.totalRequests || 0}
            subtitle={`${overview?.activeRequests || 0} pending`}
            icon="📋"
            color="yellow"
          />
        </div>

        {/* Blood Group Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Blood Group Distribution
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bloodGroupDistribution?.map((bg) => (
              <div
                key={bg._id}
                className="bg-red-50 rounded-lg p-4 text-center hover:bg-red-100 transition-colors"
              >
                <div className="text-2xl font-bold text-blood-red">{bg._id}</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{bg.count}</div>
                <div className="text-sm text-gray-600 mt-1">donors</div>
              </div>
            ))}
          </div>
        </div>

        {/* Donation Trends Chart */}
        {donationTrends && donationTrends.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Donation Trends (Last 30 Days)
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Donations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Units Collected
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {donationTrends.slice(-10).map((trend, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(trend.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trend.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trend.units}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Cities */}
        {topCities && topCities.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Top Cities by Donors
            </h2>
            <div className="space-y-3">
              {topCities.slice(0, 5).map((city, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-blood-red text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">{city.city}</span>
                      <span className="text-sm font-semibold text-blood-red">{city.count} donors</span>
                    </div>
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blood-red h-2 rounded-full"
                        style={{
                          width: `${(city.count / topCities[0].count) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Donation Types */}
        {donationTypes && donationTypes.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Donation Type Breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {donationTypes.map((type, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-lg font-medium text-gray-900 capitalize">
                    {type.type}
                  </div>
                  <div className="text-3xl font-bold text-blood-red mt-2">
                    {type.count}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">donations</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links for Admins */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Detailed Analytics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <a
                href="/analytics/donors"
                className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center"
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="font-semibold text-gray-900">Donor Analytics</div>
                <div className="text-sm text-gray-600 mt-1">View detailed donor insights</div>
              </a>
              <a
                href="/analytics/camps"
                className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-center"
              >
                <div className="text-2xl mb-2">🏕️</div>
                <div className="font-semibold text-gray-900">Camp Analytics</div>
                <div className="text-sm text-gray-600 mt-1">Analyze camp performance</div>
              </a>
              <a
                href="/analytics/requests"
                className="block p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors text-center"
              >
                <div className="text-2xl mb-2">📋</div>
                <div className="font-semibold text-gray-900">Request Analytics</div>
                <div className="text-sm text-gray-600 mt-1">Track request fulfillment</div>
              </a>
              <a
                href="/reports"
                className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center"
              >
                <div className="text-2xl mb-2">📊</div>
                <div className="font-semibold text-gray-900">Reports</div>
                <div className="text-sm text-gray-600 mt-1">Generate custom reports</div>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable StatCard Component
const StatCard = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`text-4xl ${colorClasses[color]} p-3 rounded-full`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default Analytics;

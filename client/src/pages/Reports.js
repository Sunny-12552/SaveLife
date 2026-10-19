import React, { useState } from 'react';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    reportType: 'donor',
    startDate: '',
    endDate: '',
    format: 'json'
  });

  const isAdmin = user?.role === 'admin';

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await analyticsAPI.generateReport(filters);

      if (filters.format === 'csv') {
        // Handle CSV download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filters.reportType}-report-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Handle JSON download
        const dataStr = JSON.stringify(response.data.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filters.reportType}-report-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report');
      console.error('Report generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Generate Reports</h1>
          <p className="mt-2 text-gray-600">
            Create and export comprehensive reports for analysis
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Report Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Report Configuration</h2>

          <div className="space-y-6">
            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type *
              </label>
              <select
                name="reportType"
                value={filters.reportType}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blood-red focus:border-transparent"
              >
                <option value="donor">Donor Report</option>
                <option value="camp">Camp Report</option>
                <option value="request">Blood Request Report</option>
                <option value="donation">Donation Report</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {getReportDescription(filters.reportType)}
              </p>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
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
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blood-red focus:border-transparent"
                />
              </div>
            </div>

            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, format: 'json' }))}
                  className={`px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
                    filters.format === 'json'
                      ? 'border-blood-red bg-red-50 text-blood-red'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-1">📄</div>
                  <div>JSON</div>
                  <div className="text-xs mt-1 opacity-75">Structured data format</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, format: 'csv' }))}
                  className={`px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
                    filters.format === 'csv'
                      ? 'border-blood-red bg-red-50 text-blood-red'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-1">📊</div>
                  <div>CSV</div>
                  <div className="text-xs mt-1 opacity-75">Excel compatible</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-8 py-3 bg-blood-red text-white rounded-lg hover:bg-blood-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Report...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate & Download Report
              </>
            )}
          </button>
        </div>

        {/* Report Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Report Information
          </h3>
          <ul className="space-y-2 text-sm text-blue-900">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Reports can be filtered by date range to get specific time periods</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>CSV format is recommended for opening in Excel or Google Sheets</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>JSON format is better for programmatic access and data integration</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Leaving dates empty will include all records</span>
            </li>
          </ul>
        </div>

        {/* Report Types Overview */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <ReportTypeCard
            icon="👥"
            title="Donor Report"
            description="Complete list of all donors with their blood groups, contact information, donation history, and eligibility status."
          />
          <ReportTypeCard
            icon="🏕️"
            title="Camp Report"
            description="Detailed information about blood donation camps including dates, locations, registrations, and units collected."
          />
          <ReportTypeCard
            icon="📋"
            title="Blood Request Report"
            description="All blood requests with patient information, urgency levels, fulfillment status, and hospital details."
          />
          <ReportTypeCard
            icon="🩸"
            title="Donation Report"
            description="Comprehensive donation records including blood types, quantities, health checkup data, and donation types."
          />
        </div>
      </div>
    </div>
  );
};

const getReportDescription = (reportType) => {
  const descriptions = {
    donor: 'Complete donor database with profiles and donation history',
    camp: 'Blood camp details with registrations and performance metrics',
    request: 'Blood request records with fulfillment tracking',
    donation: 'All donation transactions with health screening data'
  };
  return descriptions[reportType] || '';
};

const ReportTypeCard = ({ icon, title, description }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
};

export default Reports;

import React, { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Inventory = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('');

  const isOrganizerOrAdmin = user?.role === 'organizer' || user?.role === 'admin';

  useEffect(() => {
    if (!isOrganizerOrAdmin) return;
    fetchInventory();
  }, [isOrganizerOrAdmin]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await inventoryAPI.getAll();
      setInventory(response.data.data.inventory);
      setSummary(response.data.data.summary);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch inventory');
      console.error('Inventory error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckExpiry = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.checkExpiry();
      alert(response.data.message);
      fetchInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check expiry');
    } finally {
      setLoading(false);
    }
  };

  if (!isOrganizerOrAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            This page is only accessible to organizers and administrators.
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
          <p className="mt-4 text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blood Inventory Management</h1>
            <p className="mt-2 text-gray-600">
              Track and manage blood units across all blood groups
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleCheckExpiry}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Check Expiry
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blood-red text-white rounded-lg hover:bg-blood-dark transition-colors"
            >
              + Add Units
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {inventory.some((item) => item.isDemoData) && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950" role="status">
            <p className="font-bold">DEMO DATA — not real blood stock</p>
            <p className="mt-1 text-sm">
              These simulated units are only for demonstrating the inventory dashboard. Confirm actual
              availability with the blood bank before making any care or transfusion decisions.
            </p>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <SummaryCard
              title="Total Available"
              value={summary.totalAvailable}
              icon="🩸"
              color="green"
            />
            <SummaryCard
              title="Total Reserved"
              value={summary.totalReserved}
              icon="📦"
              color="blue"
            />
            <SummaryCard
              title="Expiring Soon"
              value={summary.totalExpiringSoon}
              icon="⚠️"
              color="yellow"
            />
            <SummaryCard
              title="Expired"
              value={summary.totalExpired}
              icon="❌"
              color="red"
            />
          </div>
        )}

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Inventory by Blood Group
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Blood Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reserved
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiring Soon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expired
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      No inventory data available
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => (
                    <tr key={item.bloodGroup} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-blood-red">
                          {item.bloodGroup}
                        </span>
                        {item.isDemoData && (
                          <span className="ml-2 rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                            DEMO
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-semibold ${item.unitsAvailable < 10 ? 'text-red-600' : 'text-green-600'}`}>
                          {item.unitsAvailable}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-blue-600 font-semibold">
                          {item.unitsReserved}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-semibold ${item.expiringSoon > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {item.expiringSoon}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-semibold ${item.expired > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {item.expired}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.lastUpdated).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedBloodGroup(item.bloodGroup)}
                          className="text-blood-red hover:text-blood-dark font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Legend</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-900">
            <div>
              <span className="font-semibold">Available:</span> Units ready for use
            </div>
            <div>
              <span className="font-semibold">Reserved:</span> Units reserved for specific requests
            </div>
            <div>
              <span className="font-semibold">Expiring Soon:</span> Units expiring within 7 days
            </div>
            <div>
              <span className="font-semibold">Expired:</span> Units past expiry date (35 days)
            </div>
          </div>
        </div>
      </div>

      {/* Add Units Modal */}
      {showAddModal && (
        <AddUnitsModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchInventory();
          }}
        />
      )}

      {/* Blood Group Details Modal */}
      {selectedBloodGroup && (
        <BloodGroupDetailsModal
          bloodGroup={selectedBloodGroup}
          onClose={() => setSelectedBloodGroup('')}
        />
      )}
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`text-4xl ${colorClasses[color]} p-3 rounded-full`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Add Units Modal Component
const AddUnitsModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    bloodGroup: 'A+',
    units: '',
    collectedDate: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.units || formData.units <= 0) {
      setError('Please enter a valid number of units');
      return;
    }

    try {
      setLoading(true);
      await inventoryAPI.addUnits(formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add units');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Blood Units</h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood Group *
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blood-red focus:border-transparent"
                required
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Units *
              </label>
              <input
                type="number"
                min="1"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blood-red focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collection Date *
              </label>
              <input
                type="date"
                value={formData.collectedDate}
                onChange={(e) => setFormData({ ...formData, collectedDate: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blood-red focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blood-red focus:border-transparent"
                rows="2"
                placeholder="Optional reason for manual addition"
              />
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blood-red text-white rounded-lg hover:bg-blood-dark disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Adding...' : 'Add Units'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Blood Group Details Modal
const BloodGroupDetailsModal = ({ bloodGroup, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetails();
  }, [bloodGroup]);

  const fetchDetails = async () => {
    try {
      const response = await inventoryAPI.getByBloodGroup(bloodGroup);
      setDetails(response.data.data);
    } catch (err) {
      console.error('Failed to fetch details:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {bloodGroup} Inventory Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blood-red mx-auto"></div>
          </div>
        ) : details ? (
          <div className="space-y-6">
            {details.isDemoData && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
                DEMO DATA — these units are simulated and are not real blood stock.
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">{details.unitsAvailable}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Reserved</p>
                <p className="text-2xl font-bold text-blue-600">{details.unitsReserved}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{details.expiringSoon?.length || 0}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-red-600">{details.expired?.length || 0}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Recent History</h3>
              <div className="space-y-2">
                {details.history?.slice(0, 5).map((entry, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium capitalize">{entry.action}</span>
                      <span className="text-gray-600">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-600">{entry.units} units - {entry.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">No details available</p>
        )}
      </div>
    </div>
  );
};

export default Inventory;

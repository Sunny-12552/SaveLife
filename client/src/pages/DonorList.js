import React, { useEffect, useState } from 'react';
import { donorAPI } from '../services/api';
import './List.css';

const DonorList = () => {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      const response = await donorAPI.getAll({ limit: 50 });
      setDonors(response.data.data.donors);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load donors');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">All Donors</h1>
          <p className="page-subtitle">Browse registered blood donors</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="list-grid">
          {donors.map((donor) => (
            <div key={donor._id} className="list-card">
              <div className="card-badge">
                <span className={`badge ${donor.isEligible ? 'badge-success' : 'badge-warning'}`}>
                  {donor.isEligible ? 'Eligible' : 'Not Eligible'}
                </span>
                <span className="badge badge-info">{donor.totalDonations} donations</span>
                {donor.userId?.email?.includes('@bdcms.temp') && (
                  <span className="badge badge-danger">Walk-in</span>
                )}
              </div>

              <h3 className="card-title">
                {donor.userId?.name}
                {donor.userId?.email?.includes('@bdcms.temp') && ' 🚶'}
              </h3>
              
              <div className="card-info">
                <div className="info-row">
                  <span className="info-icon">🩸</span>
                  <span className="blood-group">{donor.bloodGroup}</span>
                </div>
                <div className="info-row">
                  <span className="info-icon">📍</span>
                  <span>{donor.address?.city}, {donor.address?.state}</span>
                </div>
                <div className="info-row">
                  <span className="info-icon">📞</span>
                  <span>{donor.userId?.phone}</span>
                </div>
                <div className="info-row">
                  <span className="info-icon">✉️</span>
                  <span>{donor.userId?.email}</span>
                </div>
                {donor.lastDonationDate && (
                  <div className="info-row">
                    <span className="info-icon">📅</span>
                    <span>Last: {new Date(donor.lastDonationDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {donors.length === 0 && (
          <div className="card text-center">
            <p className="text-gray">No donors registered yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonorList;

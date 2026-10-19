import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { donorAPI } from '../services/api';
import './Donor.css';

const DonorProfile = () => {
  const { user } = useAuth();
  const [donor, setDonor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDonorProfile();
  }, []);

  const fetchDonorProfile = async () => {
    try {
      const response = await donorAPI.getMyProfile();
      setDonor(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load donor profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="spinner"></div>;

  if (error) {
    return (
      <div className="page-container">
        <div className="container">
          <div className="alert alert-error">{error}</div>
          <Link to="/donor/register" className="btn btn-primary">
            Create Donor Profile
          </Link>
        </div>
      </div>
    );
  }

  if (!donor) return null;

  return (
    <div className="page-container">
      <div className="container">
        <div className="donor-profile-card">
          <div className="profile-header">
            <div className="profile-info">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar">
                  {user?.profileImage ? <img src={user.profileImage} alt="" /> : donor.bloodGroup}
                </div>
                {user?.profileImage && (
                  <span className="profile-blood-tag">{donor.bloodGroup}</span>
                )}
              </div>
              <div className="profile-details">
                <h2>{donor.userId?.name}</h2>
                <span className="profile-role-badge">{user?.role} account</span>
                <p className="text-gray">{donor.userId?.email}</p>
                <p className="text-gray">{donor.userId?.phone}</p>
                <div className="profile-badge-group">
                  <span className={`badge ${donor.isEligible ? 'badge-success' : 'badge-warning'}`}>
                    {donor.isEligible ? 'Eligible to Donate' : 'Not Eligible'}
                  </span>
                  <span className="badge badge-info">
                    {donor.totalDonations} Donations
                  </span>
                </div>
              </div>
              <Link to="/profile" className="profile-manage-link">
                Manage account photo
              </Link>
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-heading">Personal Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Blood Group</div>
                <div className="info-value">{donor.bloodGroup}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Gender</div>
                <div className="info-value">{donor.gender}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Date of Birth</div>
                <div className="info-value">
                  {new Date(donor.dateOfBirth).toLocaleDateString()}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Last Donation</div>
                <div className="info-value">
                  {donor.lastDonationDate
                    ? new Date(donor.lastDonationDate).toLocaleDateString()
                    : 'Never donated'}
                </div>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-heading">Address</h3>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">City</div>
                <div className="info-value">{donor.address?.city}</div>
              </div>
              <div className="info-item">
                <div className="info-label">State</div>
                <div className="info-value">{donor.address?.state}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Zip Code</div>
                <div className="info-value">{donor.address?.zipCode || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-heading">Health Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Weight</div>
                <div className="info-value">{donor.healthInfo?.weight} kg</div>
              </div>
              <div className="info-item">
                <div className="info-label">Hemoglobin</div>
                <div className="info-value">
                  {donor.healthInfo?.hemoglobin || 'N/A'} g/dL
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Blood Pressure</div>
                <div className="info-value">
                  {donor.healthInfo?.bloodPressure?.systolic || 'N/A'}/
                  {donor.healthInfo?.bloodPressure?.diastolic || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {donor.emergencyContact?.name && (
            <div className="info-section">
              <h3 className="section-heading">Emergency Contact</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Name</div>
                  <div className="info-value">{donor.emergencyContact.name}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Phone</div>
                  <div className="info-value">{donor.emergencyContact.phone}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Relationship</div>
                  <div className="info-value">{donor.emergencyContact.relationship}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonorProfile;

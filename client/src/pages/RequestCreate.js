import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestAPI } from '../services/api';
import './Donor.css';

const RequestCreate = () => {
  const [formData, setFormData] = useState({
    patientName: '',
    patientAge: '',
    bloodGroup: 'O+',
    unitsRequired: '',
    urgency: 'medium',
    requiredBy: '',
    hospital: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
    },
    contactInfo: {
      phone: '',
      alternatePhone: '',
      email: '',
    },
    reason: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const submitData = {
      ...formData,
      patientAge: parseInt(formData.patientAge),
      unitsRequired: parseInt(formData.unitsRequired),
    };

    try {
      await requestAPI.create(submitData);
      alert('Blood request created successfully!');
      navigate('/requests');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Create Blood Request</h1>
          <p className="page-subtitle">
            {user?.role === 'patient'
              ? 'Share the patient and hospital details so your request can be reviewed.'
              : 'Request blood for a patient in need'}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="donor-form">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Patient Information</h2>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Patient Name *</label>
                <input
                  type="text"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Patient Age *</label>
                <input
                  type="number"
                  name="patientAge"
                  value={formData.patientAge}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Blood Group *</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="form-select"
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

              <div className="form-group">
                <label className="form-label">Units Required *</label>
                <input
                  type="number"
                  name="unitsRequired"
                  value={formData.unitsRequired}
                  onChange={handleChange}
                  className="form-input"
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Urgency *</label>
                <select
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Required By *</label>
                <input
                  type="date"
                  name="requiredBy"
                  value={formData.requiredBy}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group form-full">
                <label className="form-label">Reason *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className="form-textarea"
                  required
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Hospital Information</h2>
            </div>

            <div className="form-grid">
              <div className="form-group form-full">
                <label className="form-label">Hospital Name *</label>
                <input
                  type="text"
                  name="hospital.name"
                  value={formData.hospital.name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group form-full">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  name="hospital.address"
                  value={formData.hospital.address}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  name="hospital.city"
                  value={formData.hospital.city}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">State *</label>
                <input
                  type="text"
                  name="hospital.state"
                  value={formData.hospital.state}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Zip Code</label>
                <input
                  type="text"
                  name="hospital.zipCode"
                  value={formData.hospital.zipCode}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Contact Information</h2>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Primary Phone *</label>
                <input
                  type="tel"
                  name="contactInfo.phone"
                  value={formData.contactInfo.phone}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Alternate Phone</label>
                <input
                  type="tel"
                  name="contactInfo.alternatePhone"
                  value={formData.contactInfo.alternatePhone}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="contactInfo.email"
                  value={formData.contactInfo.email}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating Request...' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestCreate;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campAPI, donationAPI } from '../services/api';
import './Donor.css';

const QuickDonation = () => {
  const [camps, setCamps] = useState([]);
  const [formData, setFormData] = useState({
    // Donor Info
    donorName: '',
    email: '',
    phone: '',
    bloodGroup: 'O+',
    dateOfBirth: '',
    gender: 'Male',
    
    // Address
    city: '',
    state: '',
    
    // Health Info
    weight: '',
    hemoglobin: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    
    // Donation Info
    campId: '',
    donationDate: new Date().toISOString().split('T')[0],
    unitsCollected: '1',
    
    // Notes
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchCamps();
  }, []);

  const fetchCamps = async () => {
    try {
      const response = await campAPI.getAll({ status: 'ongoing,completed', limit: 50 });
      setCamps(response.data.data.camps);
    } catch (err) {
      setError('Failed to load camps. You can still record direct donations.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const donationData = {
      donorInfo: {
        name: formData.donorName,
        email: formData.email,
        phone: formData.phone,
        bloodGroup: formData.bloodGroup,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        city: formData.city,
        state: formData.state,
      },
      healthInfo: {
        weight: parseFloat(formData.weight),
        hemoglobin: formData.hemoglobin ? parseFloat(formData.hemoglobin) : undefined,
        bloodPressure: {
          systolic: formData.bloodPressureSystolic ? parseInt(formData.bloodPressureSystolic) : undefined,
          diastolic: formData.bloodPressureDiastolic ? parseInt(formData.bloodPressureDiastolic) : undefined,
        },
      },
      campId: formData.campId || undefined,
      donationDate: formData.donationDate,
      unitsCollected: parseFloat(formData.unitsCollected),
      notes: formData.notes,
    };

    try {
      await donationAPI.recordQuick(donationData);
      
      alert(
        'Donation recorded successfully!\n\n' +
        '✓ Donor profile created/updated\n' +
        '✓ Donation history saved\n' +
        '✓ Donor will now appear in Donors list\n\n' +
        'You can view this donor in the Donors page.'
      );
      navigate('/donors');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record donation. Please check all required fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Quick Donation Entry</h1>
          <p className="page-subtitle">Record donation from walk-in donors without account</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="donor-form">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Donor Information</h2>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="donorName"
                  value={formData.donorName}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="+919876543210"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
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
                <label className="form-label">Date of Birth *</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">State *</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Health Screening</h2>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Weight (kg) * (min: 45kg)</label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="form-input"
                  min="45"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hemoglobin (g/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  name="hemoglobin"
                  value={formData.hemoglobin}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="12.5"
                />
              </div>

              <div className="form-group">
                <label className="form-label">BP - Systolic</label>
                <input
                  type="number"
                  name="bloodPressureSystolic"
                  value={formData.bloodPressureSystolic}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="120"
                />
              </div>

              <div className="form-group">
                <label className="form-label">BP - Diastolic</label>
                <input
                  type="number"
                  name="bloodPressureDiastolic"
                  value={formData.bloodPressureDiastolic}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="80"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Donation Details</h2>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Camp (Optional)</label>
                <select
                  name="campId"
                  value={formData.campId}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Direct Donation (No Camp)</option>
                  {camps.map(camp => (
                    <option key={camp._id} value={camp._id}>
                      {camp.name} - {new Date(camp.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Donation Date *</label>
                <input
                  type="date"
                  name="donationDate"
                  value={formData.donationDate}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Units Collected *</label>
                <input
                  type="number"
                  step="0.5"
                  name="unitsCollected"
                  value={formData.unitsCollected}
                  onChange={handleChange}
                  className="form-input"
                  min="0.5"
                  max="2"
                  required
                />
              </div>

              <div className="form-group form-full">
                <label className="form-label">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="form-textarea"
                  placeholder="Any additional notes about this donation..."
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
              {loading ? 'Recording Donation...' : 'Record Donation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickDonation;

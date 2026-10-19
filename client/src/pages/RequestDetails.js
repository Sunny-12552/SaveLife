import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { requestAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './CampDetails.css';

const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [availableDonors, setAvailableDonors] = useState([]);
  const [showMatchDonors, setShowMatchDonors] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequestDetails = useCallback(async () => {
    try {
      const response = await requestAPI.getById(id);
      setRequest(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  const findMatchingDonors = async () => {
    try {
      const response = await requestAPI.findMatchingDonors(
        request.bloodGroup,
        { city: request.hospital.city, limit: 20 }
      );
      setAvailableDonors(response.data.data);
      setShowMatchDonors(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to find matching donors');
    }
  };

  const handleAutoMatch = async () => {
    try {
      const response = await requestAPI.matchDonors(id, { autoMatch: true });
      const matchedCount = response.data?.data?.matchedDonors?.length || 0;
      alert(`Successfully matched ${matchedCount} donor(s)!`);
      await fetchRequestDetails();
      setShowMatchDonors(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to match donors');
    }
  };

  const handleManualMatch = async (donorId) => {
    try {
      await requestAPI.matchDonors(id, {
        autoMatch: false,
        donorIds: [donorId]
      });
      alert('Donor matched successfully!');
      await fetchRequestDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to match donor');
    }
  };

  const handleUpdateDonorResponse = async (donorId, field, value) => {
    try {
      const updateData = { [field]: value };
      
      if (field === 'donated' && value === true) {
        const units = prompt('Enter units donated by this donor:', '1');
        if (!units) return;
        updateData.unitsContributed = parseFloat(units);
      }

      await requestAPI.updateDonorResponse(id, donorId, updateData);
      alert('Donor response updated successfully!');
      await fetchRequestDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update donor response');
    }
  };

  const handleCancelOwnRequest = async () => {
    if (!window.confirm('Cancel this blood request?')) return;

    try {
      await requestAPI.delete(id);
      navigate('/requests');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not cancel this request.');
    }
  };

  if (loading) return <div className="spinner"></div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!request) return null;

  const isAuthorized = user?.role === 'organizer' || user?.role === 'admin';
  const isPatientOwner =
    user?.role === 'patient' &&
    (request.requesterId?._id || request.requesterId)?.toString() === user?._id?.toString();
  const progressPercentage = (request.unitsFulfilled / request.unitsRequired) * 100;

  return (
    <div className="page-container">
      <div className="container">
        <div className="camp-details-header">
          <div>
            <h1 className="page-title">Blood Request - {request.patientName}</h1>
            <span className={`badge badge-${
              request.urgency === 'critical' ? 'danger' :
              request.urgency === 'high' ? 'warning' :
              request.urgency === 'medium' ? 'info' : 'success'
            }`}>
              {request.urgency} priority
            </span>
            <span className={`badge badge-${
              request.status === 'fulfilled' ? 'success' :
              request.status === 'partially_fulfilled' ? 'info' : 'warning'
            }`}>
              {request.status}
            </span>
          </div>
        </div>

        <div className="camp-details-grid">
          <div className="details-card">
            <h2 className="section-heading">Patient Information</h2>
            <div className="details-info">
              <p><strong>Name:</strong> {request.patientName}</p>
              <p><strong>Age:</strong> {request.patientAge} years</p>
              <p><strong>Blood Group:</strong> 
                <span className="blood-group-badge" style={{marginLeft: '10px'}}>
                  {request.bloodGroup}
                </span>
              </p>
              <p><strong>Units Required:</strong> {request.unitsRequired}</p>
              <p><strong>Units Fulfilled:</strong> {request.unitsFulfilled}</p>
              <p><strong>Remaining:</strong> {request.unitsRequired - request.unitsFulfilled}</p>
              <p><strong>Required By:</strong> {new Date(request.requiredBy).toLocaleDateString()}</p>
              <p><strong>Reason:</strong> {request.reason}</p>
            </div>

            <div className="progress-info mt-2">
              <div className="progress-text">
                Progress: {request.unitsFulfilled} / {request.unitsRequired} units
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="details-card">
            <h2 className="section-heading">Hospital Information</h2>
            <div className="details-info">
              <p><strong>Hospital:</strong> {request.hospital.name}</p>
              {request.hospital.address && <p><strong>Address:</strong> {request.hospital.address}</p>}
              <p><strong>City:</strong> {request.hospital.city}</p>
              <p><strong>State:</strong> {request.hospital.state}</p>
              {request.hospital.zipCode && <p><strong>Zip:</strong> {request.hospital.zipCode}</p>}
            </div>
          </div>

          <div className="details-card">
            <h2 className="section-heading">Contact Information</h2>
            <div className="details-info">
              <p><strong>Primary:</strong> {request.contactInfo.phone}</p>
              {request.contactInfo.alternatePhone && (
                <p><strong>Alternate:</strong> {request.contactInfo.alternatePhone}</p>
              )}
              {request.contactInfo.email && (
                <p><strong>Email:</strong> {request.contactInfo.email}</p>
              )}
              <p><strong>Requested By:</strong> {request.requesterId?.name || 'N/A'}</p>
            </div>
          </div>
        </div>

        {isAuthorized && (
          <div className="actions-section">
            <h2 className="section-heading">Actions</h2>
            <div className="alert alert-info" style={{marginBottom: '15px'}}>
              <strong>ℹ️ Matching includes all donors:</strong> Both registered donors and walk-in donors 
              (recorded via Quick Donation) are included in matching. Walk-in donors are marked with 🚶 icon.
            </div>
            <div className="flex-gap">
              <button
                onClick={findMatchingDonors}
                className="btn btn-primary"
                disabled={request.status === 'fulfilled'}
              >
                Find Matching Donors
              </button>
              <button
                onClick={handleAutoMatch}
                className="btn btn-secondary"
                disabled={request.status === 'fulfilled'}
              >
                Auto-Match Donors
              </button>
            </div>
          </div>
        )}

        {isPatientOwner && (
          <div className="actions-section">
            <h2 className="section-heading">Request status</h2>
            <p className="text-gray">
              SaveLife staff coordinate donor matching. Contact the hospital directly for urgent medical care.
            </p>
            {request.status !== 'fulfilled' && request.status !== 'cancelled' && (
              <button onClick={handleCancelOwnRequest} className="btn btn-outline mt-2">
                Cancel this request
              </button>
            )}
          </div>
        )}

        {isAuthorized && showMatchDonors && availableDonors.length > 0 && (
          <div className="registered-donors-section">
            <h2 className="section-heading">Available Donors ({availableDonors.length})</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Blood Group</th>
                    <th>Location</th>
                    <th>Phone</th>
                    <th>Total Donations</th>
                    <th>Eligible</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {availableDonors.map((donor) => (
                    <tr key={donor._id}>
                      <td>
                        {donor.userId?.name}
                        {donor.userId?.email?.includes('@bdcms.temp') && ' 🚶'}
                      </td>
                      <td>
                        <span className="blood-group-badge">{donor.bloodGroup}</span>
                        {donor.userId?.email?.includes('@bdcms.temp') && (
                          <span className="badge badge-danger" style={{marginLeft: '5px', fontSize: '11px'}}>
                            Walk-in
                          </span>
                        )}
                      </td>
                      <td>{donor.address?.city}, {donor.address?.state}</td>
                      <td>{donor.userId?.phone}</td>
                      <td>{donor.totalDonations}</td>
                      <td>
                        <span className={`badge ${donor.isEligible ? 'badge-success' : 'badge-warning'}`}>
                          {donor.isEligible ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleManualMatch(donor._id)}
                          className="btn-small btn-primary"
                          title={donor.userId?.email?.includes('@bdcms.temp') ? 'Walk-in donor from camp' : 'Registered donor'}
                        >
                          Match
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isAuthorized && <div className="registered-donors-section">
          <h2 className="section-heading">Matched Donors ({request.matchedDonors.length})</h2>

          {request.matchedDonors.length === 0 ? (
            <div className="card text-center">
              <p className="text-gray">No donors matched yet. Click "Find Matching Donors" to start.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Donor Name</th>
                    <th>Blood Group</th>
                    <th>Contact</th>
                    <th>Matched At</th>
                    <th>Contacted</th>
                    <th>Agreed</th>
                    <th>Donated</th>
                    <th>Units</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {request.matchedDonors.map((match) => (
                    <tr key={match._id}>
                      <td>
                        {match.donorId?.userId?.name || 'N/A'}
                        {match.donorId?.userId?.email?.includes('@bdcms.temp') && ' 🚶'}
                        {match.donorId?.userId?.email?.includes('@bdcms.temp') && (
                          <span className="badge badge-danger" style={{marginLeft: '5px', fontSize: '11px'}}>
                            Walk-in
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="blood-group-badge">
                          {match.donorId?.bloodGroup || 'N/A'}
                        </span>
                      </td>
                      <td>{match.donorId?.userId?.phone || 'N/A'}</td>
                      <td>{new Date(match.matchedAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${match.contacted ? 'badge-success' : 'badge-warning'}`}>
                          {match.contacted ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${match.agreedToDonate ? 'badge-success' : 'badge-warning'}`}>
                          {match.agreedToDonate ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${match.donated ? 'badge-success' : 'badge-danger'}`}>
                          {match.donated ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>{match.unitsContributed || 0}</td>
                      <td>
                        <div className="action-buttons">
                          {!match.contacted && match.donorId?._id && (
                            <button
                              onClick={() => handleUpdateDonorResponse(match.donorId._id, 'contacted', true)}
                              className="btn-small btn-success"
                            >
                              Mark Contacted
                            </button>
                          )}
                          {match.contacted && !match.agreedToDonate && match.donorId?._id && (
                            <button
                              onClick={() => handleUpdateDonorResponse(match.donorId._id, 'agreedToDonate', true)}
                              className="btn-small btn-info"
                            >
                              Mark Agreed
                            </button>
                          )}
                          {match.agreedToDonate && !match.donated && match.donorId?._id && (
                            <button
                              onClick={() => handleUpdateDonorResponse(match.donorId._id, 'donated', true)}
                              className="btn-small btn-primary"
                            >
                              Mark Donated
                            </button>
                          )}
                          {match.donated && <span className="text-gray">✓ Complete</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>}
      </div>
    </div>
  );
};

export default RequestDetails;

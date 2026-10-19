import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { appAPI, campAPI, donationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CampMapPreview from '../components/CampMapPreview';
import CampPoster from '../components/CampPoster';
import './CampDetails.css';

const CampDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [camp, setCamp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareOrigin, setShareOrigin] = useState(window.location.origin);
  const qrRef = useRef(null);

  useEffect(() => {
    fetchCampDetails();
  }, [id]);

  useEffect(() => {
    appAPI.getPublicConfig()
      .then((response) => {
        if (response.data.frontendOrigin) {
          setShareOrigin(response.data.frontendOrigin);
        }
      })
      .catch(() => {
        setShareOrigin(window.location.origin);
      });
  }, []);

  const fetchCampDetails = async () => {
    try {
      const response = await campAPI.getById(id);
      setCamp(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load camp details');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (donorId, attended) => {
    try {
      await campAPI.markAttendance(id, donorId, { attended });
      alert('Attendance marked successfully!');
      fetchCampDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const handleMarkDonation = async (donorId) => {
    const units = prompt('Enter units collected (default: 1):', '1');
    if (!units) return;

    try {
      await campAPI.markAttendance(id, donorId, {
        attended: true,
        donated: true,
        unitsCollected: parseFloat(units),
      });
      alert('Donation marked successfully!');
      fetchCampDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark donation');
    }
  };

  const downloadQRCode = () => {
    if (!qrRef.current) return;

    const downloadLink = document.createElement('a');
    downloadLink.download = `${camp.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-qr.png`;
    downloadLink.href = qrRef.current.toDataURL('image/png');
    downloadLink.click();
  };

  if (loading) return <div className="spinner"></div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!camp) return null;

  const campOrganizerId = camp.organizerId?._id || camp.organizerId;
  const isCampOwner = user?.role === 'organizer'
    && campOrganizerId != null
    && user?._id != null
    && String(campOrganizerId) === String(user._id);
  const canManage = camp.canEdit === true || isCampOwner || user?.role === 'admin';
  const publicCampUrl = shareOrigin
    ? `${shareOrigin}/camp-info/${camp._id}`
    : `${window.location.origin}/camp-info/${camp._id}`;

  return (
    <div className="page-container">
      <div className="container">
        <div className="camp-details-header">
          <div>
            <h1 className="page-title">{camp.name}</h1>
            <span className={`badge badge-${
              camp.status === 'upcoming' ? 'success' :
              camp.status === 'ongoing' ? 'info' :
              camp.status === 'completed' || camp.status === 'expired' ? 'warning' : 'danger'
            }`}>
              {camp.status}
            </span>
          </div>
          {canManage && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/camps/${camp._id}/edit`)}
            >
              Edit Camp
            </button>
          )}
        </div>

        <div className="camp-details-grid">
          {camp.campImage && (
            <section className="details-card camp-details-image-card">
              <h2 className="section-heading">Camp image and location QR</h2>
              <CampPoster
                campImage={camp.campImage}
                campId={camp._id}
                campName={camp.name}
                shareOrigin={shareOrigin}
                qrSize={104}
              />
            </section>
          )}
          <div className="details-card">
            <h2 className="section-heading">Camp Information</h2>
            <div className="details-info">
              <p><strong>Description:</strong> {camp.description}</p>
              <p><strong>Date:</strong> {new Date(camp.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {camp.startTime} - {camp.endTime}</p>
              <p><strong>Capacity:</strong> {camp.registeredDonors.length} / {camp.capacity}</p>
              <p><strong>Total Units Collected:</strong> {camp.totalUnitsCollected}</p>
              <p><strong>Organizer:</strong> {camp.organizerId.name}</p>
            </div>
          </div>

          <div className="details-card camp-details-location-card">
            <h2 className="section-heading">Location</h2>
            <div className="details-info">
              <p><strong>Venue:</strong> {camp.location.venueName}</p>
              <p><strong>Address:</strong> {camp.location.address}</p>
              <p><strong>City:</strong> {camp.location.city}</p>
              <p><strong>State:</strong> {camp.location.state}</p>
              {camp.location.zipCode && <p><strong>Zip:</strong> {camp.location.zipCode}</p>}
              {camp.location.landmark && <p><strong>Landmark:</strong> {camp.location.landmark}</p>}
            </div>
            <CampMapPreview location={camp.location} variant="preview" />
          </div>

          <div className="details-card">
            <h2 className="section-heading">Contact Information</h2>
            <div className="details-info">
              <p><strong>Phone:</strong> {camp.contactInfo.phone}</p>
              {camp.contactInfo.email && <p><strong>Email:</strong> {camp.contactInfo.email}</p>}
              {camp.contactInfo.coordinatorName && (
                <p><strong>Coordinator:</strong> {camp.contactInfo.coordinatorName}</p>
              )}
            </div>
          </div>
        </div>

        {!camp.campImage && (
          <section className="camp-qr-card" aria-labelledby="camp-qr-title">
            <div>
              <h2 className="section-heading" id="camp-qr-title">Share this camp</h2>
              <p>Scan this QR code to view the camp details and location.</p>
              <button type="button" className="btn btn-primary" onClick={downloadQRCode}>
                Download QR Code
              </button>
            </div>
            {shareOrigin ? (
              <QRCodeCanvas
                ref={qrRef}
                value={publicCampUrl}
                size={200}
                level="H"
                includeMargin
                title={`QR code for ${camp.name}`}
              />
            ) : (
              <p role="status">Preparing QR code for your network…</p>
            )}
          </section>
        )}

        <div className="registered-donors-section">
          <div className="section-header">
            <h2 className="section-heading">Registered Donors ({camp.registeredDonors.length})</h2>
          </div>

          {camp.registeredDonors.length === 0 ? (
            <div className="card text-center">
              <p className="text-gray">No donors registered yet</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Donor Name</th>
                    <th>Blood Group</th>
                    <th>Contact</th>
                    <th>Registered At</th>
                    <th>Attended</th>
                    <th>Donated</th>
                    <th>Units</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {camp.registeredDonors.map((registration) => (
                    <tr key={registration._id}>
                      <td>{registration.donorId?.userId?.name || 'N/A'}</td>
                      <td>
                        <span className="blood-group-badge">
                          {registration.donorId?.bloodGroup || 'N/A'}
                        </span>
                      </td>
                      <td>{registration.donorId?.userId?.phone || 'N/A'}</td>
                      <td>{new Date(registration.registeredAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${registration.attended ? 'badge-success' : 'badge-warning'}`}>
                          {registration.attended ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${registration.donated ? 'badge-success' : 'badge-danger'}`}>
                          {registration.donated ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>{registration.unitsCollected || 0}</td>
                      {canManage && (
                        <td>
                          <div className="action-buttons">
                            {!registration.attended && (
                              <button
                                onClick={() => handleMarkAttendance(registration.donorId._id, true)}
                                className="btn-small btn-success"
                              >
                                Mark Present
                              </button>
                            )}
                            {registration.attended && !registration.donated && (
                              <button
                                onClick={() => handleMarkDonation(registration.donorId._id)}
                                className="btn-small btn-primary"
                              >
                                Mark Donated
                              </button>
                            )}
                            {registration.donated && (
                              <>
                                <span className="text-gray">✓ Complete</span>
                                {registration.donationId && (
                                  registration.donationId.certificate?.issued ? (
                                    <>
                                      <span className="badge badge-success">
                                        Certificate {registration.donationId.certificate.certificateNumber}
                                      </span>
                                      <span className="text-gray">Available on donor dashboard</span>
                                    </>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        try {
                                          await donationAPI.issueCertificate(registration.donationId._id);
                                          alert('Certificate issued and added to the donor dashboard.');
                                          await fetchCampDetails();
                                        } catch (err) {
                                          alert(err.response?.data?.message || 'Failed to issue certificate');
                                        }
                                      }}
                                      className="btn-small btn-primary"
                                    >
                                      Issue & Send Certificate
                                    </button>
                                  )
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampDetails;

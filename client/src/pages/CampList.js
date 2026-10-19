import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { appAPI, campAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CampMapPreview from '../components/CampMapPreview';
import CampPoster from '../components/CampPoster';
import './List.css';

const CampList = () => {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareOrigin, setShareOrigin] = useState(window.location.origin);
  const { user } = useAuth();
  const location = useLocation();
  const createdCampId = location.state?.createdCampId;
  const canEditCamp = (camp) => {
    if (camp.canEdit === true || user?.role === 'admin') return true;
    if (user?.role !== 'organizer') return false;

    const campOrganizerId = camp.organizerId?._id || camp.organizerId;
    return campOrganizerId != null && user?._id != null
      && String(campOrganizerId) === String(user._id);
  };
  const fetchCamps = useCallback(async (highlightCampId) => {
    try {
      const response = await campAPI.getAll({ limit: 50 });
      const loadedCamps = response.data.data.camps;
      if (highlightCampId && !loadedCamps.some((camp) => camp._id === highlightCampId)) {
        const createdCampResponse = await campAPI.getById(highlightCampId);
        loadedCamps.unshift(createdCampResponse.data.data);
      }
      setCamps(loadedCamps);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load camps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCamps(createdCampId);
  }, [createdCampId, fetchCamps]);

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

  const handleRegister = async (campId) => {
    try {
      await campAPI.register(campId);
      alert('Successfully registered for camp!');
      fetchCamps();
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    }
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Blood Donation Camps</h1>
          <p className="page-subtitle">Find and register for blood donation camps near you</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="list-grid">
          {camps.map((camp) => (
            <div
              key={camp._id}
              className={`list-card camp-list-card${camp._id === createdCampId ? ' newly-created-camp' : ''}`}
            >
              {camp._id === createdCampId && (
                <p className="camp-created-notice" role="status">Camp created successfully</p>
              )}
              <div className="camp-list-card-content">
                <div className="camp-list-card-main">
                  <div className="card-badge">
                    <span className={`badge badge-${
                      camp.status === 'upcoming' ? 'success' :
                      camp.status === 'expired' ? 'warning' :
                      camp.status === 'ongoing' ? 'info' :
                      camp.status === 'completed' ? 'warning' : 'danger'
                    }`}>
                      {camp.status}
                    </span>
                  </div>

                  <h3 className="card-title">{camp.name}</h3>
                  <p className="card-description">{camp.description}</p>

                  <div className="card-info">
                    <div className="info-row">
                      <span className="info-icon">📅</span>
                      <span>{new Date(camp.date).toLocaleDateString()}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-icon">⏰</span>
                      <span>{camp.startTime} - {camp.endTime}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-icon">📍</span>
                      <span>{camp.location.city}, {camp.location.state}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-icon">👥</span>
                      <span>{camp.registeredDonors.length} / {camp.capacity} registered</span>
                    </div>
                  </div>

                  <div className="card-actions mt-2">
                    <Link to={`/camps/${camp._id}`} className="btn btn-outline btn-full">
                      View Details
                    </Link>
                    {canEditCamp(camp) && (
                      <Link to={`/camps/${camp._id}/edit`} className="btn btn-outline btn-full">
                        Edit Camp
                      </Link>
                    )}
                    {user?.role === 'donor' && camp.status === 'upcoming' && (
                      <button
                        onClick={() => handleRegister(camp._id)}
                        className="btn btn-primary btn-full"
                      >
                        Register for Camp
                      </button>
                    )}
                  </div>
                </div>
                <aside className="camp-card-side">
                  {camp.campImage ? (
                    <CampPoster
                      campImage={camp.campImage}
                      campId={camp._id}
                      campName={camp.name}
                      shareOrigin={shareOrigin}
                      qrSize={76}
                    />
                  ) : (
                    <Link
                      to={`/camp-info/${camp._id}`}
                      className="camp-card-qr"
                      aria-label={`Open public details for ${camp.name} using this QR code`}
                      title="Scan to view camp details and location"
                    >
                      <QRCodeSVG
                        value={`${shareOrigin}/camp-info/${camp._id}`}
                        size={132}
                        level="H"
                        includeMargin
                        title={`QR code for ${camp.name}`}
                      />
                      <span>Scan for details</span>
                    </Link>
                  )}
                  <CampMapPreview location={camp.location} variant="preview" />
                </aside>
              </div>
            </div>
          ))}
        </div>

        {camps.length === 0 && (
          <div className="card text-center">
            <p className="text-gray">No camps available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampList;

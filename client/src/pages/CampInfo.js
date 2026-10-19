import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { campAPI } from '../services/api';
import CampMapPreview from '../components/CampMapPreview';
import CampPoster from '../components/CampPoster';
import './CampInfo.css';

const CampInfo = () => {
  const { id } = useParams();
  const [camp, setCamp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCamp = async () => {
      try {
        const response = await campAPI.getPublicById(id);
        setCamp(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load camp information.');
      } finally {
        setLoading(false);
      }
    };

    fetchCamp();
  }, [id]);

  if (loading) return <div className="spinner" />;
  if (error) return <div className="container page-container"><div className="alert alert-error">{error}</div></div>;
  if (!camp) return null;

  const location = camp.location;
  return (
    <main className="page-container">
      <div className="container">
        <header className="camp-info-header">
          <p className="camp-info-brand">SaveLife</p>
          <h1 className="page-title">{camp.name}</h1>
          <span className={`badge badge-${camp.status === 'upcoming' ? 'success' : camp.status === 'ongoing' ? 'info' : 'warning'}`}>
            {camp.status}
          </span>
        </header>

        <div className="camp-info-grid">
          <section className="camp-info-card">
            <div className="camp-info-card-icon" aria-hidden="true">🩸</div>
            <h2>Camp Details</h2>
            <p>{camp.description}</p>
            <dl>
              <div><dt>Date</dt><dd>{new Date(camp.date).toLocaleDateString()}</dd></div>
              <div><dt>Time</dt><dd>{camp.startTime} – {camp.endTime}</dd></div>
              <div><dt>Capacity</dt><dd>{camp.capacity} donors</dd></div>
              {camp.requirements?.bloodGroups?.length > 0 && (
                <div><dt>Blood groups needed</dt><dd>{camp.requirements.bloodGroups.join(', ')}</dd></div>
              )}
              {camp.requirements?.targetUnits && (
                <div><dt>Target units</dt><dd>{camp.requirements.targetUnits}</dd></div>
              )}
            </dl>
          </section>

          <section className="camp-info-card">
            <div className="camp-info-card-icon" aria-hidden="true">📍</div>
            <h2>Location</h2>
            <p className="camp-info-venue">{location.venueName}</p>
            <address>
              {location.address}<br />
              {location.city}, {location.state}{location.zipCode ? ` ${location.zipCode}` : ''}
            </address>
            {location.landmark && <p><strong>Landmark:</strong> {location.landmark}</p>}
            <CampMapPreview location={location} variant="preview" />
          </section>
          {camp.campImage && (
            <section className="camp-info-card camp-info-poster-card">
              <h2>Camp image & location QR</h2>
              <CampPoster
                campImage={camp.campImage}
                campId={camp._id}
                campName={camp.name}
                qrSize={104}
              />
            </section>
          )}
        </div>
      </div>
    </main>
  );
};

export default CampInfo;

import React, { useState } from 'react';
import './CampMapPreview.css';

const CampMapPreview = ({ location, variant = 'interactive' }) => {
  const isPreview = variant === 'preview';
  const [showMap, setShowMap] = useState(false);
  const latitudeValue = location.coordinates?.latitude;
  const longitudeValue = location.coordinates?.longitude;
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  const hasCoordinates = latitudeValue !== null && latitudeValue !== undefined && latitudeValue !== ''
    && longitudeValue !== null && longitudeValue !== undefined && longitudeValue !== ''
    && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  const locationName = [
    location.venueName,
    location.city,
    location.state,
  ]
    .filter(Boolean)
    .filter((part, index, parts) =>
      !parts.slice(0, index).some((previousPart) =>
        previousPart.toLowerCase().includes(part.toLowerCase())
      )
    )
    .join(', ');
  const primaryAddress = [
    location.venueName,
    location.address,
    location.landmark,
  ]
    .filter(Boolean)
    .join(', ');
  const fullAddress = [
    primaryAddress,
    location.city,
    location.state,
    location.zipCode,
  ]
    .filter(Boolean)
    .filter((part, index, parts) =>
      !parts.slice(0, index).some((previousPart) =>
        previousPart.toLowerCase().includes(part.toLowerCase())
      )
    )
    .join(', ');
  const encodedAddress = encodeURIComponent(fullAddress);
  const mapPageUrl = `https://www.google.com/maps/search/?api=1&query=${
    hasCoordinates ? encodeURIComponent(`${latitude},${longitude}`) : encodedAddress
  }`;
  const mapEmbedUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.012}%2C${latitude - 0.008}%2C${longitude + 0.012}%2C${latitude + 0.008}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : `https://maps.google.com/maps?q=${encodedAddress}&output=embed`;

  if (isPreview) {
    return (
      <div className="camp-map-preview camp-map-thumbnail">
        <h4>{locationName}</h4>
        <a
          className="camp-map-thumbnail-link"
          href={mapPageUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open map for ${locationName}`}
        >
          <iframe
            title={`Map showing ${locationName}`}
            src={mapEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            tabIndex="-1"
          />
          <span>Open map</span>
        </a>
        <a className="camp-map-text-link" href={mapPageUrl} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
        <p className="camp-map-attribution">{hasCoordinates ? '© OpenStreetMap' : 'Map search by Google Maps'}</p>
      </div>
    );
  }

  return (
    <div className="camp-map-preview">
      <button
        type="button"
        className="btn btn-outline camp-map-toggle"
        aria-expanded={showMap}
        onClick={() => setShowMap((isOpen) => !isOpen)}
      >
        {showMap ? 'Hide map' : `View map: ${locationName}`}
      </button>
      {showMap && (
        <div className="camp-map-content">
          <h3>{locationName}</h3>
          <iframe
            title={`Map showing ${locationName}`}
            src={mapEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a href={mapPageUrl} target="_blank" rel="noreferrer">
            Open this location in Google Maps
          </a>
          <p className="camp-map-attribution">
            {hasCoordinates ? 'Map data © OpenStreetMap contributors' : 'Map search by Google Maps'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CampMapPreview;

import React, { useEffect } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import './CampLocationPicker.css';

const DEFAULT_CENTER = [20.5937, 78.9629];
const locationMarker = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const isValidCoordinate = (latitude, longitude) => (
  Number.isFinite(Number(latitude))
  && Number.isFinite(Number(longitude))
  && Number(latitude) >= -90
  && Number(latitude) <= 90
  && Number(longitude) >= -180
  && Number(longitude) <= 180
  && latitude !== ''
  && longitude !== ''
);

const MapSelectionEvents = ({ onSelect }) => {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
};

const MapCenter = ({ latitude, longitude, hasSelection }) => {
  const map = useMap();

  useEffect(() => {
    if (hasSelection) {
      map.flyTo([Number(latitude), Number(longitude)], Math.max(map.getZoom(), 15), {
        duration: 0.5,
      });
    }
  }, [hasSelection, latitude, longitude, map]);

  return null;
};

const CampLocationPicker = ({ latitude, longitude, onSelect }) => {
  const hasSelection = isValidCoordinate(latitude, longitude);
  const center = hasSelection
    ? [Number(latitude), Number(longitude)]
    : DEFAULT_CENTER;

  return (
    <div className="camp-location-picker">
      <MapContainer
        center={center}
        zoom={hasSelection ? 15 : 5}
        scrollWheelZoom
        className="camp-location-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapSelectionEvents onSelect={onSelect} />
        <MapCenter latitude={latitude} longitude={longitude} hasSelection={hasSelection} />
        {hasSelection && (
          <Marker
            position={[Number(latitude), Number(longitude)]}
            icon={locationMarker}
            draggable
            eventHandlers={{
              dragend(event) {
                const markerPosition = event.target.getLatLng();
                onSelect(markerPosition.lat, markerPosition.lng);
              },
            }}
          />
        )}
      </MapContainer>
      <p className="camp-location-map-hint">
        Click the map to place the camp marker, or drag the marker to fine-tune its position.
      </p>
    </div>
  );
};

export default CampLocationPicker;

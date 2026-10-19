import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { campAPI } from '../services/api';
import CampLocationPicker from '../components/CampLocationPicker';
import './Donor.css';
import './CampCreate.css';

const CampCreate = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: {
      venueName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      landmark: '',
      coordinates: {
        latitude: '',
        longitude: '',
      },
    },
    capacity: '',
    requirements: {
      bloodGroups: [],
      targetUnits: '',
    },
    contactInfo: {
      phone: '',
      email: '',
      coordinatorName: '',
    },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [campImage, setCampImage] = useState('');
  const [imageError, setImageError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [loadingCamp, setLoadingCamp] = useState(isEditing);
  const campImageInputRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isEditing) return;

    const loadCamp = async () => {
      try {
        const response = await campAPI.getById(id);
        const camp = response.data.data;
        const campCoordinates = camp.location?.coordinates || {};
        const hasCoordinates = campCoordinates.latitude !== undefined
          && campCoordinates.longitude !== undefined
          && Number.isFinite(Number(campCoordinates.latitude))
          && Number.isFinite(Number(campCoordinates.longitude));

        setFormData((prev) => ({
          ...prev,
          name: camp.name || '',
          description: camp.description || '',
          date: camp.date ? new Date(camp.date).toISOString().slice(0, 10) : '',
          startTime: camp.startTime || '',
          endTime: camp.endTime || '',
          location: {
            venueName: camp.location?.venueName || '',
            address: camp.location?.address || '',
            city: camp.location?.city || '',
            state: camp.location?.state || '',
            zipCode: camp.location?.zipCode || '',
            landmark: camp.location?.landmark || '',
            coordinates: {
              latitude: hasCoordinates ? String(campCoordinates.latitude) : '',
              longitude: hasCoordinates ? String(campCoordinates.longitude) : '',
            },
          },
          capacity: camp.capacity ?? '',
          requirements: {
            bloodGroups: camp.requirements?.bloodGroups || [],
            targetUnits: camp.requirements?.targetUnits ?? '',
          },
          contactInfo: {
            phone: camp.contactInfo?.phone || '',
            email: camp.contactInfo?.email || '',
            coordinatorName: camp.contactInfo?.coordinatorName || '',
          },
        }));
        setCampImage(camp.campImage || '');
        setLocationConfirmed(hasCoordinates);
      } catch (loadError) {
        setError(loadError.response?.data?.message || 'Failed to load camp details for editing');
      } finally {
        setLoadingCamp(false);
      }
    };

    loadCamp();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child, nested] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: nested
          ? {
            ...prev[parent],
            [child]: {
              ...prev[parent][child],
              [nested]: value,
            },
          }
          : {
            ...prev[parent],
            [child]: value,
          },
      }));
      if (name === 'location.coordinates.latitude' || name === 'location.coordinates.longitude') {
        setLocationConfirmed(false);
        setLocationError('');
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const selectLocation = (latitude, longitude, confirmed = false) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        coordinates: {
          latitude: Number(latitude).toFixed(6),
          longitude: Number(longitude).toFixed(6),
        },
      },
    }));
    setLocationConfirmed(confirmed);
    setLocationError('');
  };

  const handleUseCurrentLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Location detection is not supported by this browser. Select your location on the map instead.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        selectLocation(coords.latitude, coords.longitude, true);
        setLocationLoading(false);
      },
      (geoError) => {
        const messages = {
          1: 'Location permission was denied. Allow location access in your browser settings or select the map location manually.',
          2: 'Your location is currently unavailable. Try again or select the map location manually.',
          3: 'Finding your location timed out. Try again or select the map location manually.',
        };
        setLocationError(
          messages[geoError.code]
          || 'We could not get your location. Select it on the map instead.'
        );
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleCampImageChange = (event) => {
    const file = event.target.files?.[0];
    setImageError('');
    if (!file) return;
    setCampImage('');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCampImage('');
      setImageError('Choose a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setCampImage('');
      setImageError('The camp image must be 2 MB or smaller.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCampImage(reader.result);
      } else {
        setCampImage('');
        setImageError('The selected image could not be read. Please choose another image.');
      }
    };
    reader.onerror = () => {
      setCampImage('');
      setImageError('The selected image could not be read. Please choose another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const latitudeValue = formData.location.coordinates.latitude;
    const longitudeValue = formData.location.coordinates.longitude;
    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);
    const hasCoordinates = latitudeValue !== ''
      && longitudeValue !== ''
      && Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && latitude >= -90
      && latitude <= 90
      && longitude >= -180
      && longitude <= 180;

    if (!formData.location.venueName.trim()) {
      setError('Enter a venue name before creating the camp.');
      return;
    }
    if (!hasCoordinates) {
      setLocationError('Select a valid camp location on the map or enter valid latitude and longitude.');
      return;
    }
    if (!locationConfirmed) {
      setLocationError('Confirm the selected location before creating the camp.');
      return;
    }

    setLoading(true);

    const submitData = {
      ...formData,
      location: {
        ...formData.location,
        coordinates: { latitude, longitude },
      },
      campImage,
      capacity: parseInt(formData.capacity),
      requirements: {
        ...formData.requirements,
        targetUnits: parseInt(formData.requirements.targetUnits) || undefined,
      },
    };

    try {
      if (isEditing) {
        await campAPI.update(id, submitData);
        navigate(`/camps/${id}`);
      } else {
        const response = await campAPI.create(submitData);
        navigate('/camps', { state: { createdCampId: response.data.data._id } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create camp');
    } finally {
      setLoading(false);
    }
  };

  if (loadingCamp) return <div className="spinner" role="status">Loading camp details…</div>;

  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{isEditing ? 'Edit Blood Donation Camp' : 'Create Blood Donation Camp'}</h1>
          <p className="page-subtitle">
            {isEditing ? 'Update the camp details and save your changes' : 'Schedule a new blood donation camp'}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="donor-form">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Camp Details</h2>
            </div>

            <div className="form-grid">
              <div className="form-group form-full">
                <label className="form-label">Camp Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group form-full">
                <label className="form-label">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-textarea"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="camp-blood-groups">Blood Groups Needed</label>
                <select
                  id="camp-blood-groups"
                  name="requirements.bloodGroups"
                  value={formData.requirements.bloodGroups}
                  onChange={(event) => {
                    const bloodGroups = Array.from(
                      event.target.selectedOptions,
                      (option) => option.value
                    );
                    setFormData((prev) => ({
                      ...prev,
                      requirements: { ...prev.requirements, bloodGroups },
                    }));
                  }}
                  className="form-input"
                  multiple
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bloodGroup) => (
                    <option key={bloodGroup} value={bloodGroup}>{bloodGroup}</option>
                  ))}
                </select>
                <p className="auth-field-hint">Hold Ctrl (Windows) or Command (Mac) to select multiple.</p>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="camp-target-units">Target Units</label>
                <input
                  id="camp-target-units"
                  type="number"
                  name="requirements.targetUnits"
                  value={formData.requirements.targetUnits}
                  onChange={handleChange}
                  className="form-input"
                  min="1"
                />
              </div>

              <div className="form-group form-full camp-image-upload">
                <label className="form-label" htmlFor="camp-image">Camp image</label>
                <input
                  id="camp-image"
                  ref={campImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCampImageChange}
                  className="form-input"
                  aria-describedby="camp-image-hint"
                />
                <p className="auth-field-hint" id="camp-image-hint">
                  Optional JPG, PNG, or WebP image, up to 2 MB. A location QR code will appear on the image.
                </p>
                {imageError && <p className="alert alert-error" role="alert">{imageError}</p>}
                {campImage && (
                  <div className="camp-image-upload-preview">
                    <img src={campImage} alt={`${formData.name || 'Camp'} preview`} />
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        setCampImage('');
                        if (campImageInputRef.current) campImageInputRef.current.value = '';
                      }}
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Time *</label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Capacity *</label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="form-input"
                  min="1"
                  required
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Location</h2>
            </div>

            <div className="form-grid">
              <div className="form-group form-full">
                <label className="form-label">Venue Name *</label>
                <input
                  type="text"
                  name="location.venueName"
                  value={formData.location.venueName}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group form-full">
                <label className="form-label">Address *</label>
                <input
                  type="text"
                  name="location.address"
                  value={formData.location.address}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  name="location.city"
                  value={formData.location.city}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">State *</label>
                <input
                  type="text"
                  name="location.state"
                  value={formData.location.state}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Zip Code</label>
                <input
                  type="text"
                  name="location.zipCode"
                  value={formData.location.zipCode}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Landmark</label>
                <input
                  type="text"
                  name="location.landmark"
                  value={formData.location.landmark}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group form-full">
                <p className="camp-location-permission-note">
                  Use My Current Location asks for permission only when clicked. Location access generally requires HTTPS or localhost.
                </p>
                <button
                  type="button"
                  className="btn btn-outline camp-location-button"
                  onClick={handleUseCurrentLocation}
                  disabled={locationLoading}
                >
                  <span aria-hidden="true">⌖</span>
                  {locationLoading ? 'Finding your location…' : 'Use My Current Location'}
                </button>
                {locationLoading && (
                  <p className="camp-location-status" role="status">
                    <span className="camp-location-spinner" aria-hidden="true" />
                    Waiting for your device location permission…
                  </p>
                )}
                {locationError && <p className="alert alert-error" role="alert">{locationError}</p>}
              </div>

              <CampLocationPicker
                latitude={formData.location.coordinates.latitude}
                longitude={formData.location.coordinates.longitude}
                onSelect={(latitude, longitude) => selectLocation(latitude, longitude)}
              />

              <div className="form-group">
                <label className="form-label" htmlFor="camp-latitude">Latitude *</label>
                <input
                  id="camp-latitude"
                  type="number"
                  name="location.coordinates.latitude"
                  value={formData.location.coordinates.latitude}
                  onChange={handleChange}
                  className="form-input"
                  min="-90"
                  max="90"
                  step="any"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="camp-longitude">Longitude *</label>
                <input
                  id="camp-longitude"
                  type="number"
                  name="location.coordinates.longitude"
                  value={formData.location.coordinates.longitude}
                  onChange={handleChange}
                  className="form-input"
                  min="-180"
                  max="180"
                  step="any"
                  required
                />
              </div>
              <div className="form-group form-full">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    const latitude = Number(formData.location.coordinates.latitude);
                    const longitude = Number(formData.location.coordinates.longitude);
                    if (
                      formData.location.coordinates.latitude === ''
                      || formData.location.coordinates.longitude === ''
                      || !Number.isFinite(latitude)
                      || !Number.isFinite(longitude)
                      || latitude < -90
                      || latitude > 90
                      || longitude < -180
                      || longitude > 180
                    ) {
                      setLocationConfirmed(false);
                      setLocationError('Enter a valid latitude (-90 to 90) and longitude (-180 to 180), or select a point on the map.');
                      return;
                    }
                    setLocationConfirmed(true);
                    setLocationError('');
                  }}
                >
                  Confirm selected location
                </button>
                <p className="camp-location-status" role="status">
                  {locationConfirmed
                    ? 'Location confirmed and ready to save.'
                    : 'Choose a point on the map or enter coordinates, then confirm.'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Contact Information</h2>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Phone *</label>
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
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="contactInfo.email"
                  value={formData.contactInfo.email}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Coordinator Name</label>
                <input
                  type="text"
                  name="contactInfo.coordinatorName"
                  value={formData.contactInfo.coordinatorName}
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
              {loading ? (isEditing ? 'Saving Changes...' : 'Creating Camp...') : (isEditing ? 'Save Changes' : 'Create Camp')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CampCreate;

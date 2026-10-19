import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import './UserProfile.css';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const UserProfile = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const saveProfileImage = async (imageData) => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await authAPI.updateProfileImage(imageData);
      updateUser({ ...user, ...response.data.data });
      setMessage(imageData ? 'Profile photo updated.' : 'Profile photo removed.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update your profile photo. Please try again.');
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setMessage('');

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError('The selected image is larger than 2 MB. Choose a smaller file.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('The selected image could not be read. Please choose another file.');
        return;
      }
      saveProfileImage(reader.result);
    };
    reader.onerror = () => {
      setError('The selected image could not be read. Please choose another file.');
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="page-container">
      <div className="container user-profile-page">
        <header className="page-header">
          <h1 className="page-title">Your account</h1>
          <p className="page-subtitle">Manage your profile photo and account details.</p>
        </header>

        <section className="user-profile-card" aria-labelledby="account-profile-heading">
          <div className="user-profile-identity">
            <div className="user-profile-avatar" aria-label={`${user?.name || 'User'} profile photo`}>
              {user?.profileImage ? (
                <img src={user.profileImage} alt="" />
              ) : (
                <span aria-hidden="true">{user?.name?.trim()?.charAt(0)?.toUpperCase() || '?'}</span>
              )}
            </div>
            <div className="user-profile-details">
              <span className="user-profile-eyebrow">SAVELIFE ACCOUNT</span>
              <h2 id="account-profile-heading">{user?.name}</h2>
              <span className="user-profile-role">{user?.role}</span>
            </div>
          </div>

          <div className="user-profile-photo-actions">
            <div>
              <h3>Profile photo</h3>
              <p>Choose a clear photo. JPG, PNG, or WebP, up to 2 MB.</p>
            </div>
            <div className="user-profile-buttons">
              <input
                ref={fileInputRef}
                className="user-profile-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelection}
                aria-label="Choose profile photo"
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                {saving ? 'Saving photo…' : user?.profileImage ? 'Change photo' : 'Choose photo'}
              </button>
              {user?.profileImage && (
                <button
                  type="button"
                  className="user-profile-remove"
                  onClick={() => saveProfileImage(null)}
                  disabled={saving}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {(error || message) && (
            <p className={`user-profile-feedback${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'}>
              {error || message}
            </p>
          )}

          <dl className="user-profile-account-details">
            <div>
              <dt>Email address</dt>
              <dd>{user?.email || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Phone number</dt>
              <dd>{user?.phone || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Account role</dt>
              <dd className="user-profile-role-value">{user?.role}</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
};

export default UserProfile;

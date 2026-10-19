import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import './Auth.css';

const PHONE_COUNTRY_CODES = [
  { label: 'India', code: '+91' },
  { label: 'United States', code: '+1' },
  { label: 'United Kingdom', code: '+44' },
  { label: 'Australia', code: '+61' },
  { label: 'United Arab Emirates', code: '+971' },
];

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [helpCountryCode, setHelpCountryCode] = useState('+91');
  const [helpPhoneDigits, setHelpPhoneDigits] = useState('');
  const [helpMessage, setHelpMessage] = useState('');
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpError, setHelpError] = useState('');
  const [helpNotice, setHelpNotice] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { data } = response.data;
      
      login(data, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordHelp = async (event) => {
    event.preventDefault();
    setHelpError('');
    setHelpNotice('');
    setHelpLoading(true);

    try {
      const response = await authAPI.requestPasswordHelp({
        email: formData.email.trim().toLowerCase(),
        phone: `${helpCountryCode}${helpPhoneDigits}`,
        message: helpMessage.trim(),
      });
      setHelpNotice(response.data.message);
      setHelpMessage('');
      setHelpPhoneDigits('');
    } catch (requestError) {
      setHelpError(requestError.response?.data?.message || 'Could not send your help request. Please try again.');
    } finally {
      setHelpLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Login to your SaveLife account</p>
        </div>

        {location.state?.passwordReset && (
          <div className="auth-help-notice" role="status">
            Your password has been changed. You can now log in with your new password.
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="name@example.com"
              autoComplete="email"
              pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
              aria-describedby="login-email-hint"
              required
            />
            <p className="auth-field-hint" id="login-email-hint">
              Enter the email address linked to your account.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <p className="auth-field-hint">Use the password you chose when creating your account.</p>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <button
          type="button"
          className="auth-help-toggle"
          aria-expanded={showHelpForm}
          onClick={() => {
            setShowHelpForm((isOpen) => !isOpen);
            setHelpError('');
            setHelpNotice('');
          }}
        >
          Forgot your password? Ask an administrator
        </button>

        {showHelpForm && (
          <form className="auth-help-form" onSubmit={handlePasswordHelp}>
            <p>
              Enter the email and international phone number registered to your account. An administrator
              will check both details before issuing a one-time reset link.
            </p>
            {helpError && <div className="alert alert-error" role="alert">{helpError}</div>}
            {helpNotice && <div className="auth-help-notice" role="status">{helpNotice}</div>}
            <div className="form-group">
              <label className="form-label" htmlFor="help-email">Account email</label>
              <input
                id="help-email"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                className="form-input"
                autoComplete="email"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="help-phone">Registered phone number</label>
              <div className="auth-phone-input">
                <select
                  id="help-phone-country-code"
                  value={helpCountryCode}
                  onChange={(event) => setHelpCountryCode(event.target.value)}
                  className="form-select auth-country-code"
                  aria-label="Phone country code"
                  required
                >
                  {PHONE_COUNTRY_CODES.map((country) => (
                    <option key={`${country.label}-${country.code}`} value={country.code}>
                      {country.label} ({country.code})
                    </option>
                  ))}
                </select>
                <input
                  id="help-phone"
                  type="tel"
                  value={helpPhoneDigits}
                  onChange={(event) => setHelpPhoneDigits(event.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="form-input"
                  placeholder="10-digit number"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  pattern="[0-9]{10}"
                  maxLength="10"
                  aria-describedby="help-phone-hint"
                  required
                />
              </div>
              <p className="auth-field-hint" id="help-phone-hint">
                Select the country code separately and enter exactly 10 digits.
              </p>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="help-message">Message (optional)</label>
              <textarea
                id="help-message"
                value={helpMessage}
                onChange={(event) => setHelpMessage(event.target.value.slice(0, 500))}
                className="form-input auth-help-textarea"
                maxLength={500}
                rows={3}
                placeholder="Additional information for the administrator."
              />
            </div>
            <button type="submit" className="btn btn-outline btn-full" disabled={helpLoading}>
              {helpLoading ? 'Sending request…' : 'Send password help request'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="text-red">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

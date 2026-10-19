import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const PASSWORD_RULES = [
  { label: '8 characters', test: (value) => value.length >= 8 },
  { label: 'Uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'Lowercase letter', test: (value) => /[a-z]/.test(value) },
  { label: 'Number', test: (value) => /\d/.test(value) },
  { label: 'Special character', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'donor',
  });
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePhoneChange = (event) => {
    setPhoneDigits(event.target.value.replace(/\D/g, '').slice(0, 10));
  };

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email.trim());
  const phoneIsValid = phoneDigits.length === 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.register({
        ...formData,
        email: formData.email.trim().toLowerCase(),
        phone: phoneDigits,
        phoneCountryCode: countryCode,
      });
      const { data } = response.data;
      
      login(data, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join SaveLife and save lives</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="name@example.com"
              autoComplete="email"
              pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
              aria-describedby="register-email-hint"
              required
            />
            <p className="auth-field-hint" id="register-email-hint">
              Use a valid email format, for example <strong>name@example.com</strong>.
            </p>
            <span
              className={`auth-input-progress${formData.email ? (emailIsValid ? ' is-complete' : ' is-incomplete') : ''}`}
              aria-hidden="true"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-phone">Phone number</label>
            <div className="auth-phone-input">
              <select
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className="form-select auth-country-code"
                aria-label="Phone country code"
              >
                {PHONE_COUNTRY_CODES.map((country) => (
                  <option key={`${country.label}-${country.code}`} value={country.code}>
                    {country.label} ({country.code})
                  </option>
                ))}
              </select>
              <input
                id="register-phone"
                type="tel"
                value={phoneDigits}
                onChange={handlePhoneChange}
                className="form-input"
                placeholder="10-digit number"
                inputMode="numeric"
                autoComplete="tel-national"
                pattern="[0-9]{10}"
                maxLength="10"
                aria-describedby="register-phone-hint"
                required
              />
            </div>
            <p className="auth-field-hint" id="register-phone-hint">
              Select your country code and enter exactly 10 digits, without spaces.
            </p>
            <span
              className={`auth-input-progress${phoneDigits ? (phoneIsValid ? ' is-complete' : ' is-incomplete') : ''}`}
              aria-hidden="true"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
              minLength="8"
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}"
              aria-describedby="register-password-hint"
            />
            <p className="auth-field-hint" id="register-password-hint">
              Use a mix of letters, a number, and a special character.
            </p>
            <div className="password-guidance" aria-live="polite">
              <div
                className={`password-guidance-track${formData.password ? ' has-value' : ''}`}
                aria-hidden="true"
              >
                {PASSWORD_RULES.map((rule) => (
                  <span
                    className={rule.test(formData.password) ? 'is-met' : ''}
                    key={rule.label}
                  />
                ))}
              </div>
              <ul className="password-guidance-rules">
                {PASSWORD_RULES.map((rule) => {
                  const isMet = rule.test(formData.password);
                  return (
                    <li className={isMet ? 'is-met' : ''} key={rule.label}>
                      <span aria-hidden="true">{isMet ? '✓' : '○'}</span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="donor">Donor</option>
              <option value="patient">Patient / Person in need</option>
              <option value="organizer">Camp Creator / Organizer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="text-red">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

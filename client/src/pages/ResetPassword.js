import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Auth.css';

const passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!passwordRules.test(password)) {
      setError('Use at least 8 characters with uppercase, lowercase, a number, and a special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({ token, password });
      navigate('/login', {
        replace: true,
        state: { passwordReset: true },
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not reset the password. Request a new link from an administrator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-container">
      <section className="auth-card">
        <header className="auth-header">
          <h1 className="auth-title">Choose a new password</h1>
          <p className="auth-subtitle">Set a new password for your SaveLife account.</p>
        </header>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reset-password">New password</label>
            <input
              id="reset-password"
              className="form-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
            <p className="auth-field-hint">
              At least 8 characters, including uppercase, lowercase, a number, and a special character.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reset-password-confirm">Confirm new password</label>
            <input
              id="reset-password-confirm"
              className="form-input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Updating password…' : 'Update password'}
          </button>
        </form>
        <div className="auth-footer">
          <p><Link to="/login" className="text-red">Return to login</Link></p>
        </div>
      </section>
    </main>
  );
};

export default ResetPassword;

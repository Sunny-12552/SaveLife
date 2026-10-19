import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import './AdminUsers.css';

const roleOptions = [
  { value: 'admin', label: 'Administrator' },
  { value: 'organizer', label: 'Camp Creator / Organizer' },
  { value: 'donor', label: 'Donor' },
  { value: 'patient', label: 'Patient / Person in need' },
];

const formatDate = (date) => (
  date ? new Date(date).toLocaleString() : 'Never'
);

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [passwordHelpRequests, setPasswordHelpRequests] = useState([]);
  const [passwordHelpLoading, setPasswordHelpLoading] = useState(true);
  const [passwordHelpError, setPasswordHelpError] = useState('');
  const [passwordHelpNotice, setPasswordHelpNotice] = useState('');
  const [issuingRequestId, setIssuingRequestId] = useState('');
  const [resetLinks, setResetLinks] = useState({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.getUsers({
        search: search.trim() || undefined,
        role: role || undefined,
        status: status || undefined,
      });
      setUsers(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load registered accounts.');
    } finally {
      setLoading(false);
    }
  }, [role, search, status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchUsers, 250);
    return () => window.clearTimeout(timeoutId);
  }, [fetchUsers]);

  const fetchPasswordHelpRequests = useCallback(async () => {
    setPasswordHelpLoading(true);
    setPasswordHelpError('');
    try {
      const response = await authAPI.getPasswordHelpRequests();
      setPasswordHelpRequests(response.data.data);
    } catch (requestError) {
      setPasswordHelpError(
        requestError.response?.data?.message || 'Could not load password help requests.'
      );
    } finally {
      setPasswordHelpLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPasswordHelpRequests();
  }, [fetchPasswordHelpRequests]);

  const updateUser = async (user, updates) => {
    setUpdatingId(user._id);
    setError('');
    setNotice('');
    try {
      await authAPI.updateManagedUser(user._id, updates);
      await fetchUsers();
      setNotice(`${user.name}'s account was updated.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this account.');
    } finally {
      setUpdatingId('');
    }
  };

  const createResetLink = async (request) => {
    setIssuingRequestId(request._id);
    setPasswordHelpError('');
    setPasswordHelpNotice('');
    try {
      const response = await authAPI.issuePasswordResetLink(request._id);
      const { resetToken, expiresAt } = response.data.data;
      setResetLinks((current) => ({
        ...current,
        [request._id]: {
          url: `${window.location.origin}/reset-password/${resetToken}`,
          expiresAt,
        },
      }));
      setPasswordHelpNotice(`A one-time reset link was created for ${request.email}.`);
      await fetchPasswordHelpRequests();
    } catch (requestError) {
      setPasswordHelpError(
        requestError.response?.data?.message || 'Could not create a reset link for this request.'
      );
    } finally {
      setIssuingRequestId('');
    }
  };

  const copyResetLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setPasswordHelpNotice('Reset link copied. Share it only with the verified account holder.');
    } catch {
      setPasswordHelpError('Could not copy the link automatically. Select and copy the link text.');
    }
  };

  return (
    <main className="page-container">
      <div className="container admin-users-page">
        <header className="page-header">
          <h1 className="page-title">User management</h1>
          <p className="page-subtitle">
            Review registered accounts, manage roles and access, and check sign-in history.
          </p>
        </header>

        <section className="admin-users-summary" aria-label="Account overview">
          <div>
            <span className="admin-users-summary-label">REGISTERED ACCOUNTS</span>
            <strong>{users.length}</strong>
            <span>matching the current filters</span>
          </div>
          <span className="admin-users-summary-icon" aria-hidden="true">👥</span>
        </section>

        <section className="admin-users-panel admin-password-help" aria-labelledby="password-help-heading">
          <div className="admin-password-help-heading">
            <div>
              <h2 id="password-help-heading">Password help requests</h2>
              <p>Verify the requester using trusted contact details before creating or sharing a reset link.</p>
            </div>
            <button
              type="button"
              className="btn btn-outline admin-users-refresh"
              onClick={fetchPasswordHelpRequests}
              disabled={passwordHelpLoading}
            >
              Refresh requests
            </button>
          </div>

          {passwordHelpError && <div className="alert alert-error" role="alert">{passwordHelpError}</div>}
          {passwordHelpNotice && <div className="admin-users-notice" role="status">{passwordHelpNotice}</div>}

          {passwordHelpLoading ? (
            <div className="spinner" aria-label="Loading password help requests" />
          ) : passwordHelpRequests.length === 0 ? (
            <div className="admin-users-empty">There are no password help requests.</div>
          ) : (
            <div className="admin-password-help-list">
              {passwordHelpRequests.map((request) => (
                <article className="admin-password-help-request" key={request._id}>
                  <div>
                    <strong>{request.email}</strong>
                    <span>Submitted phone: {request.phone}</span>
                    <span>{formatDate(request.createdAt)}</span>
                    <span className={`admin-help-status ${request.phoneMatchesAccount ? 'is-match' : 'is-no-match'}`}>
                      {request.phoneMatchesAccount
                        ? 'Email and phone match an account'
                        : 'Email/phone do not match an account'}
                    </span>
                    <span className={`admin-help-status is-${request.status}`}>
                      {request.status === 'pending' ? 'Pending review' : 'Reset link issued'}
                    </span>
                    {request.message && <p>{request.message}</p>}
                  </div>
                  <div className="admin-password-help-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={issuingRequestId === request._id || !request.phoneMatchesAccount}
                      onClick={() => createResetLink(request)}
                    >
                      {issuingRequestId === request._id
                        ? 'Creating…'
                        : request.status === 'link_issued' ? 'Issue new link' : 'Verify & issue reset link'}
                    </button>
                    {resetLinks[request._id] && (
                      <div className="admin-reset-link">
                        <label htmlFor={`reset-link-${request._id}`}>One-time reset link</label>
                        <input
                          id={`reset-link-${request._id}`}
                          type="text"
                          value={resetLinks[request._id].url}
                          readOnly
                          onFocus={(event) => event.target.select()}
                        />
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => copyResetLink(resetLinks[request._id].url)}
                        >
                          Copy link
                        </button>
                        <span>Expires {formatDate(resetLinks[request._id].expiresAt)}. It can be used once.</span>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="admin-users-panel">
          <div className="admin-users-toolbar">
            <label className="admin-users-search">
              <span className="sr-only">Search by name, email, or phone</span>
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, or phone"
              />
            </label>
            <label className="sr-only" htmlFor="admin-role-filter">Filter accounts by role</label>
            <select id="admin-role-filter" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="">All roles</option>
              {roleOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="admin-status-filter">Filter accounts by status</label>
            <select id="admin-status-filter" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </select>
            <button type="button" className="btn btn-outline admin-users-refresh" onClick={fetchUsers}>
              Refresh
            </button>
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {notice && <div className="admin-users-notice" role="status">{notice}</div>}

          {loading ? (
            <div className="spinner" aria-label="Loading registered accounts" />
          ) : users.length === 0 ? (
            <div className="admin-users-empty">No registered accounts match these filters.</div>
          ) : (
            <div className="admin-users-list">
              {users.map((user) => (
                <article className="admin-user-card" key={user._id}>
                  <div className="admin-user-identity">
                    <div className="admin-user-avatar">
                      {user.profileImage
                        ? <img src={user.profileImage} alt="" />
                        : user.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="admin-user-primary">
                      <h2>{user.name}</h2>
                      <span>{user.email}</span>
                      <span>{user.phone || 'No phone number'}</span>
                    </div>
                  </div>

                  <div className="admin-user-meta">
                    <label>
                      <span>Role</span>
                      <select
                        value={user.role}
                        disabled={updatingId === user._id || user._id === currentUser?._id}
                        onChange={(event) => updateUser(user, { role: event.target.value })}
                        aria-label={`Change role for ${user.name}`}
                        title={user._id === currentUser?._id ? 'You cannot change your own administrator role.' : undefined}
                      >
                        {roleOptions.map((option) => (
                          <option value={option.value} key={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <div>
                      <span>Account status</span>
                      <strong className={`admin-user-status${user.isActive ? ' is-active' : ' is-inactive'}`}>
                        {user.isActive ? 'Active' : 'Deactivated'}
                      </strong>
                    </div>
                  </div>

                  <div className="admin-user-login">
                    <div>
                      <span>Registered</span>
                      <strong>{formatDate(user.createdAt)}</strong>
                    </div>
                    <div>
                      <span>Last login</span>
                      <strong>{formatDate(user.lastLoginAt)}</strong>
                    </div>
                    <details>
                      <summary>Login history ({user.loginHistory?.length || 0})</summary>
                      {user.loginHistory?.length ? (
                        <ol>
                          {[...user.loginHistory].reverse().map((loginAt, index) => (
                            <li key={`${loginAt}-${index}`}>{formatDate(loginAt)}</li>
                          ))}
                        </ol>
                      ) : (
                        <p>No successful logins recorded yet.</p>
                      )}
                    </details>
                  </div>

                  <button
                    type="button"
                    className={`admin-user-toggle${user.isActive ? ' is-deactivate' : ' is-activate'}`}
                    disabled={
                      updatingId === user._id ||
                      (user._id === currentUser?._id && user.isActive)
                    }
                    onClick={() => updateUser(user, { isActive: !user.isActive })}
                    title={
                      user._id === currentUser?._id && user.isActive
                        ? 'You cannot deactivate your own administrator account.'
                        : undefined
                    }
                  >
                    {updatingId === user._id
                      ? 'Saving…'
                      : user._id === currentUser?._id && user.isActive
                        ? 'Current account'
                        : user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default AdminUsers;

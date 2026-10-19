import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campAPI, requestAPI, donorAPI, donationAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    upcomingCamps: 0,
    urgentRequests: 0,
    myCamps: 0,
    myRequests: 0,
    donorProfile: null,
    certificates: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const [upcomingRes, urgentRes] = await Promise.all([
        campAPI.getUpcoming({ limit: 5 }),
        requestAPI.getUrgent({ limit: 5 }),
      ]);

      const newStats = {
        upcomingCamps: Array.isArray(upcomingRes.data?.data) ? upcomingRes.data.data.length : 0,
        urgentRequests: Array.isArray(urgentRes.data?.data) ? urgentRes.data.data.length : 0,
        myCamps: 0,
        myRequests: 0,
        donorProfile: null,
        certificates: [],
      };

      if (user.role === 'patient') {
        const myRequestsRes = await requestAPI.getMyRequests();
        newStats.myRequests = Array.isArray(myRequestsRes.data?.data)
          ? myRequestsRes.data.data.length
          : 0;
      }

      if (user.role === 'donor') {
        const [myCampsResult, donorProfileResult, certificatesResult] = await Promise.allSettled([
          campAPI.getMyCamps(),
          donorAPI.getMyProfile(),
          donationAPI.getMyCertificates(),
        ]);
        const donorDataErrors = [];

        if (myCampsResult.status === 'fulfilled' && Array.isArray(myCampsResult.value.data?.data)) {
          newStats.myCamps = myCampsResult.value.data.data.length;
        } else if (
          myCampsResult.status === 'rejected' &&
          myCampsResult.reason.response?.status !== 404
        ) {
          donorDataErrors.push('camp registrations');
        }

        if (donorProfileResult.status === 'fulfilled') {
          newStats.donorProfile = donorProfileResult.value.data?.data || null;
        } else if (donorProfileResult.reason.response?.status !== 404) {
          donorDataErrors.push('donor profile');
        }

        if (
          certificatesResult.status === 'fulfilled' &&
          Array.isArray(certificatesResult.value.data?.data)
        ) {
          newStats.certificates = certificatesResult.value.data.data;
        } else if (certificatesResult.status === 'rejected') {
          donorDataErrors.push('donation certificates');
        }

        if (donorDataErrors.length) {
          setError(`Some donor information could not be loaded: ${donorDataErrors.join(', ')}. Please retry.`);
        }
      }

      setStats(newStats);
    } catch (error) {
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="page-container">
      {error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
          <button 
            onClick={fetchDashboardData} 
            className="btn btn-sm btn-outline-light ml-3"
          >
            Retry
          </button>
        </div>
      )}
      <div className="container">
        <div className="page-header">
          {user?.role === 'donor' ? (
            <div className="donor-welcome">
              <div className="donor-welcome-content">
                <span className="donor-welcome-eyebrow">YOUR DONOR SPACE</span>
                <h1 className="page-title">Welcome back, {user?.name}.</h1>
                <p className="page-subtitle">
                  Every act of giving makes a difference. Find a nearby camp or check your donor profile.
                </p>
                <div className="donor-welcome-actions">
                  <Link to="/camps" className="btn btn-primary">Explore camps <span aria-hidden="true">→</span></Link>
                  <Link
                    to={stats.donorProfile ? '/donor/profile' : '/donor/register'}
                    className="donor-welcome-secondary"
                  >
                    {stats.donorProfile ? 'View donor profile' : 'Complete donor profile'}
                  </Link>
                </div>
              </div>
              <div className="donor-welcome-mark" aria-hidden="true">🩸</div>
            </div>
          ) : user?.role === 'patient' ? (
            <div className="donor-welcome patient-welcome">
              <div className="donor-welcome-content">
                <span className="donor-welcome-eyebrow">PATIENT SUPPORT</span>
                <h1 className="page-title">Welcome, {user?.name}.</h1>
                <p className="page-subtitle">
                  Create a blood request and follow its progress from your personal dashboard.
                </p>
                <div className="donor-welcome-actions">
                  <Link to="/requests/create" className="btn btn-primary">
                    Create blood request <span aria-hidden="true">→</span>
                  </Link>
                  <Link to="/requests" className="donor-welcome-secondary">Track my requests</Link>
                </div>
              </div>
              <div className="donor-welcome-mark" aria-hidden="true">🆘</div>
            </div>
          ) : (
            <>
              <h1 className="page-title">Welcome, {user?.name}!</h1>
              <p className="page-subtitle">
                {user?.role === 'organizer' && 'Manage camps and help save lives'}
                {user?.role === 'admin' && 'System administration dashboard'}
              </p>
            </>
          )}
        </div>

        <div className={`dashboard-grid${user?.role === 'donor' ? ' donor-dashboard-grid' : ''}`}>
          <div className="stat-card stat-card-red">
            <div className="stat-icon">🩸</div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.upcomingCamps}</h3>
              <p className="stat-label">Upcoming Camps</p>
            </div>
            <Link to="/camps" className="stat-link">
              View All →
            </Link>
          </div>

          <div className="stat-card stat-card-white">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.urgentRequests}</h3>
              <p className="stat-label">Urgent Requests</p>
            </div>
            <Link to="/requests" className="stat-link">
              View All →
            </Link>
          </div>

          {user?.role === 'donor' && (
            <div className="stat-card stat-card-white">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <h3 className="stat-number">{stats.myCamps}</h3>
                <p className="stat-label">My Registrations</p>
              </div>
              <Link to="/camps" className="stat-link">
                Browse Camps →
              </Link>
            </div>
          )}

          {user?.role === 'patient' && (
            <div className="stat-card stat-card-white">
              <div className="stat-icon">📝</div>
              <div className="stat-content">
                <h3 className="stat-number">{stats.myRequests}</h3>
                <p className="stat-label">My Blood Requests</p>
              </div>
              <Link to="/requests" className="stat-link">Track Requests →</Link>
            </div>
          )}

          {user?.role === 'donor' && stats.donorProfile && (
            <div className="stat-card stat-card-red">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3 className="stat-number">
                  {stats.donorProfile.isEligible ? 'Eligible' : 'Not Eligible'}
                </h3>
                <p className="stat-label">Donation Status</p>
              </div>
              <Link to="/donor/profile" className="stat-link">
                View Profile →
              </Link>
            </div>
          )}
        </div>

        {user?.role === 'donor' && !stats.donorProfile && (
          <div className="donor-profile-prompt">
            <div className="donor-prompt-icon" aria-hidden="true">✦</div>
            <div className="donor-prompt-copy">
              <span className="donor-welcome-eyebrow">ONE QUICK STEP</span>
              <h2>Complete your donor profile</h2>
              <p>
                Add your blood group, contact details and health information to register for camps.
              </p>
            </div>
            <Link to="/donor/register" className="btn btn-primary">
              Create donor profile <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {user?.role === 'donor' && stats.certificates.length > 0 && (
          <section className="donor-certificates-section" aria-labelledby="donor-certificates-title">
            <div className="donor-certificates-header">
              <div>
                <span className="donor-welcome-eyebrow">RECOGNITION</span>
                <h2 id="donor-certificates-title">Donation certificates</h2>
                <p>Your certificates issued by camp organizers.</p>
              </div>
              <button type="button" className="btn btn-outline" onClick={() => window.print()}>
                Print certificates
              </button>
            </div>
            <div className="donor-certificates-print">
              {stats.certificates.map((certificate) => (
                <article className="certificate-sheet" key={certificate._id}>
                  <p className="certificate-brand">SaveLife</p>
                  <p className="certificate-kicker">CERTIFICATE OF APPRECIATION</p>
                  <h3>Blood Donation</h3>
                  <p className="certificate-intro">This certificate is proudly presented to</p>
                  <p className="certificate-donor-name">{user.name}</p>
                  <p className="certificate-copy">
                    In recognition of your generous blood donation at <strong>{certificate.campId?.name || 'a SaveLife camp'}</strong>.
                    Your contribution helps save lives.
                  </p>
                  <div className="certificate-details">
                    <span><strong>Donation date</strong>{new Date(certificate.donationDate).toLocaleDateString()}</span>
                    <span><strong>Blood group</strong>{certificate.bloodGroup}</span>
                    <span><strong>Units donated</strong>{certificate.unitsCollected}</span>
                    <span><strong>Certificate number</strong>{certificate.certificate.certificateNumber}</span>
                  </div>
                  <p className="certificate-issued">
                    Issued {new Date(certificate.certificate.issuedDate).toLocaleDateString()}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            {user?.role === 'donor' && stats.donorProfile && (
              <Link to="/donor/profile" className="action-card">
                <div className="action-icon">🩺</div>
                <h3>My Donor Profile</h3>
                <p>Review your donor details and donation eligibility</p>
              </Link>
            )}

            {(user?.role === 'organizer' || user?.role === 'admin') && (
              <>
                <Link to="/camps/create" className="action-card">
                  <div className="action-icon">➕</div>
                  <h3>Create Camp</h3>
                  <p>Schedule a new blood donation camp</p>
                </Link>

                <Link to="/donations/quick" className="action-card">
                  <div className="action-icon">🩸</div>
                  <h3>Quick Donation</h3>
                  <p>Record walk-in donor without account</p>
                </Link>

                <Link to="/donors" className="action-card">
                  <div className="action-icon">👥</div>
                  <h3>View Donors</h3>
                  <p>Browse all registered donors</p>
                </Link>
              </>
            )}

            {user?.role === 'patient' && (
              <>
                <Link to="/requests/create" className="action-card">
                  <div className="action-icon">🆘</div>
                  <h3>Create Blood Request</h3>
                  <p>Send your blood requirement to SaveLife</p>
                </Link>
                <Link to="/requests" className="action-card">
                  <div className="action-icon">📋</div>
                  <h3>Track My Requests</h3>
                  <p>Review request status and progress</p>
                </Link>
              </>
            )}

            {user?.role === 'donor' && (
              <>
                <Link to="/camps" className="action-card">
                  <div className="action-icon">🏕️</div>
                  <h3>Browse Camps</h3>
                  <p>Find and register for blood camps</p>
                </Link>

                <Link to="/requests" className="action-card">
                  <div className="action-icon">🆘</div>
                  <h3>Blood Requests</h3>
                  <p>View urgent blood requirements</p>
                </Link>
              </>
            )}

            {(user?.role === 'organizer' || user?.role === 'admin') && (
              <Link to="/requests/create" className="action-card">
                <div className="action-icon">📝</div>
                <h3>Create Request</h3>
                <p>Request blood for a patient</p>
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link to="/admin/users" className="action-card">
                <div className="action-icon">👤</div>
                <h3>Manage Accounts</h3>
                <p>Review account roles, access and login history</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

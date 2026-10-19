import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🩸</span>
          <span className="brand-text">SaveLife</span>
        </Link>

        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className="nav-link">
                Dashboard
              </NavLink>
              
              {user?.role === 'donor' && (
                <>
                  <NavLink to="/camps" className="nav-link">
                    Camps
                  </NavLink>
                  <NavLink to="/requests" className="nav-link">
                    Blood Requests
                  </NavLink>
                  <NavLink to="/donor/profile" className="nav-link">
                    My Profile
                  </NavLink>
                </>
              )}

              {user?.role === 'patient' && (
                <>
                  <NavLink to="/requests" className="nav-link">
                    My Requests
                  </NavLink>
                  <NavLink to="/requests/create" className="nav-link">
                    Request Blood
                  </NavLink>
                </>
              )}

              {(user?.role === 'organizer' || user?.role === 'admin') && (
                <>
                  <NavLink to="/camps" className="nav-link">
                    Manage Camps
                  </NavLink>
                  <NavLink to="/requests" className="nav-link">
                    Manage Requests
                  </NavLink>
                  <NavLink to="/donations/quick" className="nav-link">
                    Quick Donation
                  </NavLink>
                  <NavLink to="/donors" className="nav-link">
                    Donors
                  </NavLink>
                  <NavLink to="/inventory" className="nav-link">
                    Inventory
                  </NavLink>
                </>
              )}

              {user?.role === 'admin' && (
                <>
                  <NavLink to="/admin/users" className="nav-link">
                    User Management
                  </NavLink>
                  <NavLink to="/analytics" className="nav-link">
                    Analytics
                  </NavLink>
                  <NavLink to="/reports" className="nav-link">
                    Reports
                  </NavLink>
                </>
              )}

              <Link to="/profile" className="nav-user" aria-label="Open your account profile">
                <span className="nav-user-avatar">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="" />
                  ) : (
                    user?.name?.trim()?.charAt(0)?.toUpperCase() || '?'
                  )}
                </span>
                <span className="nav-user-copy">
                  <span className="user-name">{user?.name}</span>
                  <span className="user-role">{user?.role}</span>
                </span>
              </Link>

              <button onClick={handleLogout} className="btn btn-outline">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

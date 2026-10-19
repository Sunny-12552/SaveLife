import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LiveUpdatesTicker from './components/LiveUpdatesTicker';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DonorRegister from './pages/DonorRegister';
import DonorProfile from './pages/DonorProfile';
import UserProfile from './pages/UserProfile';
import DonorList from './pages/DonorList';
import CampList from './pages/CampList';
import CampCreate from './pages/CampCreate';
import CampDetails from './pages/CampDetails';
import CampInfo from './pages/CampInfo';
import RequestList from './pages/RequestList';
import RequestCreate from './pages/RequestCreate';
import RequestDetails from './pages/RequestDetails';
import QuickDonation from './pages/QuickDonation';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Inventory from './pages/Inventory';
import AdminUsers from './pages/AdminUsers';
import './styles/global.css';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="spinner"></div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <div className="spinner"></div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="spinner"></div>;
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

function AppRoutes() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/camp-info/:id" element={<CampInfo />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <UserProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/donor/register"
          element={
            <PrivateRoute>
              <DonorRegister />
            </PrivateRoute>
          }
        />
        <Route
          path="/donor/profile"
          element={
            <PrivateRoute>
              <DonorProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/donors"
          element={
            <PrivateRoute>
              <DonorList />
            </PrivateRoute>
          }
        />
        <Route
          path="/camps"
          element={
            <PrivateRoute>
              <CampList />
            </PrivateRoute>
          }
        />
        <Route
          path="/camps/create"
          element={
            <PrivateRoute>
              <CampCreate />
            </PrivateRoute>
          }
        />
        <Route
          path="/camps/:id/edit"
          element={
            <PrivateRoute>
              <CampCreate />
            </PrivateRoute>
          }
        />
        <Route
          path="/camps/:id"
          element={
            <PrivateRoute>
              <CampDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/requests"
          element={
            <PrivateRoute>
              <RequestList />
            </PrivateRoute>
          }
        />
        <Route
          path="/requests/create"
          element={
            <PrivateRoute>
              <RequestCreate />
            </PrivateRoute>
          }
        />
        <Route
          path="/requests/:id"
          element={
            <PrivateRoute>
              <RequestDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/donations/quick"
          element={
            <PrivateRoute>
              <QuickDonation />
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <Analytics />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <Reports />
            </PrivateRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <PrivateRoute>
              <Inventory />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
      </Routes>
      <LiveUpdatesTicker />
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

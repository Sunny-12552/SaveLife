import axios from 'axios';

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 ||
      (error.response?.status === 403 && error.response?.data?.code === 'ACCOUNT_DEACTIVATED')
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  requestPasswordHelp: (data) => api.post('/auth/password-help', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfileImage: (profileImage) => api.patch('/auth/profile/avatar', { profileImage }),
  getUsers: (params) => api.get('/auth/users', { params }),
  updateManagedUser: (id, data) => api.patch(`/auth/users/${id}`, data),
  getPasswordHelpRequests: () => api.get('/auth/password-help'),
  issuePasswordResetLink: (id) => api.post(`/auth/password-help/${id}/reset-link`),
};

export const appAPI = {
  getPublicConfig: () => api.get('/config/public'),
};

export const liveUpdatesAPI = {
  get: () => api.get('/live-updates'),
};

// Donor APIs
export const donorAPI = {
  register: (data) => api.post('/donors/register', data),
  getAll: (params) => api.get('/donors', { params }),
  getById: (id) => api.get(`/donors/${id}`),
  getMyProfile: () => api.get('/donors/me'),
  update: (id, data) => api.patch(`/donors/${id}`, data),
  delete: (id) => api.delete(`/donors/${id}`),
  checkEligibility: (id) => api.get(`/donors/${id}/eligibility`),
  searchByBloodGroup: (bloodGroup, params) => 
    api.get(`/donors/search/${bloodGroup}`, { params }),
};

// Camp APIs
export const campAPI = {
  create: (data) => api.post('/camps/create', data),
  getPublicById: (id) => api.get(`/camps/public/${id}`),
  getAll: (params) => api.get('/camps', { params }),
  getById: (id) => api.get(`/camps/${id}`),
  update: (id, data) => api.patch(`/camps/${id}`, data),
  delete: (id) => api.delete(`/camps/${id}`),
  register: (id) => api.post(`/camps/${id}/register`),
  markAttendance: (campId, donorId, data) => 
    api.patch(`/camps/${campId}/attendance/${donorId}`, data),
  getMyCamps: () => api.get('/camps/my-camps'),
  getUpcoming: (params) => api.get('/camps/upcoming', { params }),
};

// Request APIs
export const requestAPI = {
  create: (data) => api.post('/requests/create', data),
  getAll: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  update: (id, data) => api.patch(`/requests/${id}`, data),
  delete: (id) => api.delete(`/requests/${id}`),
  findMatchingDonors: (bloodGroup, params) => 
    api.get(`/requests/match/${bloodGroup}`, { params }),
  matchDonors: (id, data) => api.post(`/requests/${id}/match-donors`, data),
  updateDonorResponse: (requestId, donorId, data) => 
    api.patch(`/requests/${requestId}/donor/${donorId}`, data),
  getMyRequests: () => api.get('/requests/my-requests'),
  getUrgent: (params) => api.get('/requests/urgent', { params }),
};

// Donation APIs
export const donationAPI = {
  recordQuick: (data) => api.post('/donations/quick', data),
  getAll: (params) => api.get('/donations', { params }),
  issueCertificate: (donationId) => api.post(`/donations/${donationId}/certificate`),
  getMyCertificates: () => api.get('/donations/my-certificates'),
};

// Analytics APIs
export const analyticsAPI = {
  getDashboardStats: (params) => api.get('/analytics/dashboard', { params }),
  getDonorAnalytics: (params) => api.get('/analytics/donors', { params }),
  getCampAnalytics: (params) => api.get('/analytics/camps', { params }),
  getRequestAnalytics: (params) => api.get('/analytics/requests', { params }),
  getDonationAnalytics: (params) => api.get('/analytics/donations', { params }),
  generateReport: (params) => api.get('/analytics/report', {
    params,
    responseType: params.format === 'csv' ? 'blob' : 'json'
  }),
};

// Inventory APIs
export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getByBloodGroup: (bloodGroup) => api.get(`/inventory/${bloodGroup}`),
  getStats: () => api.get('/inventory/stats'),
  getHistory: (bloodGroup, params) => api.get(`/inventory/history/${bloodGroup}`, { params }),
  addUnits: (data) => api.post('/inventory/add', data),
  reserveUnits: (data) => api.post('/inventory/reserve', data),
  issueUnits: (data) => api.post('/inventory/issue', data),
  unreserveUnits: (data) => api.post('/inventory/unreserve', data),
  markExpired: (bloodGroup) => api.post(`/inventory/mark-expired/${bloodGroup}`),
  checkExpiry: () => api.post('/inventory/check-expiry'),
  discardUnits: (data) => api.post('/inventory/discard', data),
};

export default api;

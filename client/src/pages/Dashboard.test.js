import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { campAPI, donationAPI, donorAPI, requestAPI } from '../services/api';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'donor-user', name: 'Test Donor', role: 'donor' },
  }),
}));

jest.mock('../services/api', () => ({
  campAPI: {
    getUpcoming: jest.fn(),
    getMyCamps: jest.fn(),
  },
  requestAPI: {
    getUrgent: jest.fn(),
  },
  donorAPI: {
    getMyProfile: jest.fn(),
  },
  donationAPI: {
    getMyCertificates: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  campAPI.getUpcoming.mockResolvedValue({ data: { data: [] } });
  requestAPI.getUrgent.mockResolvedValue({ data: { data: [] } });
  campAPI.getMyCamps.mockRejectedValue({ response: { status: 404 } });
  donorAPI.getMyProfile.mockRejectedValue({ response: { status: 404 } });
  donationAPI.getMyCertificates.mockResolvedValue({ data: { data: [] } });
});

test('loads donor dashboard for a new donor without a profile or certificates', async () => {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

  expect(await screen.findByText('Welcome back, Test Donor.')).toBeInTheDocument();
  expect(screen.getByText('Complete your donor profile')).toBeInTheDocument();
  expect(screen.queryByText('Donation certificates')).not.toBeInTheDocument();

  await waitFor(() => {
    expect(donationAPI.getMyCertificates).toHaveBeenCalledTimes(1);
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CampList from './CampList';
import { appAPI, campAPI } from '../services/api';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'organizer-1', role: 'organizer' },
  }),
}));

jest.mock('../services/api', () => ({
  appAPI: { getPublicConfig: jest.fn() },
  campAPI: {
    getAll: jest.fn(),
    getById: jest.fn(),
    register: jest.fn(),
  },
}));

jest.mock('../components/CampMapPreview', () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
  appAPI.getPublicConfig.mockResolvedValue({ data: { frontendOrigin: 'http://localhost:3000' } });
  campAPI.getAll.mockResolvedValue({
    data: {
      data: {
        camps: [
          {
            _id: 'camp-1',
            name: 'Organizer Camp',
            description: 'A local blood donation event',
            status: 'upcoming',
            date: '2027-06-15',
            startTime: '09:00',
            endTime: '15:00',
            location: { city: 'Chennai', state: 'Tamil Nadu' },
            registeredDonors: [],
            capacity: 50,
            organizerId: { _id: 'organizer-1' },
            canEdit: false,
          },
        ],
      },
    },
  });
});

test('shows the camp edit action for its organizer even if a cached response lacks permission', async () => {
  render(
    <MemoryRouter>
      <CampList />
    </MemoryRouter>
  );

  expect(await screen.findByRole('link', { name: 'Edit Camp' }))
    .toHaveAttribute('href', '/camps/camp-1/edit');
});

test('does not show an edit action when the API denies permission', async () => {
  campAPI.getAll.mockImplementationOnce(async () => {
    const response = await Promise.resolve({
      data: {
        data: {
          camps: [{
            _id: 'camp-2',
            name: 'Another Organizer Camp',
            description: 'A local blood donation event',
            status: 'upcoming',
            date: '2027-06-15',
            startTime: '09:00',
            endTime: '15:00',
            location: { city: 'Chennai', state: 'Tamil Nadu' },
            registeredDonors: [],
            capacity: 50,
            canEdit: false,
          }],
        },
      },
    });
    return response;
  });

  render(
    <MemoryRouter>
      <CampList />
    </MemoryRouter>
  );

  expect(await screen.findByText('Another Organizer Camp')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Edit Camp' })).not.toBeInTheDocument();
});

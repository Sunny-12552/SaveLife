import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LiveUpdatesTicker from './LiveUpdatesTicker';
import { liveUpdatesAPI } from '../services/api';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

jest.mock('../services/api', () => ({
  liveUpdatesAPI: { get: jest.fn() },
}));

test('shows upcoming camps, fulfilled blood requests, and recent donations', async () => {
  liveUpdatesAPI.get.mockResolvedValue({
    data: {
      data: [
        {
          id: 'camp-1',
          kind: 'camp',
          icon: '🏕️',
          title: 'Upcoming blood donation camp',
          message: 'Community Camp',
          detail: '10/20/2026 · Chennai',
          link: '/camp-info/camp-1',
          linkLabel: 'View camp',
        },
        {
          id: 'request-1',
          kind: 'request',
          icon: '✅',
          title: 'Blood request fulfilled',
          message: 'O+ request filled — 2 units',
          detail: 'Chennai',
          link: '/requests',
          linkLabel: 'View requests',
        },
        {
          id: 'donation-1',
          kind: 'donation',
          icon: '🩸',
          title: 'A donor gave blood',
          message: '1 unit of A+ donated',
          detail: 'Community Camp',
          link: '/camp-info/camp-1',
          linkLabel: 'View camp',
        },
      ],
    },
  });

  render(
    <MemoryRouter>
      <LiveUpdatesTicker />
    </MemoryRouter>
  );

  expect((await screen.findAllByText('Community Camp')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('O+ request filled — 2 units').length).toBeGreaterThan(0);
  expect(screen.getAllByText('1 unit of A+ donated').length).toBeGreaterThan(0);
  expect(liveUpdatesAPI.get).toHaveBeenCalledTimes(1);
});

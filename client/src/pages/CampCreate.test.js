import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CampCreate from './CampCreate';
import { campAPI } from '../services/api';

jest.mock('../services/api', () => ({
  campAPI: {
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../components/CampLocationPicker', () => ({ onSelect }) => (
  <button type="button" onClick={() => onSelect(12.345678, 67.891234)}>
    Select map point
  </button>
));

const fillRequiredCampFields = () => {
  [
    ['name', 'Community Blood Camp'],
    ['description', 'Community donation event'],
    ['date', '2027-06-15'],
    ['startTime', '09:00'],
    ['endTime', '15:00'],
    ['capacity', '50'],
    ['location.venueName', 'Community Hall'],
    ['location.address', '12 Main Road'],
    ['location.city', 'Chennai'],
    ['location.state', 'Tamil Nadu'],
    ['contactInfo.phone', '9876543210'],
  ].forEach(([name, value]) => {
    fireEvent.change(document.querySelector(`[name="${name}"]`), { target: { value } });
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  campAPI.create.mockResolvedValue({ data: { data: { _id: 'camp-1' } } });
  campAPI.update.mockResolvedValue({ data: { data: { _id: 'camp-1' } } });
});

test('uses browser geolocation and submits the selected coordinates', async () => {
  const getCurrentPosition = jest.fn((success) => {
    success({ coords: { latitude: 13.0827, longitude: 80.2707 } });
  });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });

  render(
    <MemoryRouter>
      <CampCreate />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: /Use My Current Location/ }));
  expect(getCurrentPosition).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    expect.objectContaining({ enableHighAccuracy: true, timeout: 15000 })
  );
  expect(screen.getByLabelText('Latitude *')).toHaveValue(13.0827);
  expect(screen.getByLabelText('Longitude *')).toHaveValue(80.2707);

  fillRequiredCampFields();
  fireEvent.click(screen.getByRole('button', { name: 'Create Camp' }));

  await waitFor(() => {
    expect(campAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({
          coordinates: { latitude: 13.0827, longitude: 80.2707 },
        }),
      })
    );
  });
});

test('updates coordinates from a map selection and requires confirmation', async () => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: jest.fn() },
  });

  render(
    <MemoryRouter>
      <CampCreate />
    </MemoryRouter>
  );

  fillRequiredCampFields();
  fireEvent.click(screen.getByRole('button', { name: 'Select map point' }));
  expect(screen.getByLabelText('Latitude *')).toHaveValue(12.345678);
  expect(screen.getByLabelText('Longitude *')).toHaveValue(67.891234);

  fireEvent.click(screen.getByRole('button', { name: 'Confirm selected location' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create Camp' }));
  await waitFor(() => {
    expect(campAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({
          coordinates: { latitude: 12.345678, longitude: 67.891234 },
        }),
      })
    );
  });
});

test('shows a clear message when geolocation permission is denied', () => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (success, error) => error({ code: 1 }),
    },
  });

  render(
    <MemoryRouter>
      <CampCreate />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: /Use My Current Location/ }));
  expect(screen.getByRole('alert')).toHaveTextContent(/permission was denied/i);
});

test('explains when browser location is unavailable', () => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: undefined,
  });

  render(
    <MemoryRouter>
      <CampCreate />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: /Use My Current Location/ }));
  expect(screen.getByRole('alert')).toHaveTextContent(/not supported by this browser/i);
});

test('prevents submission when selected coordinates are outside valid ranges', () => {
  render(
    <MemoryRouter>
      <CampCreate />
    </MemoryRouter>
  );

  fillRequiredCampFields();
  fireEvent.click(screen.getByRole('button', { name: 'Select map point' }));
  fireEvent.change(screen.getByLabelText('Latitude *'), { target: { value: '90.1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm selected location' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create Camp' }));

  expect(screen.getByRole('alert')).toHaveTextContent(/valid latitude/i);
  expect(campAPI.create).not.toHaveBeenCalled();
});

test('loads existing camp details and saves edits through the update API', async () => {
  campAPI.getById.mockResolvedValue({
    data: {
      data: {
        _id: 'camp-1',
        name: 'Existing Camp',
        description: 'Original details',
        date: '2027-06-15T00:00:00.000Z',
        startTime: '09:00',
        endTime: '15:00',
        capacity: 45,
        location: {
          venueName: 'Original Hall',
          address: '12 Main Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          coordinates: { latitude: 13.08, longitude: 80.27 },
        },
        requirements: { bloodGroups: ['A+'], targetUnits: 20 },
        contactInfo: {
          phone: '9876543210',
          email: 'camp@example.com',
          coordinatorName: 'Organizer',
        },
        campImage: '',
      },
    },
  });

  render(
    <MemoryRouter initialEntries={['/camps/camp-1/edit']}>
      <Routes>
        <Route path="/camps/:id/edit" element={<CampCreate />} />
        <Route path="/camps/:id" element={<p>Camp saved</p>} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByDisplayValue('Existing Camp')).toBeInTheDocument();
  fireEvent.change(document.querySelector('[name="name"]'), {
    target: { value: 'Updated Camp Name' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

  await waitFor(() => {
    expect(campAPI.update).toHaveBeenCalledWith(
      'camp-1',
      expect.objectContaining({
        name: 'Updated Camp Name',
        location: expect.objectContaining({
          coordinates: { latitude: 13.08, longitude: 80.27 },
        }),
        requirements: expect.objectContaining({ bloodGroups: ['A+'], targetUnits: 20 }),
      })
    );
  });
  expect(await screen.findByText('Camp saved')).toBeInTheDocument();
});

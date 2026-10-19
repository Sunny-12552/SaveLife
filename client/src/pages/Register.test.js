import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: jest.fn() }),
}));

jest.mock('../services/api', () => ({
  authAPI: { register: jest.fn() },
}));

test('offers donor, patient, camp creator, and administrator signup roles', () => {
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

  expect(screen.getByRole('option', { name: 'Donor' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Patient / Person in need' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Camp Creator / Organizer' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Administrator' })).toBeInTheDocument();
});

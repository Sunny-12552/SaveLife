import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { authAPI } from '../services/api';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: jest.fn() }),
}));

jest.mock('../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    requestPasswordHelp: jest.fn(),
  },
}));

test('submits a help request with registered email and phone', async () => {
  authAPI.requestPasswordHelp.mockResolvedValue({
    data: { message: 'If an account uses that email, an administrator can review the help request.' },
  });

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Forgot your password? Ask an administrator' }));
  fireEvent.change(screen.getByLabelText('Account email'), {
    target: { value: 'person@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Phone country code'), {
    target: { value: '+91' },
  });
  fireEvent.change(screen.getByLabelText('Registered phone number'), {
    target: { value: '9876543210' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send password help request' }));

  await waitFor(() => {
    expect(authAPI.requestPasswordHelp).toHaveBeenCalledWith({
      email: 'person@example.com',
      phone: '+919876543210',
      message: '',
    });
  });
  expect(await screen.findByRole('status')).toHaveTextContent('If an account uses that email');
});

import { render, screen } from '@testing-library/react';
import CampMapPreview from './CampMapPreview';

const location = {
  venueName: 'Community Hall',
  address: '12 Main Road',
  city: 'Chennai',
  state: 'Tamil Nadu',
  zipCode: '600001',
};

test('uses an address-based map and search link when coordinates are unavailable', () => {
  render(<CampMapPreview location={location} variant="preview" />);

  expect(screen.getByTitle('Map showing Community Hall, Chennai, Tamil Nadu'))
    .toHaveAttribute('src', expect.stringContaining('maps.google.com/maps?q='));
  expect(screen.getByRole('link', { name: 'Open in Google Maps' }))
    .toHaveAttribute('href', expect.stringContaining('12%20Main%20Road'));
});

test('accepts zero-valued coordinates as a valid map location', () => {
  render(
    <CampMapPreview
      location={{ ...location, coordinates: { latitude: 0, longitude: 0 } }}
      variant="preview"
    />
  );

  expect(screen.getByTitle('Map showing Community Hall, Chennai, Tamil Nadu'))
    .toHaveAttribute('src', expect.stringContaining('openstreetmap.org/export/embed.html'));
  expect(screen.getByRole('link', { name: 'Open in Google Maps' }))
    .toHaveAttribute('href', expect.stringContaining('query=0%2C0'));
});

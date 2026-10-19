import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CampPoster from './CampPoster';

jest.mock('qrcode.react', () => ({
  QRCodeCanvas: jest.requireActual('react').forwardRef(({ className, title }, ref) =>
    jest.requireActual('react').createElement('canvas', { className, title, ref })
  ),
}));

test('composites a location QR into the complete camp image', async () => {
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: jest.fn(),
    fillRect: jest.fn(),
  });
  jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/png;base64,composite'
  );

  const { container } = render(
    <CampPoster
      campImage="data:image/png;base64,aGVsbG8="
      campId="camp-123"
      campName="Community Camp"
      shareOrigin="https://savelife.example"
    />
  );

  const sourceImage = container.querySelector('.camp-poster-source');
  Object.defineProperty(sourceImage, 'naturalWidth', { configurable: true, value: 800 });
  Object.defineProperty(sourceImage, 'naturalHeight', { configurable: true, value: 600 });
  fireEvent.load(sourceImage);

  const posterLink = await screen.findByRole('link', {
    name: 'Camp poster for Community Camp, with an embedded QR code linking to camp location',
  });
  expect(posterLink).toHaveAttribute('href', 'https://savelife.example/camp-info/camp-123');
  expect(posterLink.querySelector('img')).toHaveAttribute(
    'src',
    'data:image/png;base64,composite'
  );
  await waitFor(() => expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalled());
});

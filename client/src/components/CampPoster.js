import React, { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './CampPoster.css';

const CampPoster = ({ campImage, campId, campName, shareOrigin, qrSize = 88 }) => {
  const origin = (shareOrigin || window.location.origin).replace(/\/+$/, '');
  const campInfoUrl = `${origin}/camp-info/${campId}`;
  const imageRef = useRef(null);
  const qrRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [posterData, setPosterData] = useState('');

  useEffect(() => {
    const image = imageRef.current;
    const qrCanvas = qrRef.current;
    if (!imageLoaded || !image?.naturalWidth || !image?.naturalHeight || !qrCanvas) return;

    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const quietZone = Math.max(8, Math.round(Math.min(canvas.width, canvas.height) * 0.018));
    const qrSide = Math.min(
      Math.round(Math.min(canvas.width, canvas.height) * 0.34),
      Math.min(canvas.width, canvas.height) - quietZone * 4
    );
    const x = canvas.width - qrSide - quietZone * 2;
    const y = canvas.height - qrSide - quietZone * 2;

    context.fillStyle = 'rgba(255, 255, 255, 0.96)';
    context.fillRect(x - quietZone, y - quietZone, qrSide + quietZone * 2, qrSide + quietZone * 2);
    context.drawImage(qrCanvas, x, y, qrSide, qrSide);
    setPosterData(canvas.toDataURL('image/png'));
  }, [campInfoUrl, imageLoaded, qrSize]);

  return (
    <div className="camp-poster">
      <img
        ref={imageRef}
        className="camp-poster-source"
        src={campImage}
        alt=""
        onLoad={() => setImageLoaded(true)}
        aria-hidden="true"
      />
      {posterData ? (
        <a
          className="camp-poster-composite"
          href={campInfoUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Camp poster for ${campName}, with an embedded QR code linking to camp location`}
          title="Scan the QR code embedded in this camp image to open its details and location"
        >
          <img src={posterData} alt={`${campName} blood donation camp poster with embedded location QR code`} />
        </a>
      ) : (
        <img className="camp-poster-loading" src={campImage} alt={`${campName} blood donation camp`} />
      )}
      <QRCodeCanvas
        ref={qrRef}
        className="camp-poster-qr-source"
        value={campInfoUrl}
        size={Math.max(qrSize, 1024)}
        level="H"
        includeMargin
        title={`QR code for ${campName} camp location`}
      />
    </div>
  );
};

export default CampPoster;

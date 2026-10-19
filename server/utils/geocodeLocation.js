let geocodeQueue = Promise.resolve();
let lastRequestAt = 0;

const geocodeLocation = async (location) => {
  const address = [
    location.venueName,
    location.address,
    location.landmark,
    location.city,
    location.state,
    location.zipCode,
  ]
    .filter(Boolean)
    .join(', ');

  const request = geocodeQueue.then(async () => {
    const delay = Math.max(0, 1000 - (Date.now() - lastRequestAt));
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    lastRequestAt = Date.now();

    const params = new URLSearchParams({
      q: address,
      format: 'jsonv2',
      limit: '1',
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'User-Agent': 'SaveLifeCampManager/1.0',
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      throw new Error(`Location lookup returned ${response.status}`);
    }

    const results = await response.json();
    if (results.length === 0) return null;

    return {
      latitude: Number(results[0].lat),
      longitude: Number(results[0].lon),
    };
  });

  geocodeQueue = request.then(() => undefined, () => undefined);
  return request;
};

export default geocodeLocation;

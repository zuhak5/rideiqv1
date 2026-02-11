export function geohash6(lat: number, lng: number): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  const latInterval = [-90.0, 90.0];
  const lngInterval = [-180.0, 180.0];
  let geohash = '';
  let bits = 0;
  let bit = 0;
  let even = true;

  while (geohash.length < 6) {
    if (even) {
      const mid = (lngInterval[0] + lngInterval[1]) / 2;
      if (lng > mid) {
        bits = (bits << 1) + 1;
        lngInterval[0] = mid;
      } else {
        bits = bits << 1;
        lngInterval[1] = mid;
      }
    } else {
      const mid = (latInterval[0] + latInterval[1]) / 2;
      if (lat > mid) {
        bits = (bits << 1) + 1;
        latInterval[0] = mid;
      } else {
        bits = bits << 1;
        latInterval[1] = mid;
      }
    }

    even = !even;
    if (++bit === 5) {
      geohash += base32[bits];
      bit = 0;
      bits = 0;
    }
  }

  return geohash;
}


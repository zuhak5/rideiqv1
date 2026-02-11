const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Standard base32 geohash encoding (no deps).
 *
 * Precision guidance:
 * - 6 chars ~ neighborhood scale (good for "nearby drivers" invalidation channels)
 */
export function encodeGeohash(lat: number, lng: number, precision: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('geohash_invalid_coords');
  }

  const prec = Math.max(1, Math.min(12, Math.trunc(precision)));

  let latMin = -90.0;
  let latMax = 90.0;
  let lngMin = -180.0;
  let lngMax = 180.0;

  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let out = '';

  while (out.length < prec) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        idx = (idx << 1) + 1;
        lngMin = mid;
      } else {
        idx = (idx << 1);
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = (idx << 1) + 1;
        latMin = mid;
      } else {
        idx = (idx << 1);
        latMax = mid;
      }
    }

    evenBit = !evenBit;

    bit++;
    if (bit === 5) {
      out += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }

  return out;
}


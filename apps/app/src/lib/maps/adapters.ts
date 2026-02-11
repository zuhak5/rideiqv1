export type MapsProvider = 'google' | 'mapbox' | 'here' | 'thunderforest' | 'ors';

export type MapsRenderConfig = {
  provider: MapsProvider;
  config: Record<string, unknown> & { language: string; region: string };
};

export type LatLng = { lat: number; lng: number };

export interface RendererAdapter {
  provider: MapsProvider;
  buildEmbedUrl(center: LatLng, config: MapsRenderConfig['config']): string | null;
}

const googleAdapter: RendererAdapter = {
  provider: 'google',
  buildEmbedUrl(center, config) {
    const key = String(config.apiKey ?? '');
    if (!key) return null;
    const url = new URL('https://www.google.com/maps/embed/v1/view');
    url.searchParams.set('key', key);
    url.searchParams.set('center', `${center.lat},${center.lng}`);
    url.searchParams.set('zoom', '14');
    url.searchParams.set('language', String(config.language ?? 'en'));
    return url.toString();
  },
};

const mapboxAdapter: RendererAdapter = {
  provider: 'mapbox',
  buildEmbedUrl(center, config) {
    const token = String(config.token ?? '');
    if (!token) return null;
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${center.lng},${center.lat},14/900x480?access_token=${encodeURIComponent(token)}`;
  },
};

const hereAdapter: RendererAdapter = {
  provider: 'here',
  buildEmbedUrl(center, config) {
    const key = String(config.apiKey ?? '');
    if (!key) return null;
    const url = new URL('https://image.maps.ls.hereapi.com/mia/1.6/mapview');
    url.searchParams.set('apiKey', key);
    url.searchParams.set('c', `${center.lat},${center.lng}`);
    url.searchParams.set('z', '14');
    url.searchParams.set('w', '900');
    url.searchParams.set('h', '480');
    url.searchParams.set('lg', String(config.language ?? 'en'));
    return url.toString();
  },
};

const thunderforestAdapter: RendererAdapter = {
  provider: 'thunderforest',
  buildEmbedUrl() {
    return null;
  },
};

const orsAdapter: RendererAdapter = {
  provider: 'ors',
  buildEmbedUrl() {
    return null;
  },
};

const adapters: Record<MapsProvider, RendererAdapter> = {
  google: googleAdapter,
  mapbox: mapboxAdapter,
  here: hereAdapter,
  thunderforest: thunderforestAdapter,
  ors: orsAdapter,
};

export function adapterFor(provider: MapsProvider): RendererAdapter {
  return adapters[provider];
}


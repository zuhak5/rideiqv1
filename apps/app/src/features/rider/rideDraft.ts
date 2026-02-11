export type RideDraft = {
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress: string;
  productCode: string;
};

export function rideDraftFromParams(params: URLSearchParams): RideDraft | null {
  const pickupLat = Number(params.get('pickupLat'));
  const pickupLng = Number(params.get('pickupLng'));
  const dropoffLat = Number(params.get('dropoffLat'));
  const dropoffLng = Number(params.get('dropoffLng'));

  if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng) || !Number.isFinite(dropoffLat) || !Number.isFinite(dropoffLng)) {
    return null;
  }

  return {
    pickupLat,
    pickupLng,
    pickupAddress: params.get('pickupAddress') ?? '',
    dropoffLat,
    dropoffLng,
    dropoffAddress: params.get('dropoffAddress') ?? '',
    productCode: params.get('productCode') ?? 'standard',
  };
}

export function rideDraftToQuery(draft: RideDraft): string {
  const params = new URLSearchParams();
  params.set('pickupLat', String(draft.pickupLat));
  params.set('pickupLng', String(draft.pickupLng));
  params.set('pickupAddress', draft.pickupAddress);
  params.set('dropoffLat', String(draft.dropoffLat));
  params.set('dropoffLng', String(draft.dropoffLng));
  params.set('dropoffAddress', draft.dropoffAddress);
  params.set('productCode', draft.productCode);
  return params.toString();
}


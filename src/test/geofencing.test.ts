import { describe, expect, it } from 'vitest';
import { OfficeLocation } from '../types';
import { findMatchingOfficeLocation } from '../utils/geofencing';

const office = (name: string, lat: number, lng: number, radius: number): OfficeLocation => ({
  name,
  lat,
  lng,
  radius,
});

describe('findMatchingOfficeLocation', () => {
  it('returns the office name for a position inside its radius', () => {
    const locations = [office('Bureau central', 0, 0, 1500)];

    expect(findMatchingOfficeLocation(0, 0.01, locations)?.name).toBe('Bureau central');
  });

  it('returns no office when the position is outside every radius', () => {
    const locations = [office('Bureau central', 0, 0, 1500)];

    expect(findMatchingOfficeLocation(0, 0.02, locations)).toBeUndefined();
  });

  it('includes a position exactly on the radius boundary', () => {
    const longitude = 0.01;
    const radius = 6_371_000 * longitude * Math.PI / 180;
    const locations = [office('Bureau central', 0, 0, radius)];

    expect(findMatchingOfficeLocation(0, longitude, locations)?.name).toBe('Bureau central');
  });

  it('chooses the nearest office when geofences overlap', () => {
    const locations = [
      office('Bureau éloigné', 0, 0.01, 2000),
      office('Bureau proche', 0, 0.009, 2000),
    ];

    expect(findMatchingOfficeLocation(0, 0.01, locations)?.name).toBe('Bureau éloigné');
  });

  it('ignores invalid geofence values', () => {
    const locations = [
      office('Rayon invalide', 0, 0, Number.NaN),
      office('Coordonnées invalides', Number.NaN, 0, 1000),
    ];

    expect(findMatchingOfficeLocation(0, 0, locations)).toBeUndefined();
  });
});
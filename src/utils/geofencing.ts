import { OfficeLocation } from '../types';

const EARTH_RADIUS_METERS = 6_371_000;
const DISTANCE_TOLERANCE_METERS = 0.001;

const distanceInMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lng2 - lng1);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const findMatchingOfficeLocation = (
  latitude: number,
  longitude: number,
  locations: OfficeLocation[]
): OfficeLocation | undefined => locations
  .filter(location =>
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng) &&
    Number.isFinite(location.radius) &&
    location.radius >= 0 &&
    distanceInMeters(latitude, longitude, location.lat, location.lng) <= location.radius + DISTANCE_TOLERANCE_METERS
  )
  .sort((first, second) =>
    distanceInMeters(latitude, longitude, first.lat, first.lng) -
    distanceInMeters(latitude, longitude, second.lat, second.lng)
  )[0];
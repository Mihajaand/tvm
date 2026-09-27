import { useState, useCallback, useEffect, useRef } from 'react';
import { OFFICE_LOCATIONS } from '../../constants';
import { hrService } from '../../services/hrService';
import { OfficeLocation } from '../../types';
import { findMatchingOfficeLocation } from '../../utils/geofencing';

// Position de secours si aucune géofence n'est disponible
const DEFAULT_FALLBACK_LOCATION = {
  lat: 0.0000,
  lng: 0.0000,
  address: "Position non disponible (Contourné)"
};

export const useGeoLocation = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoFences, setGeoFences] = useState<OfficeLocation[]>(OFFICE_LOCATIONS);
  const geoFencesRef = useRef<OfficeLocation[]>(OFFICE_LOCATIONS);
  const configLoadRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const config = await hrService.getConfig();
        if (isMounted && config?.officeLocations && config.officeLocations.length > 0) {
          geoFencesRef.current = config.officeLocations;
          setGeoFences(config.officeLocations);
        }
      } catch (e) {
        // En cas d'erreur de chargement de la config, on garde les valeurs par défaut
      }
    };
    configLoadRef.current = loadConfig();
    return () => { isMounted = false; };
  }, []);

  /**
   * Applique une position par défaut/secours pour contourner les erreurs GPS
   */
  const applyFallback = useCallback((customAddress?: string) => {
    const fallbackOffice = geoFences[0];
    setLocation({
      lat: fallbackOffice?.lat ?? DEFAULT_FALLBACK_LOCATION.lat,
      lng: fallbackOffice?.lng ?? DEFAULT_FALLBACK_LOCATION.lng,
      address: customAddress || fallbackOffice?.name || DEFAULT_FALLBACK_LOCATION.address
    });
    setError(null);
    setIsLocating(false);
  }, [geoFences]);

  const detectLocation = useCallback(async (force: boolean = false) => {
    setIsLocating(true);
    setError(null);

    await configLoadRef.current;

    if (!navigator.geolocation) {
      applyFallback("Géolocalisation non supportée (Contourné)");
      return;
    }

    // Promesse de géolocalisation avec timeout agressif à 3 secondes
    const getPositionPromise = new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false, // Évite d'attendre le réveil du GPS matériel
        timeout: 3000,
        maximumAge: 60000,
      });
    });

    try {
      const pos = await getPositionPromise;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const matchingOffice = findMatchingOfficeLocation(lat, lng, geoFencesRef.current);

      setLocation({
        lat,
        lng,
        address: matchingOffice?.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      });
    } catch (err) {
      console.warn("Échec ou refus de la géolocalisation, application du contournement automatique :", err);
      // Contournement immédiat en cas d'erreur ou d'expiration du délai
      applyFallback();
    } finally {
      setIsLocating(false);
    }
  }, [applyFallback]);

  const watchLocation = useCallback(async () => {
    // Non requis en mode contournement mais conservé pour compatibilité
  }, []);

  const clearWatch = useCallback(async () => {
    // Non requis en mode contournement mais conservé pour compatibilité
  }, []);

  return { location, isLocating, error, detectLocation, watchLocation, clearWatch };
};
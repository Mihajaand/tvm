import React, { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { LocateFixed, Loader2, Search } from 'lucide-react';
import { OfficeLocation } from '../../types';
import 'leaflet/dist/leaflet.css';
import './officeLocationMap.css';

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125];
const COLORS = ['#0f766e', '#2563eb', '#d97706', '#7c3aed', '#e11d48'];

interface Props {
  locations: OfficeLocation[];
  interactive?: boolean;
  onLocationChange?: (latitude: number, longitude: number) => void;
  onLocationSelect?: (index: number) => void;
  heightClass?: string;
}

const isValidLocation = (location: OfficeLocation) =>
  Number.isFinite(location.lat) &&
  Number.isFinite(location.lng) &&
  location.lat >= -90 &&
  location.lat <= 90 &&
  location.lng >= -180 &&
  location.lng <= 180 &&
  Number.isFinite(location.radius) &&
  location.radius > 0;

const createPinIcon = (index: number, color: string) => L.divIcon({
  className: 'office-map-pin-wrapper',
  html: `<span class="office-map-pin" style="--pin-color:${color}"><span>${index + 1}</span></span>`,
  iconSize: [32, 38],
  iconAnchor: [16, 34],
});

const FitLocations: React.FC<{ locations: OfficeLocation[] }> = ({ locations }) => {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) {
      map.setView(DEFAULT_CENTER, 13);
      return;
    }

    const bounds = L.latLngBounds([]);
    locations.forEach(location => {
      bounds.extend(L.latLng(location.lat, location.lng).toBounds(location.radius * 2));
    });

    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
  }, [locations, map]);

  return null;
};

const ClickToSelect: React.FC<{ onSelect?: (lat: number, lng: number) => void }> = ({ onSelect }) => {
  useMapEvents({
    click(event) {
      onSelect?.(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
};

const OfficeLocationMap: React.FC<Props> = ({
  locations,
  interactive = false,
  onLocationChange,
  onLocationSelect,
  heightClass = 'h-[380px]',
}) => {
  const [address, setAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState('');

  const visibleLocations = useMemo(() => locations.filter(isValidLocation), [locations]);
  const firstLocation = visibleLocations[0];
  const center: [number, number] = firstLocation
    ? [firstLocation.lat, firstLocation.lng]
    : DEFAULT_CENTER;

  const searchAddress = async () => {
    const query = address.trim();
    if (!query) {
      setMessage('Saisissez une adresse ou un lieu à rechercher.');
      return;
    }

    setIsSearching(true);
    setMessage('');
    try {
      const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1' });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) throw new Error('Le service de recherche est momentanément indisponible.');

      const results: Array<{ lat: string; lon: string; display_name: string }> = await response.json();
      const result = results[0];
      if (!result) {
        setMessage('Aucun lieu trouvé. Essayez une adresse plus précise.');
        return;
      }

      onLocationChange?.(Number(result.lat), Number(result.lon));
      setMessage(result.display_name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'La recherche du lieu a échoué.');
    } finally {
      setIsSearching(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('La géolocalisation n’est pas disponible dans ce navigateur.');
      return;
    }

    setIsLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      position => {
        onLocationChange?.(position.coords.latitude, position.coords.longitude);
        setIsLocating(false);
      },
      error => {
        const errorMessage = error.code === error.PERMISSION_DENIED
          ? 'Autorisez la géolocalisation dans votre navigateur, ou choisissez un point sur la carte.'
          : error.code === error.TIMEOUT
            ? 'La recherche de votre position a expiré. Réessayez ou choisissez un point sur la carte.'
            : 'Votre position est indisponible. Choisissez un point sur la carte.';
        setMessage(errorMessage);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {interactive && (
        <div className="space-y-3 border-b border-slate-100 bg-slate-50/80 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div role="search" className="flex min-w-0 flex-1 gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Rechercher une adresse</span>
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={address}
                  onChange={event => setAddress(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void searchAddress();
                    }
                  }}
                  placeholder="Rechercher une adresse ou un lieu"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-light"
                />
              </label>
              <button
                type="button"
                onClick={() => void searchAddress()}
                disabled={isSearching}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {isSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                <span className="hidden sm:inline">Chercher</span>
              </button>
            </div>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={isLocating}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-bold text-teal-800 transition hover:bg-teal-100 disabled:opacity-60"
            >
              {isLocating ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />}
              Ma position
            </button>
          </div>
          <p aria-live="polite" className={`min-h-4 text-xs ${message ? 'text-amber-700' : 'text-slate-500'}`}>
            {message || 'Cliquez sur la carte pour placer le centre, ou faites glisser le repère.'}
          </p>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={interactive}
        className={`office-location-map w-full ${heightClass}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitLocations locations={visibleLocations} />
        {interactive && <ClickToSelect onSelect={onLocationChange} />}
        {visibleLocations.map(location => {
          const index = locations.indexOf(location);
          const color = COLORS[index % COLORS.length];
          return (
            <React.Fragment key={`${location.name}-${index}`}>
              <Circle
                center={[location.lat, location.lng]}
                radius={location.radius}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.14, weight: 2 }}
              />
              <Marker
                position={[location.lat, location.lng]}
                icon={createPinIcon(index, color)}
                draggable={interactive}
                eventHandlers={{
                  click: () => onLocationSelect?.(index),
                  ...(interactive && onLocationChange
                    ? {
                        dragend: event => {
                          const marker = event.target as L.Marker;
                          const position = marker.getLatLng();
                          onLocationChange(position.lat, position.lng);
                        },
                      }
                    : {}),
                }}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>
    </section>
  );
};

export default OfficeLocationMap;

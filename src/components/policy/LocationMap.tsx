import { useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

mapboxgl.accessToken =
  'pk.eyJ1IjoiY29rZXRyYWRlciIsImEiOiJjbWxjYTVjankwbXJ0M2NzYWRjaG9nMDhiIn0.UU8hvEfVygwvoayDb8kyrQ';

interface LocationMapProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
  onReverseGeocode?: (placeName: string) => void;
}

export default function LocationMap({ lat, lng, onLocationChange, onReverseGeocode }: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const updateMarker = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      if (!map.current) return;
      if (marker.current) {
        marker.current.setLngLat(lngLat);
      } else {
        marker.current = new mapboxgl.Marker({
          color: 'hsl(160, 84%, 39%)',
        })
          .setLngLat(lngLat)
          .addTo(map.current);
      }
    },
    [],
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: 9,
      attributionControl: false,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'top-right',
    );

    updateMarker({ lng, lat });

    map.current.on('click', async (e) => {
      const { lng: clickLng, lat: clickLat } = e.lngLat;
      const roundedLat = parseFloat(clickLat.toFixed(4));
      const roundedLng = parseFloat(clickLng.toFixed(4));
      updateMarker({ lng: clickLng, lat: clickLat });
      onLocationChange(roundedLat, roundedLng);

      // Reverse geocode the clicked point
      if (onReverseGeocode) {
        try {
          const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/geocode`;
          const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const headers: Record<string, string> = { apikey, 'Content-Type': 'application/json' };
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
          const res = await fetch(
            `${baseUrl}?lat=${roundedLat}&lng=${roundedLng}`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            const placeName = data.features?.[0]?.place_name;
            if (placeName) onReverseGeocode(placeName);
          }
        } catch {
          // Silently fail reverse geocoding
        }
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker when lat/lng props change externally
  useEffect(() => {
    if (!map.current) return;
    const currentCenter = map.current.getCenter();
    const dist = Math.abs(currentCenter.lng - lng) + Math.abs(currentCenter.lat - lat);
    if (dist > 0.01) {
      map.current.flyTo({ center: [lng, lat], zoom: 9, duration: 1000 });
      updateMarker({ lng, lat });
    }
  }, [lat, lng, updateMarker]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-[280px] rounded-lg overflow-hidden border border-border/50"
    />
  );
}

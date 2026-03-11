import { useRef, useCallback } from 'react';
import { useMapEvents } from 'react-leaflet';
import type L from 'leaflet';

export interface MapViewport {
  zoom: number;
  bounds: L.LatLngBounds | null;
  bboxString: string | null;
}

export type ZoomTier = 'city' | 'region' | 'street';

export function getZoomTier(zoom: number): ZoomTier {
  if (zoom <= 11) return 'city';
  if (zoom <= 13) return 'region';
  return 'street';
}

interface Props {
  onViewportChange: (viewport: MapViewport) => void;
}

function boundsToString(bounds: L.LatLngBounds): string {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;
}

/**
 * Null-rendering component that tracks map zoom and bounds.
 * Place inside <MapContainer>.
 */
export function MapViewportTracker({ onViewportChange }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMove = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;
      const bounds = map.getBounds();
      onViewportChange({
        zoom: map.getZoom(),
        bounds,
        bboxString: boundsToString(bounds),
      });
    }, 200);
  }, [onViewportChange]);

  const mapRef = useRef<L.Map | null>(null);

  useMapEvents({
    moveend(e) {
      mapRef.current = e.target;
      handleMove();
    },
    zoomend(e) {
      mapRef.current = e.target;
      handleMove();
    },
    load(e) {
      // Emit initial viewport on map load
      mapRef.current = e.target;
      const bounds = e.target.getBounds();
      onViewportChange({
        zoom: e.target.getZoom(),
        bounds,
        bboxString: boundsToString(bounds),
      });
    },
  });

  return null;
}

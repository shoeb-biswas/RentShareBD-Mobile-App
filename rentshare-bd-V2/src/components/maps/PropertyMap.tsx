import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapMarkerItem {
  name: string;
  type: string;
  lat: number;
  lng: number;
  distanceKm?: number;
}

export function PropertyMap({
  latitude,
  longitude,
  title,
  landmarks = [],
}: {
  latitude: number;
  longitude: number;
  title: string;
  landmarks?: MapMarkerItem[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 14,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Primary property marker using clean circleMarker so no external marker PNG breaks
    L.circleMarker([latitude, longitude], {
      radius: 10,
      fillColor: '#4F46E5',
      color: '#FFFFFF',
      weight: 3,
      opacity: 1,
      fillOpacity: 1,
    })
      .addTo(map)
      .bindPopup(`<strong>${title}</strong><br/>Property Location`)
      .openPopup();

    for (const lm of landmarks) {
      L.circleMarker([lm.lat, lm.lng], {
        radius: 6,
        fillColor: '#0D9488',
        color: '#FFFFFF',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      })
        .addTo(map)
        .bindPopup(
          `<strong>${lm.name}</strong><br/>${lm.type}${
            lm.distanceKm !== undefined ? ` · ${lm.distanceKm} km away` : ''
          }`
        );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, title, landmarks]);

  return (
    <div
      ref={containerRef}
      className="w-full h-72 rounded-xl border border-slate-200 overflow-hidden bg-slate-100"
      aria-label={`Map showing ${title} and nearby Dhaka landmarks`}
    />
  );
}

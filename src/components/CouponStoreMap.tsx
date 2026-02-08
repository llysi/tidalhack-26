"use client";

import { useEffect, useRef } from "react";
import type { SnapRetailer } from "@/lib/usda-snap";

interface Props {
  stores: SnapRetailer[];
  activeStore?: string;
  onSelectStore?: (name: string) => void;
  userLat?: number;
  userLng?: number;
}

export default function CouponStoreMap({ stores, activeStore, onSelectStore, userLat, userLng }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMap = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || stores.length === 0) return;
    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
    }

    // Dynamically import leaflet (client-only)
    import("leaflet").then((L) => {
      // Fix default marker icons for Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const centerLat = userLat ?? stores[0].lat;
      const centerLng = userLng ?? stores[0].lng;

      const map = L.map(mapRef.current!, { zoomControl: true }).setView([centerLat, centerLng], 13);
      leafletMap.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      // User location marker
      if (userLat && userLng) {
        const userIcon = L.divIcon({
          html: '<div style="width:12px;height:12px;border-radius:50%;background:#074a30;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>',
          className: "",
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        L.marker([userLat, userLng], { icon: userIcon }).addTo(map).bindPopup("You");
      }

      // Store markers
      stores.forEach((s) => {
        if (!s.lat || !s.lng) return;
        const marker = L.marker([s.lat, s.lng])
          .addTo(map)
          .bindPopup(`<strong>${s.name}</strong><br/>${s.address}`);
        if (onSelectStore) {
          marker.on("click", () => onSelectStore(s.name));
        }
      });
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores, userLat, userLng]);

  // Highlight active store marker when activeStore changes
  useEffect(() => {
    if (!leafletMap.current || !activeStore) return;
    import("leaflet").then((L) => {
      const store = stores.find((s) =>
        s.name.toLowerCase().includes(activeStore.toLowerCase().split(" ")[0])
      );
      if (store?.lat && store?.lng) {
        leafletMap.current.setView([store.lat, store.lng], 15, { animate: true });
        // Open popup for the matched marker
        leafletMap.current.eachLayer((layer: unknown) => {
          const l = layer as { getLatLng?: () => { lat: number; lng: number }; openPopup?: () => void };
          if (l.getLatLng && l.openPopup) {
            const pos = l.getLatLng!();
            if (Math.abs(pos.lat - store.lat) < 0.0001 && Math.abs(pos.lng - store.lng) < 0.0001) {
              l.openPopup!();
            }
          }
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore]);

  if (stores.length === 0) return null;

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} className="w-full h-full rounded-xl" />
    </>
  );
}

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo } from "react";

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Mock geocoding data for the demo
const LOCATION_COORDS = {
  "Mumbai": [19.076, 72.8777],
  "Delhi": [28.6139, 77.209],
  "Bangalore": [12.9716, 77.5946],
  "Bengaluru": [12.9716, 77.5946],
  "New York": [40.7128, -74.006],
  "San Francisco": [37.7749, -122.4194],
  "London": [51.5074, -0.1278],
  "Dubai": [25.2048, 55.2708],
  "Singapore": [1.3521, 103.8198],
  "Sydney": [-33.8688, 151.2093],
  "Toronto": [43.6532, -79.3832],
  "Berlin": [52.52, 13.405],
  "Paris": [48.8566, 2.3522],
  "Tokyo": [35.6762, 139.6503],
};

export function AlumniMap({ members = [] }) {
  const points = useMemo(() => {
    return members
      .map((m) => {
        const loc = String(m.location || "").split(",")[0].trim();
        const coords = LOCATION_COORDS[loc];
        if (!coords) return null;
        return {
          id: m._id,
          name: m.userId?.name || "Member",
          position: coords,
          locationName: m.location,
        };
      })
      .filter(Boolean);
  }, [members]);

  return (
    <div className="alumni-map-container" style={{ height: "600px", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--ui-border)" }}>
      <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={40}
          showCoverageOnHover={false}
          iconCreateFunction={(cluster) => {
            const count = cluster.getChildCount();
            let color = "#10b981"; // Green for small
            if (count > 10) color = "#f59e0b"; // Orange for medium
            if (count > 50) color = "#ef4444"; // Red for large

            return L.divIcon({
              html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid rgba(255,255,255,0.5); box-shadow: 0 0 10px rgba(0,0,0,0.2);">${count}</div>`,
              className: "custom-marker-cluster",
              iconSize: L.point(36, 36),
            });
          }}
        >
          {points.map((point) => (
            <Marker key={point.id} position={point.position}>
              <Popup>
                <strong>{point.name}</strong>
                <br />
                {point.locationName}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

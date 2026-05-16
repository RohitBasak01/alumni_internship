import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, useState, useEffect, useCallback } from "react";

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

// Fallback Geocoding data for common Indian cities if coordinates are missing
const FALLBACK_LOCATION_COORDS = {
  Mumbai: [19.076, 72.8777], Delhi: [28.6139, 77.209], "New Delhi": [28.6139, 77.209], Bangalore: [12.9716, 77.5946], Bengaluru: [12.9716, 77.5946], Pune: [18.5204, 73.8567], Hyderabad: [17.385, 78.4867], Chennai: [13.0827, 80.2707], Kolkata: [22.5726, 88.3639], Ahmedabad: [23.0225, 72.5714],
};
const FALLBACK_NORMALIZED = Object.entries(FALLBACK_LOCATION_COORDS).reduce((acc, [c, coord]) => ({ ...acc, [c.toLowerCase()]: coord }), {});

const COUNTRY_GEOJSON_URL = "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/IND.geo.json";
const INDIA_BOUNDS = [[6.0, 68.0], [37.5, 97.5]];
const INDIA_CENTER = [22.5, 79.0];

// Map controller component to move view when user location is found
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

export function AlumniMap({ members = [], onFilterNearby, isFilteringNearby }) {
  const [geoData, setGeoData] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    fetch(COUNTRY_GEOJSON_URL)
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Failed to load map data:", err));
  }, []);

  const countryStats = useMemo(() => {
    const stats = {};
    members.forEach((m) => {
      const country = m.country || (m.location ? m.location.split(",").pop().trim() : "");
      if (country) stats[country] = (stats[country] || 0) + 1;
    });
    return stats;
  }, [members]);

  const points = useMemo(() => {
    return members.map((m) => {
      let position = null;
      
      // Try to use true database coordinates first (DB stores as [lng, lat])
      if (m.coordinates?.coordinates && m.coordinates.coordinates.length === 2) {
        const [lng, lat] = m.coordinates.coordinates;
        if (lng !== 0 || lat !== 0) {
          position = [lat, lng]; // Leaflet uses [lat, lng]
        }
      }

      // Fallback to dictionary
      if (!position && m.city) {
        position = FALLBACK_NORMALIZED[m.city.toLowerCase()];
      }
      if (!position && m.location) {
        const loc = String(m.location).split(",")[0].trim();
        position = FALLBACK_NORMALIZED[loc.toLowerCase()];
      }

      if (!position) return null;

      return {
        id: m._id,
        name: m.userId?.name || m.name || "Member",
        position,
        locationName: [m.city, m.state, m.country].filter(Boolean).join(", ") || m.location || ""
      };
    }).filter(Boolean);
  }, [members]);

  const handleNearMe = useCallback(() => {
    if (isFilteringNearby) {
      onFilterNearby(null);
      setUserLocation(null);
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation([lat, lng]);
        onFilterNearby({ lat, lng, radius: 50 }); // 50km radius
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        alert("Unable to retrieve your location. Please check browser permissions.");
        setIsLocating(false);
      }
    );
  }, [isFilteringNearby, onFilterNearby]);

  return (
    <div style={{ position: "relative", height: "600px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
      
      {/* Floating Action Button */}
      <button 
        onClick={handleNearMe}
        disabled={isLocating}
        style={{
          position: "absolute", top: "1rem", right: "1rem", zIndex: 400,
          background: isFilteringNearby ? "#ef4444" : "white",
          color: isFilteringNearby ? "white" : "#0f172a",
          border: isFilteringNearby ? "none" : "1px solid #e2e8f0",
          padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 700,
          display: "flex", alignItems: "center", gap: "0.4rem",
          cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          transition: "all 150ms"
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          {isLocating ? "hourglass_empty" : isFilteringNearby ? "close" : "my_location"}
        </span>
        {isLocating ? "Locating..." : isFilteringNearby ? "Clear Area Filter" : "Alumni Near Me"}
      </button>

      <MapContainer
        center={INDIA_CENTER}
        zoom={4}
        minZoom={3}
        maxBoundsViscosity={1}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && <MapController center={userLocation} zoom={9} />}

        {geoData && (
          <GeoJSON 
            data={geoData} 
            style={feature => ({
              fillColor: (countryStats[feature.properties.ADMIN] || 0) > 0 ? "#6366f1" : "#e2e8f0",
              weight: 1, opacity: 1, color: "#fff",
              fillOpacity: (countryStats[feature.properties.ADMIN] || 0) > 0 ? 0.4 : 0.2
            })}
          />
        )}

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={userLocation} icon={L.divIcon({
            html: `<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(239,68,68,0.8);"></div>`,
            className: "", iconSize: [16,16]
          })}>
            <Popup><strong>You are here</strong></Popup>
          </Marker>
        )}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={40}
          iconCreateFunction={(cluster) => {
            const count = cluster.getChildCount();
            return L.divIcon({
              html: `<div style="background-color: #6366f1; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">${count}</div>`,
              className: "custom-marker-cluster",
              iconSize: L.point(36, 36)
            });
          }}
        >
          {points.map((point) => (
            <Marker key={point.id} position={point.position}>
              <Popup>
                <strong>{point.name}</strong><br />{point.locationName}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

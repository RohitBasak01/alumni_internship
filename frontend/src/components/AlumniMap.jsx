import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, useState, useEffect } from "react";

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

// Geocoding data for Indian and international cities
const LOCATION_COORDS = {
  // Indian cities
  Mumbai: [19.076, 72.8777],
  Delhi: [28.6139, 77.209],
  "New Delhi": [28.6139, 77.209],
  Bangalore: [12.9716, 77.5946],
  Bengaluru: [12.9716, 77.5946],
  Pune: [18.5204, 73.8567],
  Hyderabad: [17.385, 78.4867],
  Chennai: [13.0827, 80.2707],
  Kolkata: [22.5726, 88.3639],
  Ahmedabad: [23.0225, 72.5714],
  Jaipur: [26.9124, 75.7873],
  Lucknow: [26.8467, 80.9462],
  Chandigarh: [30.7333, 76.7794],
  Indore: [22.7196, 75.8577],
  Kochi: [9.9312, 76.2673],
  Gurgaon: [28.4595, 77.0266],
  Noida: [28.5921, 77.066],
  Thane: [19.2183, 72.9781],
  Navi: [19.0176, 72.9876],
  "Navi Mumbai": [19.0176, 72.9876],
  Surat: [21.1458, 72.8303],
  Vadodara: [22.3072, 73.1812],
  Visakhapatnam: [17.6869, 83.2185],
  Bhopal: [23.1815, 79.9864],
  Nagpur: [21.1458, 79.0882],
  Ludhiana: [30.901, 75.8573],
  Coimbatore: [11.0066, 76.9485],
  Srinagar: [34.0837, 74.7973],
  Ranchi: [23.3441, 85.3096],
  Patna: [25.5941, 85.1376],
  // International cities
  "New York": [40.7128, -74.006],
  "San Francisco": [37.7749, -122.4194],
  London: [51.5074, -0.1278],
  Dubai: [25.2048, 55.2708],
  Singapore: [1.3521, 103.8198],
  Sydney: [-33.8688, 151.2093],
  Toronto: [43.6532, -79.3832],
  Berlin: [52.52, 13.405],
  Paris: [48.8566, 2.3522],
  Tokyo: [35.6762, 139.6503]
};

// Create a normalized lookup for case-insensitive matching
const LOCATION_COORDS_NORMALIZED = Object.entries(LOCATION_COORDS).reduce((acc, [city, coords]) => {
  acc[city.toLowerCase()] = coords;
  return acc;
}, {});

const COUNTRY_GEOJSON_URL =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/IND.geo.json";
const INDIA_BOUNDS = [
  [6.0, 68.0],
  [37.5, 97.5]
];
const INDIA_CENTER = [22.5, 79.0];

export function AlumniMap({ members = [] }) {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    fetch(COUNTRY_GEOJSON_URL)
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Failed to load map data:", err));
  }, []);

  const countryStats = useMemo(() => {
    const stats = {};
    members.forEach((m) => {
      if (!m.location) return;
      const parts = m.location.split(",");
      const country = parts[parts.length - 1].trim();
      if (!country) return;
      stats[country] = (stats[country] || 0) + 1;
    });
    return stats;
  }, [members]);

  const points = useMemo(() => {
    return members
      .map((m) => {
        if (!m.location) return null;

        // Extract city from location (first part before comma)
        const loc = String(m.location).split(",")[0].trim();

        // Try normalized (case-insensitive) lookup first
        let coords = LOCATION_COORDS_NORMALIZED[loc.toLowerCase()];

        // If not found, try exact match (for backward compatibility)
        if (!coords) {
          coords = LOCATION_COORDS[loc];
        }

        // If still not found, return null (alumni won't be shown on map)
        if (!coords) {
          console.warn(`City not found in mapping: "${loc}" from location "${m.location}"`);
          return null;
        }

        return {
          id: m._id,
          name: m.userId?.name || "Member",
          position: coords,
          locationName: m.location,
          city: loc
        };
      })
      .filter(Boolean);
  }, [members]);

  const getCountryName = (feature) =>
    feature?.properties?.ADMIN || feature?.properties?.name || feature?.properties?.NAME || "India";

  const geoJsonStyle = (feature) => {
    const countryName = getCountryName(feature);
    const count = countryStats[countryName] || 0;

    return {
      fillColor: count > 0 ? "#6366f1" : "#e2e8f0",
      weight: 1,
      opacity: 1,
      color: "#fff",
      fillOpacity: count > 0 ? 0.6 : 0.2
    };
  };

  const onEachCountry = (feature, layer) => {
    const countryName = getCountryName(feature);
    const count = countryStats[countryName] || 0;
    if (count > 0) {
      layer.bindPopup(`<strong>${countryName}</strong><br/>${count} Alumni`);
    }
  };

  return (
    <div
      className="alumni-map-container"
      style={{
        height: "600px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #e2e8f0"
      }}
    >
      <MapContainer
        center={INDIA_CENTER}
        zoom={4}
        minZoom={3}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geoData && <GeoJSON data={geoData} style={geoJsonStyle} onEachFeature={onEachCountry} />}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={40}
          showCoverageOnHover={false}
          iconCreateFunction={(cluster) => {
            const count = cluster.getChildCount();
            return L.divIcon({
              html: `<div style="background-color: #10b981; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${count}</div>`,
              className: "custom-marker-cluster",
              iconSize: L.point(32, 32)
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

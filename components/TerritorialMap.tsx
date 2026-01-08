"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMap,
} from "react-leaflet";
import { Delaunay } from "d3-delaunay";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CaptureDialog } from "./CaptureDialog";
import { ChallengeDialog } from "./ChallengeDialog";
import { useGameState } from "@/lib/hooks/useGameState";

// Fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Team {
  id: string;
  name?: string;
  color: string;
}

interface Challenge {
  id: string;
  description?: string;
}

interface Pub {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  drink_count: number;
  controlling_team_id?: string;
  is_locked: boolean;
  challenge?: Challenge;
}

interface Territory {
  pubId: string;
  polygon: [number, number][];
  color: string;
  teamName?: string;
}

interface TerritorialMapProps {
  pubs: Pub[];
  teams: Team[];
  playerTeamId?: string;
}

// Component to handle map bounds fitting
function MapBoundsHandler({ pubs }: { pubs: Pub[] }) {
  const map = useMap();

  useEffect(() => {
    if (pubs.length === 0) return;

    const pubsWithCoords = pubs.filter((p) => p.latitude && p.longitude);
    if (pubsWithCoords.length === 0) return;

    const bounds = L.latLngBounds(
      pubsWithCoords.map((pub) => [pub.latitude, pub.longitude])
    );

    // Add some padding around the bounds
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, pubs]);

  return null;
}

export function TerritorialMap({
  pubs,
  teams,
  playerTeamId,
}: TerritorialMapProps) {
  const { isActive } = useGameState();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [locationPermission, setLocationPermission] = useState<
    "granted" | "denied" | "prompt" | "unsupported"
  >("prompt");

  // Add popup styles on component mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      const styleId = "territorial-map-popup-styles";
      if (!document.getElementById(styleId)) {
        const styleElement = document.createElement("style");
        styleElement.id = styleId;
        styleElement.textContent = `
          .custom-popup .leaflet-popup-content {
            margin: 8px !important;
            max-width: 250px !important;
            min-width: 200px !important;
          }
          .custom-popup .leaflet-popup-content-wrapper {
            border-radius: 8px !important;
          }
          /* Ensure dialogs appear above map */
          [data-slot="dialog-overlay"] {
            z-index: 9999 !important;
          }
          [data-slot="dialog-content"] {
            z-index: 10000 !important;
          }
          /* Also target Radix UI portal */
          [data-radix-portal] {
            z-index: 9999 !important;
          }
          /* Ensure map doesn't interfere */
          .leaflet-container {
            z-index: 1 !important;
          }
        `;
        document.head.appendChild(styleElement);
      }
    }
  }, []);

  // Get user location
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationPermission("unsupported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLocationPermission("granted");
      },
      (error) => {
        console.error("Error getting location:", error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission("denied");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache location for 1 minute
      }
    );

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Filter pubs with valid coordinates
  const pubsWithCoords = useMemo(
    () =>
      pubs.filter(
        (pub) =>
          pub.latitude &&
          pub.longitude &&
          !isNaN(pub.latitude) &&
          !isNaN(pub.longitude)
      ),
    [pubs]
  );

  // Calculate Voronoi territories
  const territories = useMemo(() => {
    if (pubsWithCoords.length < 3) return []; // Need at least 3 points for Voronoi

    try {
      // Create points array [x, y] for Delaunay
      const points = pubsWithCoords.map((pub) => [pub.longitude, pub.latitude]);

      // Create Delaunay triangulation
      const delaunay = Delaunay.from(points);

      // Get Voronoi diagram
      const voronoi = delaunay.voronoi([115.73875, -32.06, 115.7505, -32.053]); // Adjusted width by 2% wider

      const territories: Territory[] = [];

      for (let i = 0; i < pubsWithCoords.length; i++) {
        const pub = pubsWithCoords[i];
        const cell = voronoi.cellPolygon(i);

        if (!cell) continue;

        // Convert from [lng, lat] to [lat, lng] for Leaflet
        const polygon: [number, number][] = cell.map(([lng, lat]) => [
          lat,
          lng,
        ]);

        // Get team info
        const team = teams.find((t) => t.id === pub.controlling_team_id);

        territories.push({
          pubId: pub.id,
          polygon,
          color: team?.color || "#f8f9fa",
          teamName: team?.name,
        });
      }

      return territories;
    } catch (error) {
      console.error("Error creating Voronoi territories:", error);
      return [];
    }
  }, [pubsWithCoords, teams]);

  // Create custom user location marker
  const createUserLocationIcon = () => {
    const iconHtml = `
      <div style="
        width: 20px;
        height: 20px;
        background-color: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        position: relative;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: "user-location-marker",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  // Create custom markers based on pub status
  const createPubIcon = (pub: Pub) => {
    const team = teams.find((t) => t.id === pub.controlling_team_id);
    const color = team?.color || "#666666";
    const isLocked = pub.is_locked;

    const iconHtml = `
      <div style="
        width: 30px;
        height: 30px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        position: relative;
      ">
        ${isLocked ? "🔒" : "🍺"}
        <div style="
          position: absolute;
          bottom: -8px;
          right: -8px;
          background: white;
          border: 2px solid ${color};
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: ${color};
        ">
          ${pub.drink_count}
        </div>
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: "custom-pub-marker",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  // Default center on Fremantle
  const center: [number, number] = [-31.9554, 115.7499];

  if (pubsWithCoords.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-800 rounded-lg">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-3">🗺️</div>
          <p>No pub coordinates available</p>
          <p className="text-sm mt-1">
            Add coordinates in the admin panel to see the territorial map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[75vh] w-full rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={15}
        className="h-full w-full"
        style={{ zIndex: 1 }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsHandler pubs={pubsWithCoords} />

        {/* Render territories */}
        {territories.map((territory) => (
          <Polygon
            key={territory.pubId}
            positions={territory.polygon}
            pathOptions={{
              fillColor: territory.color,
              fillOpacity: 0.3,
              color: territory.color,
              weight: 1,
              opacity: 0.6,
            }}
          />
        ))}

        {/* Render user location marker */}
        {userLocation && (
          <Marker position={userLocation} icon={createUserLocationIcon()}>
            <Popup>
              <div className="text-center p-1">
                <div className="text-sm font-medium">📍 Your Location</div>
                <div className="text-xs text-gray-600 mt-1">
                  {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render pub markers */}
        {pubsWithCoords.map((pub) => (
          <Marker
            key={pub.id}
            position={[pub.latitude, pub.longitude]}
            icon={createPubIcon(pub)}
          >
            <Popup className="custom-popup" minWidth={200}>
              <div className="space-y-3 text-center min-w-0">
                <div>
                  <h4 className="font-semibold text-lg flex items-center justify-center gap-2">
                    <span>🍺</span>
                    {pub.name}
                  </h4>
                  <div className="text-sm text-gray-600 mt-1">
                    {pub.drink_count} drinks
                    {pub.is_locked && " • 🔒 Locked"}
                  </div>

                  {pub.controlling_team_id && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">
                        Controlled by:
                      </span>
                      <div
                        className="inline-block ml-1 px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor:
                            teams.find((t) => t.id === pub.controlling_team_id)
                              ?.color + "20",
                          color: teams.find(
                            (t) => t.id === pub.controlling_team_id
                          )?.color,
                        }}
                      >
                        {teams.find((t) => t.id === pub.controlling_team_id)
                          ?.name || "Unknown Team"}
                      </div>
                    </div>
                  )}

                  {!pub.controlling_team_id && !pub.is_locked && (
                    <div className="text-xs text-gray-500 italic mt-1">
                      Unclaimed pub - capture it!
                    </div>
                  )}
                </div>

                {pub.challenge && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2">
                    <div className="flex items-center justify-center gap-1">
                      <span>🎯</span>
                      <span className="text-xs font-medium text-amber-800">
                        Challenge Available
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {!pub.is_locked && (
                    <CaptureDialog
                      pubId={pub.id}
                      pubName={pub.name}
                      currentDrinkCount={pub.drink_count}
                      disabled={!isActive}
                      triggerClassName="w-full text-xs py-1 px-2"
                    />
                  )}

                  {pub.challenge && !pub.is_locked && (
                    <ChallengeDialog
                      challengeId={pub.challenge.id}
                      challengeType="pub"
                      pubId={pub.id}
                      pubName={pub.name}
                      description={pub.challenge.description}
                      disabled={
                        !isActive || playerTeamId !== pub.controlling_team_id
                      }
                      playerTeamId={playerTeamId}
                    />
                  )}

                  {pub.is_locked && (
                    <div className="w-full text-center py-1 text-xs text-gray-500 bg-gray-100 rounded">
                      🔒 Permanently Locked
                    </div>
                  )}
                </div>

                {!isActive && (
                  <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
                    Game is currently inactive
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Location status indicator */}
      {locationPermission === "denied" && (
        <div className="absolute top-4 left-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 text-yellow-800">
            <span>📍</span>
            <div>
              <div className="font-medium text-sm">Location access denied</div>
              <div className="text-xs">
                Enable location in browser settings to see your position
              </div>
            </div>
          </div>
        </div>
      )}

      {locationPermission === "unsupported" && (
        <div className="absolute top-4 left-4 right-4 bg-gray-100 border border-gray-300 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <span>⚠️</span>
            <div>
              <div className="font-medium text-sm">Location not supported</div>
              <div className="text-xs">
                Your browser doesn't support location services
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

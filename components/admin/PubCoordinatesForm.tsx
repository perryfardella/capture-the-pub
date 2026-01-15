"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface Pub {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface PubCoordinate {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
}

export function PubCoordinatesForm({
  pubs,
  onComplete,
}: {
  pubs: Pub[];
  onComplete: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [coordinates, setCoordinates] = useState<PubCoordinate[]>(
    pubs.map((pub) => ({
      id: pub.id,
      name: pub.name,
      latitude: pub.latitude?.toString() || "",
      longitude: pub.longitude?.toString() || "",
    }))
  );
  const [saving, setSaving] = useState(false);

  const updateCoordinate = (
    pubId: string,
    field: "latitude" | "longitude",
    value: string
  ) => {
    setCoordinates((prev) =>
      prev.map((coord) =>
        coord.id === pubId ? { ...coord, [field]: value } : coord
      )
    );
  };

  const validateCoordinate = (
    value: string,
    type: "latitude" | "longitude"
  ) => {
    const num = parseFloat(value);
    if (isNaN(num)) return false;

    if (type === "latitude") {
      return num >= -90 && num <= 90;
    } else {
      return num >= -180 && num <= 180;
    }
  };

  const saveCoordinates = async () => {
    setSaving(true);

    try {
      // Validate all coordinates
      const invalidCoords = coordinates.filter((coord) => {
        const lat = coord.latitude?.trim();
        const lng = coord.longitude?.trim();

        if (!lat || !lng) return false; // Allow empty coordinates

        return (
          !validateCoordinate(lat, "latitude") ||
          !validateCoordinate(lng, "longitude")
        );
      });

      if (invalidCoords.length > 0) {
        alert(
          `Invalid coordinates found for: ${invalidCoords
            .map((c) => c.name)
            .join(", ")}`
        );
        setSaving(false);
        return;
      }

      // Save coordinates to database
      const updates = coordinates
        .filter((coord) => coord.latitude?.trim() && coord.longitude?.trim())
        .map((coord) => ({
          id: coord.id,
          latitude: parseFloat(coord.latitude),
          longitude: parseFloat(coord.longitude),
        }));

      for (const update of updates) {
        const { error } = await supabase
          .from("pubs")
          .update({
            latitude: update.latitude,
            longitude: update.longitude,
          })
          .eq("id", update.id);

        if (error) {
          console.error("Error updating coordinates:", error);
          alert(`Failed to save coordinates for pub ID: ${update.id}`);
          setSaving(false);
          return;
        }
      }

      alert(`Successfully saved coordinates for ${updates.length} pubs!`);
      onComplete();
    } catch (error) {
      console.error("Error saving coordinates:", error);
      alert("Failed to save coordinates. Please try again.");
    }

    setSaving(false);
  };

  const exportAsJSON = () => {
    const validCoords = coordinates
      .filter((coord) => coord.latitude?.trim() && coord.longitude?.trim())
      .map((coord) => ({
        name: coord.name,
        latitude: parseFloat(coord.latitude),
        longitude: parseFloat(coord.longitude),
      }));

    const json = JSON.stringify(validCoords, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pub-coordinates.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = coordinates.filter(
    (coord) =>
      coord.latitude?.trim() &&
      coord.longitude?.trim() &&
      validateCoordinate(coord.latitude, "latitude") &&
      validateCoordinate(coord.longitude, "longitude")
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Pub Coordinates</h3>
          <p className="text-sm text-slate-400">
            Enter GPS coordinates for each pub. Get these from Google Maps by
            right-clicking and selecting &quot;What&apos;s here?&quot;
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Format: Latitude (e.g., -31.9554), Longitude (e.g., 115.7499)
          </p>
        </div>
        <div className="text-sm text-slate-400">
          {validCount}/{pubs.length} pubs have coordinates
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {coordinates.map((coord) => {
          const latValid =
            !coord.latitude?.trim() ||
            validateCoordinate(coord.latitude, "latitude");
          const lngValid =
            !coord.longitude?.trim() ||
            validateCoordinate(coord.longitude, "longitude");

          return (
            <div
              key={coord.id}
              className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div>
                  <h4 className="font-medium text-white">{coord.name}</h4>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Latitude
                  </label>
                  <Input
                    type="text"
                    placeholder="-31.9554"
                    value={coord.latitude}
                    onChange={(e) =>
                      updateCoordinate(coord.id, "latitude", e.target.value)
                    }
                    className={`bg-slate-900/50 border-slate-600 text-white text-sm ${
                      !latValid ? "border-red-500" : ""
                    }`}
                  />
                  {!latValid && (
                    <p className="text-xs text-red-400 mt-1">
                      Invalid latitude
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Longitude
                  </label>
                  <Input
                    type="text"
                    placeholder="115.7499"
                    value={coord.longitude}
                    onChange={(e) =>
                      updateCoordinate(coord.id, "longitude", e.target.value)
                    }
                    className={`bg-slate-900/50 border-slate-600 text-white text-sm ${
                      !lngValid ? "border-red-500" : ""
                    }`}
                  />
                  {!lngValid && (
                    <p className="text-xs text-red-400 mt-1">
                      Invalid longitude
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={saveCoordinates}
          disabled={saving || validCount === 0}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {saving ? "Saving..." : `Save Coordinates (${validCount} pubs)`}
        </Button>

        <Button
          onClick={exportAsJSON}
          variant="outline"
          disabled={validCount === 0}
          className="border-slate-600 text-slate-300"
        >
          Export JSON
        </Button>
      </div>

      {validCount > 0 && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
          <h4 className="text-blue-300 font-medium text-sm mb-2">
            Instructions for Google Maps:
          </h4>
          <ol className="text-xs text-blue-200 space-y-1">
            <li>
              1. Go to Google Maps and search for &quot;[Pub Name]
              Fremantle&quot;
            </li>
            <li>2. Right-click on the pub&apos;s red pin/marker</li>
            <li>3. Select &quot;What&apos;s here?&quot; from the menu</li>
            <li>4. Copy the coordinates from the bottom of the screen</li>
            <li>5. Paste them into the latitude/longitude fields above</li>
          </ol>
        </div>
      )}
    </div>
  );
}

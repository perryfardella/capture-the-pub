"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Team {
  id: string;
  name: string;
  color: string;
}

interface Pub {
  id: string;
  name: string;
  controlling_team_id: string | null;
  drink_count: number;
}

interface Capture {
  id: string;
  pub_id: string;
  team_id: string;
  drink_count: number;
  media_url: string;
  created_at: string;
  teams?: Team;
  pubs?: Pub;
}

export function CaptureLog({
  captures,
  pubs,
  teams,
  reload,
}: {
  captures: Capture[];
  pubs: Pub[];
  teams: Team[];
  reload: () => void;
}) {
  const [filterPub, setFilterPub] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");

  async function undoCapture(capture: Capture) {
    if (
      !confirm(
        `Undo this capture? This will delete the capture record and may affect pub ownership.`
      )
    )
      return;

    try {
      const response = await fetch("/api/admin/capture", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captureId: capture.id,
          pubId: capture.pub_id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to undo capture");
      }

      reload();
    } catch (error) {
      console.error("Error undoing capture:", error);
      alert(error instanceof Error ? error.message : "Failed to undo capture");
    }
  }

  const filteredCaptures = captures.filter((capture) => {
    const matchesPub = filterPub === "all" || capture.pub_id === filterPub;
    const matchesTeam = filterTeam === "all" || capture.team_id === filterTeam;
    return matchesPub && matchesTeam;
  });

  // Group captures by pub for stats
  const capturesByPub = captures.reduce((acc, capture) => {
    acc[capture.pub_id] = (acc[capture.pub_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const capturesByTeam = captures.reduce((acc, capture) => {
    acc[capture.team_id] = (acc[capture.team_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>📸</span> Capture Log ({captures.length})
        </h2>
      </div>

      {/* Team Stats */}
      <div className="flex flex-wrap gap-2">
        {teams.map((team) => (
          <div
            key={team.id}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: team.color + "20",
              color: team.color,
              border: `1px solid ${team.color}40`,
            }}
          >
            {team.name}: {capturesByTeam[team.id] || 0}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filterPub}
          onChange={(e) => setFilterPub(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm"
        >
          <option value="all">All Pubs</option>
          {pubs.map((pub) => (
            <option key={pub.id} value={pub.id}>
              {pub.name} ({capturesByPub[pub.id] || 0})
            </option>
          ))}
        </select>
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm"
        >
          <option value="all">All Teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Captures List */}
      <div className="space-y-3">
        {filteredCaptures.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No captures found</div>
        ) : (
          filteredCaptures.map((capture) => {
            const team = capture.teams || teams.find((t) => t.id === capture.team_id);
            const pub = capture.pubs || pubs.find((p) => p.id === capture.pub_id);

            return (
              <div
                key={capture.id}
                className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700"
                style={{ borderLeftColor: team?.color || "#888", borderLeftWidth: "4px" }}
              >
                <div className="flex gap-4">
                  {/* Media Preview */}
                  {capture.media_url && (
                    <div className="shrink-0">
                      {capture.media_url.includes("video") ? (
                        <video
                          src={capture.media_url}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <img
                          src={capture.media_url}
                          alt="Capture evidence"
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: team?.color || "#888" }}
                          />
                          <span className="font-medium text-white">{team?.name || "Unknown"}</span>
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                          captured <span className="text-white">{pub?.name || "Unknown Pub"}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => undoCapture(capture)}
                        variant="destructive"
                        size="sm"
                      >
                        Undo
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>🍺 Drink #{capture.drink_count}</span>
                      <span>
                        {new Date(capture.created_at).toLocaleString()}
                      </span>
                    </div>

                    {capture.media_url && (
                      <a
                        href={capture.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-400 hover:underline mt-2 inline-block"
                      >
                        View full media →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


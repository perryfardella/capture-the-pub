"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  is_locked: boolean;
  locked_by_team_id: string | null;
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

export function PubTable({
  pubs,
  teams,
  captures,
  reload,
}: {
  pubs: Pub[];
  teams: Team[];
  captures: Capture[];
  reload: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPubName, setNewPubName] = useState("");
  const [editingPub, setEditingPub] = useState<Pub | null>(null);
  const [saving, setSaving] = useState(false);

  async function addPub() {
    if (!newPubName.trim()) return;
    setSaving(true);

    try {
      const response = await fetch("/api/admin/pub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPubName.trim() }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to add pub:", errorText);
        alert(`Failed to add pub: ${errorText}`);
        setSaving(false);
        return;
      }

      setNewPubName("");
      setShowAddForm(false);
      reload();
    } catch (error) {
      console.error("Error adding pub:", error);
      alert("Failed to add pub. Please try again.");
    }

    setSaving(false);
  }

  async function updatePub(pub: Pub) {
    setSaving(true);

    try {
      const response = await fetch("/api/admin/pub", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pubId: pub.id,
          name: pub.name,
          action: "update_name",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to update pub:", errorText);
        alert(`Failed to update pub: ${errorText}`);
        setSaving(false);
        return;
      }

      setEditingPub(null);
      reload();
    } catch (error) {
      console.error("Error updating pub:", error);
      alert("Failed to update pub. Please try again.");
    }

    setSaving(false);
  }

  async function deletePub(pubId: string, pubName: string) {
    if (
      !confirm(
        `Delete pub "${pubName}"? This will also delete all capture history.`
      )
    )
      return;

    try {
      const response = await fetch("/api/admin/pub", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pubId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to delete pub:", errorText);
        alert(`Failed to delete pub: ${errorText}`);
        return;
      }

      reload();
    } catch (error) {
      console.error("Error deleting pub:", error);
      alert("Failed to delete pub. Please try again.");
    }
  }

  async function toggleLock(pubId: string, currentlyLocked: boolean) {
    try {
      const response = await fetch("/api/admin/pub", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pubId,
          is_locked: !currentlyLocked,
          action: "toggle_lock",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to toggle lock:", errorText);
        alert(`Failed to toggle lock: ${errorText}`);
        return;
      }

      reload();
    } catch (error) {
      console.error("Error toggling lock:", error);
      alert("Failed to toggle lock. Please try again.");
    }
  }

  async function changeOwner(pubId: string, teamId: string | null) {
    try {
      const response = await fetch("/api/admin/pub", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pubId,
          controlling_team_id: teamId || null,
          action: "change_owner",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to change owner:", errorText);
        alert(`Failed to change owner: ${errorText}`);
        return;
      }

      reload();
    } catch (error) {
      console.error("Error changing owner:", error);
      alert("Failed to change owner. Please try again.");
    }
  }

  async function resetPub(pubId: string, pubName: string) {
    if (
      !confirm(
        `Reset "${pubName}"? This will clear ownership, drink count, and lock status.`
      )
    )
      return;

    try {
      const response = await fetch("/api/admin/pub", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pubId,
          action: "reset",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to reset pub:", errorText);
        alert(`Failed to reset pub: ${errorText}`);
        return;
      }

      reload();
    } catch (error) {
      console.error("Error resetting pub:", error);
      alert("Failed to reset pub. Please try again.");
    }
  }

  async function setDrinkCount(pubId: string, count: number) {
    if (count < 0) return;

    try {
      const response = await fetch("/api/admin/pub", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pubId,
          drink_count: count,
          action: "set_drink_count",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to set drink count:", errorText);
        alert(`Failed to set drink count: ${errorText}`);
        return;
      }

      reload();
    } catch (error) {
      console.error("Error setting drink count:", error);
      alert("Failed to set drink count. Please try again.");
    }
  }

  // Count captures per pub
  const capturesByPub = captures.reduce((acc, capture) => {
    acc[capture.pub_id] = (acc[capture.pub_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>🍺</span> Pubs ({pubs.length})
        </h2>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900"
        >
          {showAddForm ? "Cancel" : "+ Add Pub"}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300">
          📍 {pubs.filter((p) => p.controlling_team_id).length} captured
        </div>
        <div className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300">
          🔒 {pubs.filter((p) => p.is_locked).length} locked
        </div>
        <div className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300">
          🍺 {pubs.reduce((sum, p) => sum + p.drink_count, 0)} total drinks
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700 space-y-4">
          <h3 className="font-medium text-white">Add New Pub</h3>
          <Input
            placeholder="Pub name"
            value={newPubName}
            onChange={(e) => setNewPubName(e.target.value)}
            className="bg-slate-900/50 border-slate-600 text-white"
          />
          <Button
            onClick={addPub}
            disabled={saving || !newPubName.trim()}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {saving ? "Saving..." : "Add Pub"}
          </Button>
        </div>
      )}

      {/* Pubs List */}
      <div className="space-y-3">
        {pubs.map((pub) => {
          const owner = teams.find((t) => t.id === pub.controlling_team_id);
          const captureCount = capturesByPub[pub.id] || 0;

          return (
            <div
              key={pub.id}
              className={`bg-slate-800/50 backdrop-blur rounded-xl p-4 border ${
                pub.is_locked
                  ? "border-amber-500/50"
                  : owner
                  ? "border-slate-600"
                  : "border-slate-700"
              }`}
              style={
                owner
                  ? { borderLeftColor: owner.color, borderLeftWidth: "4px" }
                  : {}
              }
            >
              {editingPub?.id === pub.id ? (
                <div className="space-y-3">
                  <Input
                    value={editingPub.name}
                    onChange={(e) =>
                      setEditingPub({ ...editingPub, name: e.target.value })
                    }
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updatePub(editingPub)}
                      disabled={saving}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => setEditingPub(null)}
                      variant="outline"
                      className="border-slate-600 text-slate-300"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{pub.name}</h3>
                        {pub.is_locked && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                            🔒 Locked
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {captureCount} capture{captureCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => setEditingPub(pub)}
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 px-2"
                      >
                        ✏️
                      </Button>
                      <Button
                        onClick={() => deletePub(pub.id, pub.name)}
                        variant="destructive"
                        size="sm"
                        className="px-2"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Owner:</span>
                      <select
                        value={pub.controlling_team_id || ""}
                        onChange={(e) =>
                          changeOwner(pub.id, e.target.value || null)
                        }
                        className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      >
                        <option value="">None</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Drinks:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setDrinkCount(pub.id, pub.drink_count - 1)
                          }
                          className="w-7 h-7 bg-slate-700 rounded text-white hover:bg-slate-600"
                          disabled={pub.drink_count <= 0}
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-white font-mono">
                          {pub.drink_count}
                        </span>
                        <button
                          onClick={() =>
                            setDrinkCount(pub.id, pub.drink_count + 1)
                          }
                          className="w-7 h-7 bg-slate-700 rounded text-white hover:bg-slate-600"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-700">
                    <Button
                      onClick={() => toggleLock(pub.id, pub.is_locked)}
                      variant="outline"
                      size="sm"
                      className={`flex-1 ${
                        pub.is_locked
                          ? "border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                          : "border-slate-600 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {pub.is_locked ? "🔓 Unlock" : "🔒 Lock"}
                    </Button>
                    <Button
                      onClick={() => resetPub(pub.id, pub.name)}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20"
                    >
                      🔄 Reset
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

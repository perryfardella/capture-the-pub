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

export function TeamTable({
  teams,
  reload,
}: {
  teams: Team[];
  reload: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#3B82F6");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);

  async function addTeam() {
    if (!newTeamName.trim()) return;
    setSaving(true);
    await supabase.from("teams").insert({
      name: newTeamName.trim(),
      color: newTeamColor,
    });
    setNewTeamName("");
    setNewTeamColor("#3B82F6");
    setShowAddForm(false);
    setSaving(false);
    reload();
  }

  async function updateTeam(team: Team) {
    setSaving(true);
    await supabase
      .from("teams")
      .update({ name: team.name, color: team.color })
      .eq("id", team.id);
    setEditingTeam(null);
    setSaving(false);
    reload();
  }

  async function deleteTeam(teamId: string) {
    if (!confirm("Are you sure? This will affect all players on this team.")) return;
    await supabase.from("teams").delete().eq("id", teamId);
    reload();
  }

  const presetColors = [
    "#EF4444", // Red
    "#F97316", // Orange
    "#F59E0B", // Amber
    "#84CC16", // Lime
    "#22C55E", // Green
    "#14B8A6", // Teal
    "#06B6D4", // Cyan
    "#3B82F6", // Blue
    "#6366F1", // Indigo
    "#8B5CF6", // Violet
    "#A855F7", // Purple
    "#EC4899", // Pink
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>👥</span> Teams ({teams.length})
        </h2>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900"
        >
          {showAddForm ? "Cancel" : "+ Add Team"}
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700 space-y-4">
          <h3 className="font-medium text-white">Add New Team</h3>
          <div className="space-y-3">
            <Input
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="bg-slate-900/50 border-slate-600 text-white"
            />
            <div>
              <label className="text-sm text-slate-400 block mb-2">Team Color</label>
              <div className="flex flex-wrap gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTeamColor(color)}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      newTeamColor === color ? "ring-2 ring-white scale-110" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={newTeamColor}
                  onChange={(e) => setNewTeamColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <span className="text-sm text-slate-400">{newTeamColor}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={addTeam}
            disabled={saving || !newTeamName.trim()}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {saving ? "Saving..." : "Add Team"}
          </Button>
        </div>
      )}

      {/* Teams List */}
      <div className="space-y-3">
        {teams.map((team) => (
          <div
            key={team.id}
            className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700"
          >
            {editingTeam?.id === team.id ? (
              <div className="space-y-3">
                <Input
                  value={editingTeam.name}
                  onChange={(e) =>
                    setEditingTeam({ ...editingTeam, name: e.target.value })
                  }
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
                <div className="flex flex-wrap gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditingTeam({ ...editingTeam, color })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        editingTeam.color === color ? "ring-2 ring-white scale-110" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateTeam(editingTeam)}
                    disabled={saving}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => setEditingTeam(null)}
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-lg"
                    style={{ backgroundColor: team.color }}
                  />
                  <div>
                    <div className="font-medium text-white">{team.name}</div>
                    <div className="text-xs text-slate-400">{team.color}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditingTeam(team)}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => deleteTeam(team.id)}
                    variant="destructive"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


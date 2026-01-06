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
}

interface Challenge {
  id: string;
  type: "pub" | "global";
  pub_id: string | null;
  description: string;
  is_consumed: boolean;
  completed_by_team_id: string | null;
  created_at: string;
}

export function ChallengeTable({
  challenges,
  pubs,
  teams,
  reload,
}: {
  challenges: Challenge[];
  pubs: Pub[];
  teams: Team[];
  reload: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    type: "global" as "pub" | "global",
    pub_id: "",
    description: "",
  });
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "pub" | "global">("all");

  async function addChallenge() {
    if (!newChallenge.description.trim()) return;
    if (newChallenge.type === "pub" && !newChallenge.pub_id) {
      alert("Please select a pub for this challenge");
      return;
    }
    setSaving(true);
    await supabase.from("challenges").insert({
      type: newChallenge.type,
      pub_id: newChallenge.type === "pub" ? newChallenge.pub_id : null,
      description: newChallenge.description.trim(),
    });
    setNewChallenge({ type: "global", pub_id: "", description: "" });
    setShowAddForm(false);
    setSaving(false);
    reload();
  }

  async function updateChallenge(challenge: Challenge) {
    setSaving(true);
    await supabase
      .from("challenges")
      .update({
        description: challenge.description,
        type: challenge.type,
        pub_id: challenge.type === "pub" ? challenge.pub_id : null,
      })
      .eq("id", challenge.id);
    setEditingChallenge(null);
    setSaving(false);
    reload();
  }

  async function deleteChallenge(challengeId: string) {
    if (!confirm("Delete this challenge? This cannot be undone.")) return;
    // Delete related attempts and bonus points first
    await supabase.from("challenge_attempts").delete().eq("challenge_id", challengeId);
    await supabase.from("bonus_points").delete().eq("challenge_id", challengeId);
    await supabase.from("challenges").delete().eq("id", challengeId);
    reload();
  }

  async function markComplete(challengeId: string, teamId: string | null) {
    await supabase
      .from("challenges")
      .update({
        is_consumed: true,
        completed_by_team_id: teamId,
      })
      .eq("id", challengeId);
    reload();
  }

  async function resetChallenge(challengeId: string) {
    // Delete bonus points for this challenge
    await supabase.from("bonus_points").delete().eq("challenge_id", challengeId);
    await supabase
      .from("challenges")
      .update({ is_consumed: false, completed_by_team_id: null })
      .eq("id", challengeId);
    reload();
  }

  const filteredChallenges = challenges.filter((c) => {
    if (filterType === "all") return true;
    return c.type === filterType;
  });

  const globalChallenges = challenges.filter((c) => c.type === "global");
  const pubChallenges = challenges.filter((c) => c.type === "pub");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>🎯</span> Challenges ({challenges.length})
        </h2>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900"
        >
          {showAddForm ? "Cancel" : "+ Add Challenge"}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300">
          🌍 {globalChallenges.length} global
        </div>
        <div className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300">
          🍺 {pubChallenges.length} pub-specific
        </div>
        <div className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300">
          ✅ {challenges.filter((c) => c.is_consumed).length} completed
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "global", "pub"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filterType === type
                ? "bg-amber-500 text-slate-900"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {type === "all" ? "All" : type === "global" ? "🌍 Global" : "🍺 Pub"}
          </button>
        ))}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700 space-y-4">
          <h3 className="font-medium text-white">Add New Challenge</h3>
          
          <div className="flex gap-2">
            <button
              onClick={() => setNewChallenge({ ...newChallenge, type: "global", pub_id: "" })}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                newChallenge.type === "global"
                  ? "bg-amber-500 text-slate-900"
                  : "bg-slate-700 text-slate-300"
              }`}
            >
              🌍 Global Challenge
            </button>
            <button
              onClick={() => setNewChallenge({ ...newChallenge, type: "pub" })}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                newChallenge.type === "pub"
                  ? "bg-amber-500 text-slate-900"
                  : "bg-slate-700 text-slate-300"
              }`}
            >
              🍺 Pub Challenge
            </button>
          </div>

          {newChallenge.type === "pub" && (
            <select
              value={newChallenge.pub_id}
              onChange={(e) => setNewChallenge({ ...newChallenge, pub_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
            >
              <option value="">Select a pub...</option>
              {pubs.map((pub) => (
                <option key={pub.id} value={pub.id}>
                  {pub.name}
                </option>
              ))}
            </select>
          )}

          <Input
            placeholder="Challenge description"
            value={newChallenge.description}
            onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
            className="bg-slate-900/50 border-slate-600 text-white"
          />

          <Button
            onClick={addChallenge}
            disabled={saving || !newChallenge.description.trim()}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {saving ? "Saving..." : "Add Challenge"}
          </Button>
        </div>
      )}

      {/* Challenges List */}
      <div className="space-y-3">
        {filteredChallenges.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No challenges found
          </div>
        ) : (
          filteredChallenges.map((challenge) => {
            const pub = pubs.find((p) => p.id === challenge.pub_id);
            const completedByTeam = teams.find((t) => t.id === challenge.completed_by_team_id);

            return (
              <div
                key={challenge.id}
                className={`bg-slate-800/50 backdrop-blur rounded-xl p-4 border ${
                  challenge.is_consumed
                    ? "border-green-500/30"
                    : "border-slate-700"
                }`}
              >
                {editingChallenge?.id === challenge.id ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setEditingChallenge({ ...editingChallenge, type: "global", pub_id: null })
                        }
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                          editingChallenge.type === "global"
                            ? "bg-amber-500 text-slate-900"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        🌍 Global
                      </button>
                      <button
                        onClick={() => setEditingChallenge({ ...editingChallenge, type: "pub" })}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                          editingChallenge.type === "pub"
                            ? "bg-amber-500 text-slate-900"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        🍺 Pub
                      </button>
                    </div>

                    {editingChallenge.type === "pub" && (
                      <select
                        value={editingChallenge.pub_id || ""}
                        onChange={(e) =>
                          setEditingChallenge({ ...editingChallenge, pub_id: e.target.value || null })
                        }
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                      >
                        <option value="">Select a pub...</option>
                        {pubs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}

                    <Input
                      value={editingChallenge.description}
                      onChange={(e) =>
                        setEditingChallenge({ ...editingChallenge, description: e.target.value })
                      }
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />

                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateChallenge(editingChallenge)}
                        disabled={saving}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => setEditingChallenge(null)}
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
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              challenge.type === "global"
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {challenge.type === "global" ? "🌍 Global" : "🍺 Pub"}
                          </span>
                          {pub && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-600 text-slate-300">
                              {pub.name}
                            </span>
                          )}
                          {challenge.is_consumed && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                              ✅ Completed
                            </span>
                          )}
                        </div>
                        <p className="text-white mt-2">{challenge.description}</p>
                        {completedByTeam && (
                          <div className="flex items-center gap-2 mt-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: completedByTeam.color }}
                            />
                            <span className="text-sm text-slate-400">
                              Completed by {completedByTeam.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => setEditingChallenge(challenge)}
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700 px-2"
                        >
                          ✏️
                        </Button>
                        <Button
                          onClick={() => deleteChallenge(challenge.id)}
                          variant="destructive"
                          size="sm"
                          className="px-2"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-slate-700">
                      {!challenge.is_consumed ? (
                        <div className="flex-1 flex gap-2">
                          <select
                            className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                markComplete(challenge.id, e.target.value);
                              }
                            }}
                          >
                            <option value="">Mark complete by...</option>
                            {teams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <Button
                          onClick={() => resetChallenge(challenge.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                        >
                          🔄 Reset Challenge
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

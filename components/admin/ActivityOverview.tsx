"use client";

import { useState } from "react";

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
  description: string;
  pub_id: string | null;
}

interface Capture {
  id: string;
  pub_id: string;
  team_id: string;
  drink_count: number;
  media_url: string;
  created_at: string;
}

interface ChallengeAttempt {
  id: string;
  challenge_id: string;
  team_id: string;
  step: "start" | "result";
  success: boolean | null;
  media_url: string;
  created_at: string;
}

interface BonusPoint {
  id: string;
  team_id: string;
  challenge_id: string;
  created_at: string;
}

type ActivityType = "all" | "capture" | "challenge" | "bonus";

interface FeedItem {
  id: string;
  type: "capture" | "challenge_start" | "challenge_result" | "bonus";
  created_at: string;
  team_id: string;
  data: Capture | ChallengeAttempt | BonusPoint;
}

export function ActivityOverview({
  captures,
  challengeAttempts,
  bonusPoints,
  teams,
  pubs,
  challenges,
}: {
  captures: Capture[];
  challengeAttempts: ChallengeAttempt[];
  bonusPoints: BonusPoint[];
  teams: Team[];
  pubs: Pub[];
  challenges: Challenge[];
}) {
  const [filterType, setFilterType] = useState<ActivityType>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");

  // Create unified feed
  const feed: FeedItem[] = [
    ...captures.map((c) => ({
      id: `capture-${c.id}`,
      type: "capture" as const,
      created_at: c.created_at,
      team_id: c.team_id,
      data: c,
    })),
    ...challengeAttempts.map((a) => ({
      id: `attempt-${a.id}`,
      type:
        a.step === "start"
          ? ("challenge_start" as const)
          : ("challenge_result" as const),
      created_at: a.created_at,
      team_id: a.team_id,
      data: a,
    })),
    ...bonusPoints.map((b) => ({
      id: `bonus-${b.id}`,
      type: "bonus" as const,
      created_at: b.created_at,
      team_id: b.team_id,
      data: b,
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Filter feed
  const filteredFeed = feed.filter((item) => {
    const matchesType =
      filterType === "all" ||
      (filterType === "capture" && item.type === "capture") ||
      (filterType === "challenge" &&
        (item.type === "challenge_start" ||
          item.type === "challenge_result")) ||
      (filterType === "bonus" && item.type === "bonus");
    const matchesTeam = filterTeam === "all" || item.team_id === filterTeam;
    return matchesType && matchesTeam;
  });

  // Stats
  const totalCaptures = captures.length;
  const totalAttempts = challengeAttempts.length;
  const successfulChallenges = challengeAttempts.filter(
    (a) => a.step === "result" && a.success
  ).length;
  const totalBonusPoints = bonusPoints.length;

  const getTeam = (teamId: string) => teams.find((t) => t.id === teamId);
  const getPub = (pubId: string) => pubs.find((p) => p.id === pubId);
  const getChallenge = (challengeId: string) =>
    challenges.find((c) => c.id === challengeId);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const renderFeedItem = (item: FeedItem) => {
    const team = getTeam(item.team_id);

    switch (item.type) {
      case "capture": {
        const capture = item.data as Capture;
        const pub = getPub(capture.pub_id);
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-lg">
              📍
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: team?.color || "#888" }}
                />
                <span className="font-medium text-white">{team?.name}</span>
                <span className="text-slate-400">captured</span>
                <span className="text-white">{pub?.name}</span>
              </div>
              <div className="text-xs text-slate-500">
                Drink #{capture.drink_count} • {formatTime(item.created_at)}
              </div>
            </div>
            {capture.media_url && (
              <img
                src={capture.media_url}
                alt=""
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
          </div>
        );
      }

      case "challenge_start": {
        const attempt = item.data as ChallengeAttempt;
        const challenge = getChallenge(attempt.challenge_id);
        const pub = challenge?.pub_id ? getPub(challenge.pub_id) : null;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-lg">
              🎯
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: team?.color || "#888" }}
                />
                <span className="font-medium text-white">{team?.name}</span>
                <span className="text-slate-400">started challenge</span>
              </div>
              <div className="text-xs text-slate-400 truncate">
                {challenge?.description}
                {pub && <span className="text-slate-500"> at {pub.name}</span>}
              </div>
              <div className="text-xs text-slate-500">
                {formatTime(item.created_at)}
              </div>
            </div>
            {attempt.media_url && (
              <img
                src={attempt.media_url}
                alt=""
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
          </div>
        );
      }

      case "challenge_result": {
        const attempt = item.data as ChallengeAttempt;
        const challenge = getChallenge(attempt.challenge_id);
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                attempt.success ? "bg-green-500/20" : "bg-red-500/20"
              }`}
            >
              {attempt.success ? "✅" : "❌"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: team?.color || "#888" }}
                />
                <span className="font-medium text-white">{team?.name}</span>
                <span
                  className={
                    attempt.success ? "text-green-400" : "text-red-400"
                  }
                >
                  {attempt.success ? "completed" : "failed"}
                </span>
                <span className="text-slate-400">challenge</span>
              </div>
              <div className="text-xs text-slate-400 truncate">
                {challenge?.description}
              </div>
              <div className="text-xs text-slate-500">
                {formatTime(item.created_at)}
              </div>
            </div>
            {attempt.media_url && (
              <img
                src={attempt.media_url}
                alt=""
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
          </div>
        );
      }

      case "bonus": {
        const bonus = item.data as BonusPoint;
        const challenge = getChallenge(bonus.challenge_id);
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-lg">
              🏆
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: team?.color || "#888" }}
                />
                <span className="font-medium text-white">{team?.name}</span>
                <span className="text-amber-400">earned bonus point!</span>
              </div>
              <div className="text-xs text-slate-400 truncate">
                {challenge?.description}
              </div>
              <div className="text-xs text-slate-500">
                {formatTime(item.created_at)}
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>📊</span> Activity Feed ({feed.length})
        </h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700">
          <div className="text-2xl font-bold text-blue-400">
            {totalCaptures}
          </div>
          <div className="text-xs text-slate-400">Total Captures</div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700">
          <div className="text-2xl font-bold text-yellow-400">
            {totalAttempts}
          </div>
          <div className="text-xs text-slate-400">Challenge Attempts</div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700">
          <div className="text-2xl font-bold text-green-400">
            {successfulChallenges}
          </div>
          <div className="text-xs text-slate-400">Challenges Won</div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700">
          <div className="text-2xl font-bold text-amber-400">
            {totalBonusPoints}
          </div>
          <div className="text-xs text-slate-400">Bonus Points</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {(
          [
            { id: "all", label: "All" },
            { id: "capture", label: "📍 Captures" },
            { id: "challenge", label: "🎯 Challenges" },
            { id: "bonus", label: "🏆 Bonus" },
          ] as const
        ).map((type) => (
          <button
            key={type.id}
            onClick={() => setFilterType(type.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filterType === type.id
                ? "bg-amber-500 text-slate-900"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      <select
        value={filterTeam}
        onChange={(e) => setFilterTeam(e.target.value)}
        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm"
      >
        <option value="all">All Teams</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>

      {/* Feed */}
      <div className="space-y-2">
        {filteredFeed.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No activity found
          </div>
        ) : (
          filteredFeed.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700"
            >
              {renderFeedItem(item)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ChallengeDialog({
  challengeId,
  challengeType,
  pubId,
  pubName,
  disabled,
  description,
  onSuccess,
  playerTeamId,
  completedByTeamId,
}: {
  challengeId: string;
  challengeType: "pub" | "global";
  pubId?: string;
  pubName?: string;
  disabled?: boolean;
  description?: string;
  onSuccess?: () => void;
  playerTeamId?: string;
  completedByTeamId?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [step, setStep] = useState<"start" | "result">(
    challengeType === "pub" ? "start" : "result"
  );
  const [loading, setLoading] = useState(false);
  const [challengeDescription, setChallengeDescription] = useState<
    string | null
  >(description || null);
  const [success, setSuccess] = useState<boolean | null>(null);

  // Fetch challenge description if not provided
  useEffect(() => {
    if (!challengeDescription && challengeId) {
      const supabase = createSupabaseBrowserClient();
      supabase
        .from("challenges")
        .select("description")
        .eq("id", challengeId)
        .single()
        .then(({ data }) => {
          if (data) {
            setChallengeDescription(data.description);
          }
        });
    }
  }, [challengeId, challengeDescription]);

  async function submit() {
    // Validate photo requirement for global challenges
    if (challengeType === "global" && !file) {
      alert(
        "Please upload a photo or video to complete this global challenge."
      );
      return;
    }
    // Validate photo requirement for pub challenge start step
    if (challengeType === "pub" && step === "start" && !file) return;
    setLoading(true);

    const playerId = localStorage.getItem("player_id");
    if (!playerId) {
      alert("No player session. Please join the game first.");
      setLoading(false);
      return;
    }

    // Validate success selection for pub challenge result step
    if (challengeType === "pub" && step === "result" && success === null) {
      alert("Please specify whether the challenge passed or failed.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("challengeId", challengeId);
    formData.append("step", step);
    formData.append("playerId", playerId);
    if (pubId) formData.append("pubId", pubId);
    if (file) formData.append("file", file);
    if (step === "result" && success !== null) {
      formData.append("success", success.toString());
    }

    const res = await fetch("/api/challenge", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      alert(errorText);
      setLoading(false);
      return;
    }

    // Success - clear file and update state
    setFile(null);
    setFileInputKey((prev) => prev + 1); // Reset file input
    if (challengeType === "pub") {
      if (step === "start") {
        setStep("result");
        setSuccess(null); // Reset success state for result step
        alert("Challenge started! Now attempt it and submit result.");
      } else {
        setStep("start"); // reset for retry
        setSuccess(null); // Reset success state
        if (success) {
          alert("Challenge succeeded! Pub locked for your team.");
        } else {
          alert("Challenge failed. You can try again!");
        }
        if (success) {
          onSuccess?.(); // Close sheet on success
        }
      }
    } else {
      alert("Global challenge completed! Bonus point awarded.");
      onSuccess?.(); // Close sheet on completion
    }

    setLoading(false);
  }

  // Check if player's team already completed this global challenge
  const isTeamCompleted =
    challengeType === "global" &&
    playerTeamId &&
    completedByTeamId === playerTeamId;
  const isDisabled =
    disabled ||
    loading ||
    isTeamCompleted ||
    (challengeType === "pub" && step === "start" && !file) ||
    (challengeType === "global" && !file);

  return (
    <div className="space-y-3">
      {challengeType === "global" && challengeDescription && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Upload Photo or Video *
            </label>
            <div className="relative">
              <Input
                key={fileInputKey}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={!!isTeamCompleted}
                className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
              />
            </div>
            {file && (
              <div className="p-2 bg-muted rounded-md flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setFileInputKey((prev) => prev + 1);
                  }}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <Button
            disabled={isDisabled}
            onClick={submit}
            className="w-full"
            size="lg"
          >
            {loading ? "Submitting..." : "Submit Challenge Completion"}
          </Button>
        </div>
      )}

      {challengeType === "pub" && (
        <>
          {challengeDescription && (
            <div>
              <p className="text-sm font-medium">{challengeDescription}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {step === "start"
                  ? "Complete this challenge to lock this pub for your team!"
                  : "Did you succeed or fail? Select below and submit your result."}
              </p>
            </div>
          )}

          {step === "result" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Challenge Result *
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={success === true ? "default" : "outline"}
                  onClick={() => setSuccess(true)}
                  className="flex-1"
                  disabled={loading}
                >
                  ✓ Passed
                </Button>
                <Button
                  type="button"
                  variant={success === false ? "default" : "outline"}
                  onClick={() => setSuccess(false)}
                  className="flex-1"
                  disabled={loading}
                >
                  ✗ Failed
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Upload Photo or Video *
            </label>
            <Input
              key={fileInputKey}
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={!!isTeamCompleted}
              className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
            />
          </div>

          <Button
            disabled={isDisabled || (step === "result" && success === null)}
            onClick={submit}
            className="w-full"
          >
            {loading
              ? "Submitting..."
              : step === "start"
              ? "Start Challenge (Pay Drink)"
              : "Submit Challenge Result"}
          </Button>
        </>
      )}
    </div>
  );
}

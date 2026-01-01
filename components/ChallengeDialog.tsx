"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useMediaUpload } from "@/lib/hooks/useMediaUpload";

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
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"start" | "result" | "complete">(
    challengeType === "pub" ? "start" : "result"
  );
  const [challengeDescription, setChallengeDescription] = useState<
    string | null
  >(description || null);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [submissionResult, setSubmissionResult] = useState<boolean | null>(
    null
  );

  const {
    uploadMedia,
    uploading: loading,
    uploadProgress,
    error,
    reset: resetUpload,
    setError: setUploadError,
  } = useMediaUpload();

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when dialog closes
      setFile(null);
      setFileInputKey((prev) => prev + 1);
      resetUpload();
      // Reset to start step for pub challenges
      if (challengeType === "pub") {
        setStep("start");
        setSuccess(null);
        setSubmissionResult(null);
      }
    }
  }

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
      setUploadError(
        "Please upload a photo or video to complete this global challenge."
      );
      return;
    }
    // Validate photo requirement for pub challenge start step
    if (challengeType === "pub" && step === "start" && !file) return;

    const playerId = localStorage.getItem("player_id");
    if (!playerId) {
      setUploadError("No player session. Please join the game first.");
      return;
    }

    // Validate success selection for pub challenge result step
    if (challengeType === "pub" && step === "result" && success === null) {
      setUploadError("Please specify whether the challenge passed or failed.");
      return;
    }

    try {
      let mediaUrl: string | null = null;

      // Upload file directly to Supabase Storage if provided
      if (file) {
        const result = await uploadMedia(file, `challenges/${challengeId}`);

        if (result.error) {
          // Error is already set by the hook
          return;
        }

        mediaUrl = result.mediaUrl;
      }

      // Send URL to API route instead of file
      const formData = new FormData();
      formData.append("challengeId", challengeId);
      formData.append("step", step);
      formData.append("playerId", playerId);
      if (pubId) formData.append("pubId", pubId);
      if (mediaUrl) formData.append("mediaUrl", mediaUrl);
      if (step === "result" && success !== null) {
        formData.append("success", success.toString());
      }

      const res = await fetch("/api/challenge", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        setUploadError(errorText);
        return;
      }

      // Success - clear file and update state
      setFile(null);
      setFileInputKey((prev) => prev + 1); // Reset file input
      resetUpload();
      if (challengeType === "pub") {
        if (step === "start") {
          setStep("result");
          setSuccess(null); // Reset success state for result step
        } else {
          // Challenge result submitted - show confirmation
          setSubmissionResult(success);
          setStep("complete");
          setFile(null);
          setFileInputKey((prev) => prev + 1);
          resetUpload();
        }
      } else {
        // Global challenge completed
        setFile(null);
        setFileInputKey((prev) => prev + 1);
        resetUpload();
        setOpen(false);
        onSuccess?.();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  // Check if player's team already completed this global challenge
  const isTeamCompleted = Boolean(
    challengeType === "global" &&
      playerTeamId &&
      completedByTeamId === playerTeamId
  );
  const isDisabled =
    disabled ||
    loading ||
    isTeamCompleted ||
    (challengeType === "pub" && step === "start" && !file) ||
    (challengeType === "global" && !file);

  // Global challenge dialog UI
  if (challengeType === "global") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            disabled={Boolean(disabled || isTeamCompleted)}
            className="w-full"
          >
            Complete Challenge
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogTitle>Complete Challenge</DialogTitle>
          <DialogDescription>
            {challengeDescription ||
              "Upload photo or video evidence to complete this challenge and earn a bonus point."}
          </DialogDescription>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Complete this challenge to earn <strong>+1 bonus point</strong>{" "}
                for your team.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Photo or Video Evidence *</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                📁 Choose Photo or Video from Library
              </Button>
              <Input
                ref={fileInputRef}
                key={fileInputKey}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  resetUpload();
                }}
                disabled={loading}
              />
              {file && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Selected: {file.name} (
                    {(file.size / 1024 / 1024).toFixed(2)}
                    MB)
                  </p>
                  {uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Uploading...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setFileInputKey((prev) => prev + 1);
                      resetUpload();
                    }}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            <Button disabled={isDisabled} onClick={submit} className="w-full">
              {loading ? "Submitting..." : "Submit Challenge"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Pub challenge UI - now using Dialog
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          disabled={Boolean(disabled || isTeamCompleted)}
          className="w-full"
        >
          🎯 Challenge
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>
          {pubName ? `${pubName} Challenge` : "Pub Challenge"}
        </DialogTitle>
        <DialogDescription>
          {challengeDescription ||
            "Complete this challenge to lock this pub for your team!"}
        </DialogDescription>

        <div className="space-y-4">
          {step === "complete" ? (
            // Completion screen
            <div className="space-y-4 text-center">
              <div
                className={`mx-auto flex items-center justify-center w-16 h-16 rounded-full text-2xl ${
                  submissionResult
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {submissionResult ? "✓" : "✗"}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {submissionResult
                    ? "Challenge Passed! 🎉"
                    : "Challenge Failed"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {submissionResult
                    ? "Your submission has been received. The pub is now locked for your team!"
                    : "Your submission has been received. You can try again from the pub tab if you wish."}
                </p>
              </div>
              <Button
                onClick={() => {
                  setOpen(false);
                  if (submissionResult) {
                    onSuccess?.();
                  }
                }}
                className="w-full"
                variant={submissionResult ? "default" : "outline"}
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                    step === "start"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  1
                </div>
                <div className="flex-1 h-px bg-muted" />
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                    step === "result"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  2
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span
                  className={
                    step === "start" ? "font-medium text-foreground" : ""
                  }
                >
                  Pay Entry Fee
                </span>
                <span
                  className={
                    step === "result" ? "font-medium text-foreground" : ""
                  }
                >
                  Submit Result
                </span>
              </div>
            </>
          )}

          {step === "start" && (
            <div className="space-y-2">
              <div className="p-3 bg-muted/50 rounded-md border border-dashed">
                <p className="text-sm font-medium mb-1">
                  🍺 Entry Fee Required
                </p>
                <p className="text-xs text-muted-foreground">
                  Upload a photo or video of your drink to start this challenge.
                  This is your entry fee!
                </p>
              </div>
            </div>
          )}

          {step === "result" && (
            <div className="space-y-2">
              <div className="p-3 bg-muted/50 rounded-md border border-dashed">
                <p className="text-sm font-medium mb-1">
                  ✅ Challenge Complete
                </p>
                <p className="text-xs text-muted-foreground">
                  Did you succeed or fail? Select your result below and submit
                  evidence.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Challenge Result *</Label>
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
            </div>
          )}

          {step !== "complete" && (
            <>
              <div className="space-y-2">
                <Label>
                  {step === "start"
                    ? "Upload Photo or Video (Entry Fee) *"
                    : "Upload Photo or Video (Evidence) *"}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  📁 Choose Photo or Video from Library
                </Button>
                <Input
                  ref={fileInputRef}
                  key={fileInputKey}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    resetUpload();
                  }}
                  disabled={loading}
                />
                {file && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Selected: {file.name} (
                      {(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                    {uploadProgress !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Uploading...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        setFileInputKey((prev) => prev + 1);
                        resetUpload();
                      }}
                      disabled={loading}
                      className="w-full"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {error}
                </div>
              )}

              <Button
                disabled={isDisabled || (step === "result" && success === null)}
                onClick={submit}
                className="w-full"
                variant={
                  step === "start"
                    ? "default"
                    : success === true
                    ? "default"
                    : "destructive"
                }
              >
                {loading
                  ? "Submitting..."
                  : step === "start"
                  ? "🍺 Pay Entry Fee & Start Challenge"
                  : success === true
                  ? "✅ Submit Success Result"
                  : "❌ Submit Failure Result"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

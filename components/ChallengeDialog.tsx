"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useMediaUpload } from "@/lib/hooks/useMediaUpload";
import { Camera, CheckCircle } from "lucide-react";

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
  const [challengeDescription, setChallengeDescription] = useState<
    string | null
  >(description || null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    uploadMedia,
    uploading,
    uploadProgress,
    error,
    reset: resetUpload,
    setError: setUploadError,
  } = useMediaUpload();

  // Combined loading state
  const loading = isSubmitting || uploading;

  // Haptic feedback helper
  function vibrate(pattern: number | number[] = 50) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when dialog closes
      setFile(null);
      setFileInputKey((prev) => prev + 1);
      resetUpload();
      setShowSuccess(false);
      setIsSubmitting(false);
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

  async function submit(selectedFile?: File) {
    const fileToUpload = selectedFile || file;

    // Validate photo requirement for both challenge types
    if (!fileToUpload) {
      setUploadError(
        "Please upload a photo or video to complete this challenge."
      );
      return;
    }

    const playerId = localStorage.getItem("player_id");
    if (!playerId) {
      setUploadError("No player session. Please join the game first.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload file directly to Supabase Storage
      const result = await uploadMedia(
        fileToUpload,
        `challenges/${challengeId}`
      );

      if (result.error) {
        vibrate([50, 50, 50]);
        setIsSubmitting(false);
        return;
      }

      // Send URL to API route
      const formData = new FormData();
      formData.append("challengeId", challengeId);
      formData.append("step", "result");
      formData.append("playerId", playerId);
      if (pubId) formData.append("pubId", pubId);
      if (result.mediaUrl) {
        formData.append("mediaUrl", result.mediaUrl);
      }
      // For pub challenges, always submit as success since they only submit when completed
      if (challengeType === "pub") {
        formData.append("success", "true");
      }

      const res = await fetch("/api/challenge", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        setUploadError(errorText);
        vibrate([50, 50, 50]);
        setIsSubmitting(false);
        return;
      }

      // Success!
      vibrate([50, 100, 50]);
      setIsSubmitting(false);

      // Success - clear file and update state
      setFile(null);
      setFileInputKey((prev) => prev + 1);
      resetUpload();

      // Show celebration then close
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setOpen(false);
        onSuccess?.();
      }, 1500);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      vibrate([50, 50, 50]);
      setIsSubmitting(false);
    }
  }

  // Auto-submit when file is selected for both challenge types
  useEffect(() => {
    if (file && !loading && !showSuccess && !error) {
      submit(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Check if player's team already completed this global challenge
  const isTeamCompleted = Boolean(
    challengeType === "global" &&
      playerTeamId &&
      completedByTeamId === playerTeamId
  );

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

        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-center text-xl">
            {showSuccess ? "🎉 Challenge Complete!" : "Complete Challenge"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {showSuccess
              ? "+1 bonus point for your team!"
              : challengeDescription ||
                "Upload evidence to earn a bonus point."}
          </DialogDescription>

          <div className="space-y-4 pt-2">
            {/* Success State */}
            {showSuccess && (
              <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in-50 duration-300">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-green-600">
                  Bonus Point Earned!
                </p>
              </div>
            )}

            {/* Upload State */}
            {loading && !showSuccess && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative w-20 h-20 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-muted" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">
                      {Math.round(uploadProgress || 0)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {(uploadProgress || 0) < 30
                    ? "Preparing..."
                    : "Uploading evidence..."}
                </p>
              </div>
            )}

            {/* File Selection State */}
            {!loading && !showSuccess && (
              <>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-center mb-2">
                  <p className="text-sm font-medium">
                    Complete this challenge to earn{" "}
                    <strong>+1 bonus point</strong>
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full py-8 px-4 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-3 active:scale-[0.98]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-base">Tap to add proof</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Photo or video evidence
                    </p>
                  </div>
                </button>
                <Input
                  ref={fileInputRef}
                  key={fileInputKey}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      setFile(selectedFile);
                      resetUpload();
                    }
                  }}
                />
              </>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="space-y-3">
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg text-center">
                  {error}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFile(null);
                    resetUpload();
                    fileInputRef.current?.click();
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Pub challenge UI - now simplified like global challenges
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

      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-center text-xl">
          {showSuccess ? "🎉 Challenge Complete!" : pubName ? `${pubName} Challenge` : "Pub Challenge"}
        </DialogTitle>
        <DialogDescription className="text-center">
          {showSuccess
            ? "The pub is now locked for your team!"
            : challengeDescription ||
              "Upload evidence to complete this challenge and lock the pub!"}
        </DialogDescription>

        <div className="space-y-4 pt-2">
          {/* Success State */}
          {showSuccess && (
            <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in-50 duration-300">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-green-600">
                Pub Locked!
              </p>
            </div>
          )}

          {/* Upload State */}
          {loading && !showSuccess && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">
                    {Math.round(uploadProgress || 0)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {(uploadProgress || 0) < 30
                  ? "Preparing..."
                  : "Uploading evidence..."}
              </p>
            </div>
          )}

          {/* File Selection State */}
          {!loading && !showSuccess && (
            <>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-center mb-2">
                <p className="text-sm font-medium">
                  Complete this challenge to <strong>lock the pub</strong> for your team
                </p>
              </div>

              <button
                type="button"
                className="w-full py-8 px-4 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-3 active:scale-[0.98]"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-base">Tap to add proof</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Photo or video evidence
                  </p>
                </div>
              </button>
              <Input
                ref={fileInputRef}
                key={fileInputKey}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    setFile(selectedFile);
                    resetUpload();
                  }
                }}
              />
            </>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="space-y-3">
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg text-center">
                {error}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFile(null);
                  resetUpload();
                  fileInputRef.current?.click();
                }}
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

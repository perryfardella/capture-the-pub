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
import { Camera, CheckCircle, XCircle } from "lucide-react";

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

  async function submit(selectedFile?: File) {
    const fileToUpload = selectedFile || file;

    // Validate photo requirement for global challenges
    if (challengeType === "global" && !fileToUpload) {
      setUploadError(
        "Please upload a photo or video to complete this challenge."
      );
      return;
    }
    // Validate photo requirement for pub challenge start step
    if (challengeType === "pub" && step === "start" && !fileToUpload) return;

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

    setIsSubmitting(true);

    try {
      let mediaUrl: string | null = null;

      // Upload file directly to Supabase Storage if provided
      if (fileToUpload) {
        const result = await uploadMedia(
          fileToUpload,
          `challenges/${challengeId}`
        );

        if (result.error) {
          vibrate([50, 50, 50]);
          setIsSubmitting(false);
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

      if (challengeType === "pub") {
        if (step === "start") {
          setStep("result");
          setSuccess(null);
        } else {
          // Challenge result submitted - show confirmation
          setSubmissionResult(success);
          setStep("complete");
        }
      } else {
        // Global challenge completed - show celebration then close
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setOpen(false);
          onSuccess?.();
        }, 1500);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      vibrate([50, 50, 50]);
      setIsSubmitting(false);
    }
  }

  // Auto-submit for global challenges and pub challenge start step when file is selected
  useEffect(() => {
    if (file && !loading && !showSuccess && !error) {
      if (challengeType === "global") {
        submit(file);
      } else if (challengeType === "pub" && step === "start") {
        submit(file);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, challengeType, step]);

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

  // Pub challenge UI
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
          {step === "complete"
            ? submissionResult
              ? "🎉 Challenge Passed!"
              : "Challenge Failed"
            : pubName
            ? `${pubName} Challenge`
            : "Pub Challenge"}
        </DialogTitle>
        <DialogDescription className="text-center">
          {step === "complete"
            ? submissionResult
              ? "The pub is now locked for your team!"
              : "Better luck next time. You can try again."
            : challengeDescription ||
              "Complete this challenge to lock this pub!"}
        </DialogDescription>

        <div className="space-y-4 pt-2">
          {step === "complete" ? (
            // Completion screen
            <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in-50 duration-300">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                  submissionResult ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {submissionResult ? (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                ) : (
                  <XCircle className="h-12 w-12 text-red-600" />
                )}
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
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                    step === "start"
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-green-100 text-green-600"
                  }`}
                >
                  {step === "start" ? "1" : "✓"}
                </div>
                <div
                  className={`flex-1 h-1 rounded ${
                    step === "result" ? "bg-primary" : "bg-muted"
                  }`}
                />
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                    step === "result"
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  2
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span
                  className={
                    step === "start"
                      ? "font-semibold text-foreground"
                      : "text-green-600"
                  }
                >
                  Entry Fee
                </span>
                <span
                  className={
                    step === "result" ? "font-semibold text-foreground" : ""
                  }
                >
                  Result
                </span>
              </div>

              {/* Upload State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-6">
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
                      : "Uploading..."}
                  </p>
                </div>
              )}

              {step === "start" && !loading && (
                <>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                      🍺 Entry Fee Required
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Snap a photo of your drink to start the challenge!
                    </p>
                  </div>

                  <button
                    type="button"
                    className="w-full py-8 px-4 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-all flex flex-col items-center justify-center gap-3 active:scale-[0.98]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                      <Camera className="h-7 w-7 text-amber-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-base text-amber-800">
                        Tap to pay entry fee
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Photo of your drink
                      </p>
                    </div>
                  </button>
                </>
              )}

              {step === "result" && !loading && (
                <>
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm font-medium flex items-center gap-2">
                      ✅ Entry fee paid!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Now report whether you passed or failed the challenge.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Did you pass?</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSuccess(true)}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                          success === true
                            ? "border-green-500 bg-green-50"
                            : "border-muted hover:border-green-300 hover:bg-green-50/50"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            success === true
                              ? "bg-green-500 text-white"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          ✓
                        </div>
                        <span
                          className={`font-medium ${
                            success === true ? "text-green-700" : ""
                          }`}
                        >
                          Passed
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuccess(false)}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                          success === false
                            ? "border-red-500 bg-red-50"
                            : "border-muted hover:border-red-300 hover:bg-red-50/50"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            success === false
                              ? "bg-red-500 text-white"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          ✗
                        </div>
                        <span
                          className={`font-medium ${
                            success === false ? "text-red-700" : ""
                          }`}
                        >
                          Failed
                        </span>
                      </button>
                    </div>
                  </div>

                  {success !== null && (
                    <Button
                      onClick={() => submit()}
                      className="w-full"
                      variant={success ? "default" : "destructive"}
                    >
                      {success ? "✅ Submit Pass" : "❌ Submit Fail"}
                    </Button>
                  )}
                </>
              )}

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
                      if (step === "start") {
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMediaUpload } from "@/lib/hooks/useMediaUpload";
import { Camera, CheckCircle, Loader2 } from "lucide-react";

export function CaptureDialog({
  pubId,
  pubName,
  currentDrinkCount,
  disabled,
  triggerClassName,
  onOpenChange: externalOnOpenChange,
}: {
  pubId: string;
  pubName: string;
  currentDrinkCount: number;
  disabled?: boolean;
  triggerClassName?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    externalOnOpenChange?.(newOpen);
    if (!newOpen) {
      // Reset form when dialog closes
      setFile(null);
      setSuccess(false);
      resetUpload();
    }
  }

  // Haptic feedback helper
  function vibrate(pattern: number | number[] = 50) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  async function submit(selectedFile: File) {
    const playerId = localStorage.getItem("player_id");
    if (!playerId) {
      setUploadError("No player session found. Please rejoin the game.");
      return;
    }

    // Upload media using shared hook
    const result = await uploadMedia(selectedFile, `captures/${pubId}`);

    if (result.error || !result.mediaUrl) {
      // Error is already set by the hook
      vibrate([50, 50, 50]); // Error vibration pattern
      return;
    }

    // Send URL to API route
    const formData = new FormData();
    formData.append("pubId", pubId);
    formData.append("mediaUrl", result.mediaUrl);
    formData.append("playerId", playerId);

    const res = await fetch("/api/capture", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      setUploadError(errorText);
      vibrate([50, 50, 50]); // Error vibration pattern
      return;
    }

    // Success! Show celebration
    vibrate([50, 100, 50]); // Success vibration pattern
    setSuccess(true);

    // Auto-close after celebration
    setTimeout(() => {
      setFile(null);
      setSuccess(false);
      resetUpload();
      setOpen(false);
    }, 1500);
  }

  // Auto-submit when file is selected
  useEffect(() => {
    if (file && !loading && !success && !error) {
      submit(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const nextDrinkCount = currentDrinkCount + 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className={triggerClassName}>
          Capture
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-center text-xl">
          {success ? "🎉 Captured!" : `Capture ${pubName}`}
        </DialogTitle>
        <DialogDescription className="text-center">
          {success
            ? "Nice one! The pub is yours."
            : `Drink #${nextDrinkCount} required. Snap a photo to claim it.`}
        </DialogDescription>

        <div className="space-y-4 pt-2">
          {/* Success State */}
          {success && (
            <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in-50 duration-300">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-green-600">
                Pub Captured!
              </p>
            </div>
          )}

          {/* Upload State */}
          {loading && !success && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-muted" />
                <div
                  className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
                  style={{
                    clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                  }}
                />
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
          {!loading && !success && (
            <>
              <button
                type="button"
                className="w-full py-8 px-4 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-3 active:scale-[0.98]"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-base">
                    Tap to add photo or video
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select from camera or gallery
                  </p>
                </div>
              </button>
              <Input
                ref={fileInputRef}
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

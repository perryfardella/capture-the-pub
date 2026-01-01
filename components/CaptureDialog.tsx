"use client";

import { useState, useRef } from "react";
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
import { useMediaUpload } from "@/lib/hooks/useMediaUpload";

export function CaptureDialog({
  pubId,
  pubName,
  currentDrinkCount,
  disabled,
}: {
  pubId: string;
  pubName: string;
  currentDrinkCount: number;
  disabled?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
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
    if (!newOpen) {
      // Reset form when dialog closes
      setFile(null);
      resetUpload();
    }
  }

  async function submit() {
    // Frontend validation
    if (!file) {
      return;
    }

    const playerId = localStorage.getItem("player_id");
    if (!playerId) {
      return;
    }

    // Upload media using shared hook
    const result = await uploadMedia(file, `captures/${pubId}`);

    if (result.error || !result.mediaUrl) {
      // Error is already set by the hook
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
      return;
    }

    // Reset form on success and close dialog
    setFile(null);
    resetUpload();
    setOpen(false);
  }

  const nextDrinkCount = currentDrinkCount + 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Capture</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Capture {pubName}</DialogTitle>
        <DialogDescription>
          Submit photo or video evidence to capture this pub for your team.
        </DialogDescription>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              To capture this pub, you need to drink{" "}
              <strong>{nextDrinkCount}</strong> drink(s).
            </p>
          </div>

          <div className="space-y-2">
            <Label>Photo or Video Evidence *</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Choose Photo or Video from Library
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                resetUpload();
              }}
            />
            {file && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}
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

          <Button disabled={loading} onClick={submit} className="w-full">
            {loading ? "Submitting..." : "Submit Capture"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

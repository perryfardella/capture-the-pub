"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when dialog closes
      setFile(null);
      setError(null);
    }
  }

  async function submit() {
    // Frontend validation
    if (!file) {
      setError("Please select a photo or video to submit as evidence.");
      return;
    }

    const playerId = localStorage.getItem("player_id");
    if (!playerId) {
      setError("No player session. Please join the game first.");
      return;
    }

    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("pubId", pubId);
    formData.append("file", file);
    formData.append("playerId", playerId);

    const res = await fetch("/api/capture", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      setError(errorText);
      setLoading(false);
      return;
    }

    // Reset form on success and close dialog
    setFile(null);
    setError(null);
    setLoading(false);
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
                setError(null);
              }}
            />
            {file && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Selected: {file.name}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFile(null)}
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

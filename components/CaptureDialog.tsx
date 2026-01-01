"use client";

import { useState } from "react";
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Capture</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Capture {pubName}</DialogTitle>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              To capture this pub, you need to:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Submit a photo or video as evidence</li>
              <li>
                Drink count will increase from {currentDrinkCount} to{" "}
                {nextDrinkCount}
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence-file">Photo or Video Evidence *</Label>
            <Input
              id="evidence-file"
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name}
              </p>
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

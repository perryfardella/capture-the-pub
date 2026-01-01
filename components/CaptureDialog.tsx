"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export function CaptureDialog({
  pubId,
  pubName,
  disabled,
}: {
  pubId: string;
  pubName: string;
  disabled?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("pubId", pubId);
    formData.append("file", file);

    const res = await fetch("/api/capture", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      alert(await res.text());
    }

    setLoading(false);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Capture</Button>
      </DialogTrigger>

      <DialogContent>
        <h2 className="font-bold">Capture {pubName}</h2>

        <Input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <Button disabled={loading} onClick={submit}>
          Submit Capture
        </Button>
      </DialogContent>
    </Dialog>
  );
}

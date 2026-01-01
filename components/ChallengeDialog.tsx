"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChallengeDialog({
  challengeId,
  challengeType,
  pubId,
  pubName,
  disabled,
}: {
  challengeId: string;
  challengeType: "pub" | "global";
  pubId?: string;
  pubName?: string;
  disabled?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"start" | "result">(
    challengeType === "pub" ? "start" : "result"
  );
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!file && challengeType === "pub") return;
    setLoading(true);

    const formData = new FormData();
    formData.append("challengeId", challengeId);
    formData.append("step", step);
    if (pubId) formData.append("pubId", pubId);
    if (file) formData.append("file", file);

    const res = await fetch("/api/challenge", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      alert(await res.text());
    } else {
      if (challengeType === "pub") {
        if (step === "start") {
          setStep("result");
          alert("Challenge started! Now attempt it and submit result.");
        } else {
          setStep("start"); // reset for retry
        }
      } else {
        alert("Global challenge completed! Bonus point awarded.");
      }
    }

    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <h3 className="font-bold">
        {pubName ? `${pubName} Challenge` : "Global Challenge"}
      </h3>

      <Input
        type="file"
        accept="image/*,video/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <Button
        disabled={disabled || (challengeType === "pub" && !file)}
        onClick={submit}
      >
        {challengeType === "pub"
          ? step === "start"
            ? "Start Challenge (Pay Drink)"
            : "Submit Challenge Result"
          : "Submit Challenge Completion"}
      </Button>
    </div>
  );
}

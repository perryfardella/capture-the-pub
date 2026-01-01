"use client";

import { useState, useRef, useEffect } from "react";
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
  const [cameraActive, setCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaType, setMediaType] = useState<"photo" | "video">("photo");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  async function startCamera() {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Prefer back camera on mobile
        audio: mediaType === "video",
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setError(
        "Could not access camera. Please check permissions and try again."
      );
      console.error("Camera error:", err);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsRecording(false);
  }

  function capturePhoto() {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setFile(file);
        stopCamera();
      }
    }, "image/jpeg");
  }

  function startRecording() {
    if (!streamRef.current || !videoRef.current) return;

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4",
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: mediaRecorder.mimeType,
      });
      const file = new File(
        [blob],
        `capture-${Date.now()}.${
          mediaRecorder.mimeType.includes("webm") ? "webm" : "mp4"
        }`,
        { type: blob.type }
      );
      setFile(file);
      stopCamera();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      // Clean up when dialog closes
      stopCamera();
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

            {!cameraActive && !file && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 w-full sm:w-auto"
                  onClick={startCamera}
                >
                  <span className="whitespace-nowrap">📷 Take Photo/Video</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 w-full sm:w-auto"
                  onClick={() => libraryInputRef.current?.click()}
                >
                  <span className="whitespace-nowrap">
                    📁 Choose from Library
                  </span>
                </Button>
              </div>
            )}

            {cameraActive && (
              <div className="space-y-2">
                <div className="relative w-full bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-[400px] object-contain"
                  />
                  {isRecording && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-sm font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Recording...
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={mediaType === "photo" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setMediaType("photo")}
                      disabled={isRecording}
                    >
                      Photo
                    </Button>
                    <Button
                      type="button"
                      variant={mediaType === "video" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setMediaType("video")}
                      disabled={isRecording}
                    >
                      Video
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {mediaType === "photo" ? (
                      <Button
                        type="button"
                        onClick={capturePhoto}
                        className="flex-1"
                      >
                        📸 Capture Photo
                      </Button>
                    ) : (
                      <>
                        {!isRecording ? (
                          <Button
                            type="button"
                            onClick={startRecording}
                            className="flex-1"
                          >
                            🎥 Start Recording
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={stopRecording}
                            variant="destructive"
                            className="flex-1"
                          >
                            ⏹️ Stop Recording
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={stopCamera}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Input
              ref={libraryInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
            />
            {file && !cameraActive && (
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

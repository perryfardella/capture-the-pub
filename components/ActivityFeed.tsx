"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// TODO
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ActivityFeed({ feed }: { feed: any[] }) {
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);

  return (
    <>
      <style jsx>{`
        :global([data-slot="dialog-content"]) img,
        :global([data-slot="dialog-content"]) video,
        :global([data-slot="dialog-content"]) span {
          border: none !important;
          outline: none !important;
        }
      `}</style>
      <div className="space-y-1.5">
        {feed.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No activity yet
          </p>
        ) : (
          <div className="space-y-1">
            {feed.map((item) => (
              <div
                key={item.id + item.type}
                className="flex flex-col border-b border-border/50 pb-2 last:border-0"
              >
                {/* Header row with team name and timestamp */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight">
                      {item.type === "capture" && (
                        <>
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-1.5"
                            style={{
                              backgroundColor: item.teams?.color || "#666",
                            }}
                          />
                          <span className="font-semibold">
                            {item.players?.nickname || "Unknown Player"}
                          </span>{" "}
                          from{" "}
                          <span className="font-semibold">
                            {item.teams?.name || "Unknown Team"}
                          </span>{" "}
                          captured{" "}
                          <span className="font-semibold">
                            {item.pubName || item.pub_id}
                          </span>{" "}
                          with {item.drink_count || 0}{" "}
                          {item.drink_count === 1 ? "drink" : "drinks"}
                        </>
                      )}
                      {item.type === "challenge" && (
                        <>
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-1.5"
                            style={{
                              backgroundColor: item.teams?.color || "#666",
                            }}
                          />
                          <span className="font-semibold">
                            {item.players?.nickname || "Unknown Player"}
                          </span>{" "}
                          from{" "}
                          <span className="font-semibold">
                            {item.teams?.name || "Unknown Team"}
                          </span>{" "}
                          {item.step === "start"
                            ? "started"
                            : item.success
                            ? "succeeded"
                            : "failed"}{" "}
                          {item.pubName ? (
                            <>
                              the challenge at{" "}
                              <span className="font-semibold">
                                {item.pubName}
                              </span>
                            </>
                          ) : (
                            "global challenge"
                          )}
                          {item.challengeDescription && (
                            <>
                              {" "}
                              <span className="text-muted-foreground">
                                ({item.challengeDescription})
                              </span>
                            </>
                          )}
                        </>
                      )}
                      {item.type === "bonus" && (
                        <>
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-1.5"
                            style={{
                              backgroundColor: item.teams?.color || "#666",
                            }}
                          />
                          <span className="font-semibold">
                            {item.players?.nickname || "Unknown Player"}
                          </span>{" "}
                          from{" "}
                          <span className="font-semibold">
                            {item.teams?.name || "Unknown Team"}
                          </span>{" "}
                          completed{" "}
                          {item.challengeDescription ? (
                            <>
                              <span className="font-semibold">
                                {item.challengeDescription}
                              </span>{" "}
                            </>
                          ) : (
                            "global challenge "
                          )}
                          and earned a bonus point! 🎉
                        </>
                      )}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Media thumbnail - clickable */}
                {item.media_url && (
                  <button
                    onClick={() => setPreviewMedia(item.media_url)}
                    className="mt-1.5 rounded overflow-hidden w-full text-left cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary border-0 p-0 block"
                    style={{ border: "none", outline: "none" }}
                  >
                    {item.media_url.endsWith(".mp4") ? (
                      <video
                        src={item.media_url}
                        className="w-full max-h-48 object-cover pointer-events-none block border-0 outline-0"
                        style={{
                          border: "none",
                          outline: "none",
                          display: "block",
                        }}
                        playsInline
                        muted
                      />
                    ) : (
                      <div
                        className="w-full border-0 outline-0"
                        style={{ border: "none", outline: "none" }}
                      >
                        <Image
                          src={item.media_url}
                          alt="evidence"
                          width={400}
                          height={300}
                          className="w-full max-h-48 object-cover pointer-events-none block border-0 outline-0"
                          style={{
                            border: "none",
                            outline: "none",
                            display: "block",
                          }}
                          unoptimized
                        />
                      </div>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Dialog
        open={!!previewMedia}
        onOpenChange={(open) => !open && setPreviewMedia(null)}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0 rounded-none">
          <DialogTitle className="sr-only">
            {previewMedia?.endsWith(".mp4") ? "Video Preview" : "Image Preview"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {previewMedia?.endsWith(".mp4")
              ? "Video evidence preview"
              : "Image evidence preview"}
          </DialogDescription>
          {previewMedia && (
            <div className="flex items-center justify-center w-full h-full border-0 p-0">
              {previewMedia.endsWith(".mp4") ? (
                <video
                  src={previewMedia}
                  controls
                  autoPlay
                  className="max-w-full max-h-[90vh] w-auto h-auto border-0 outline-0"
                  style={{ border: "none", outline: "none" }}
                  playsInline
                />
              ) : (
                <div
                  className="border-0 outline-0 bg-transparent [&_span]:border-0 [&_span]:outline-0 [&_span]:bg-transparent [&_img]:border-0 [&_img]:outline-0"
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                  }}
                >
                  <Image
                    src={previewMedia}
                    alt="Preview"
                    width={1200}
                    height={1200}
                    className="max-w-full max-h-[90vh] w-auto h-auto object-contain border-0 outline-0"
                    style={{
                      border: "none",
                      outline: "none",
                      display: "block",
                    }}
                    unoptimized
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

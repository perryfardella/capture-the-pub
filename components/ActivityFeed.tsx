"use client";

import { useState, useEffect, useRef } from "react";
import Image, { ImageProps } from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CachedImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string;
  alt: string;
}

interface CachedVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
}

interface ActivityFeedItem {
  id: string;
  type: "capture" | "challenge" | "bonus" | "admin";
  created_at: string;
  media_url?: string;
  players?: {
    nickname: string;
  };
  teams?: {
    name: string;
    color: string;
  };
  pubName?: string;
  pub_id?: string;
  drink_count?: number;
  step?: string;
  success?: boolean;
  challengeDescription?: string;
  description?: string;
}

// Component for optimized image loading with caching
function CachedImage({ src, alt, ...props }: CachedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      {...props}
      // Enable Next.js optimization instead of unoptimized
      priority={false}
      // Add caching headers
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGBkbHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
    />
  );
}

// Component for optimized video loading
function CachedVideo({ src, ...props }: CachedVideoProps) {
  return (
    <video
      src={src}
      {...props}
      preload="metadata"
      // Add caching by setting longer cache control
      style={{ ...props.style }}
    />
  );
}

export function ActivityFeed({ feed }: { feed: ActivityFeedItem[] }) {
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const prevFeedIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track new items for animation
  useEffect(() => {
    const currentIds = new Set(feed.map((item) => item.id + item.type));
    const prevIds = prevFeedIdsRef.current;

    // Skip animation on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      prevFeedIdsRef.current = currentIds;
      return;
    }

    // Find new items
    const newIds = new Set<string>();
    currentIds.forEach((id) => {
      if (!prevIds.has(id)) {
        newIds.add(id);
      }
    });

    if (newIds.size > 0) {
      // Use queueMicrotask to defer state update to avoid synchronous setState warning
      queueMicrotask(() => {
        setNewItemIds(newIds);

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Clear animation state after animation completes
        timeoutRef.current = setTimeout(() => {
          setNewItemIds(new Set());
        }, 800);
      });
    }

    prevFeedIdsRef.current = currentIds;

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [feed]);

  const getItemIcon = (type: string, step?: string, success?: boolean) => {
    if (type === "capture") return "🍺";
    if (type === "bonus") return "⭐";
    if (type === "admin") return "👨‍💼";
    if (type === "challenge") {
      if (step === "start") return "🎯";
      return success ? "✅" : "❌";
    }
    return "📝";
  };

  if (feed.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">📸</div>
        <p className="text-muted-foreground">No activity yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Captures and challenges will appear here
        </p>
      </div>
    );
  }

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
      <div className="space-y-3">
        {feed.map((item, index) => {
          const itemKey = item.id + item.type;
          const isNew = newItemIds.has(itemKey);
          // Admin actions get a special purple color
          const teamColor =
            item.type === "admin" ? "#9333ea" : item.teams?.color || "#666";

          return (
            <div
              key={itemKey}
              className={`relative rounded-xl border overflow-hidden transition-all ${
                isNew ? "animate-slide-in-top" : ""
              }`}
              style={{
                borderColor: teamColor + "40",
                backgroundColor: teamColor + "08",
                animationDelay: isNew ? `${index * 50}ms` : undefined,
              }}
            >
              {/* Team color accent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: teamColor }}
              />

              <div className="pl-4 pr-3 py-3">
                {/* Header row */}
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: teamColor + "20" }}
                  >
                    {getItemIcon(item.type, item.step, item.success)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-snug">
                        {item.type === "capture" && (
                          <>
                            <span className="font-semibold">
                              {item.players?.nickname || "Unknown"}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              captured{" "}
                            </span>
                            <span className="font-semibold">
                              {item.pubName || item.pub_id}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              ({item.drink_count || 0}{" "}
                              {item.drink_count === 1 ? "drink" : "drinks"})
                            </span>
                          </>
                        )}
                        {item.type === "challenge" && (
                          <>
                            <span className="font-semibold">
                              {item.players?.nickname || "Unknown"}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              {item.step === "start"
                                ? "started"
                                : item.success
                                ? "completed the"
                                : "failed"}{" "}
                            </span>
                            {item.pubName ? (
                              <>
                                <span className="font-semibold">
                                  {item.pubName}
                                </span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  challenge
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">
                                a challenge
                              </span>
                            )}
                            {item.challengeDescription && (
                              <span className="text-muted-foreground">
                                {" "}
                                - {item.challengeDescription}
                              </span>
                            )}
                          </>
                        )}
                        {item.type === "bonus" && (
                          <>
                            <span className="font-semibold">
                              {item.players?.nickname || "Unknown"}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              earned{" "}
                            </span>
                            <span className="font-semibold text-amber-600">
                              +1 bonus point
                            </span>
                            {item.challengeDescription && (
                              <span className="text-muted-foreground">
                                {" "}
                                for the global challenge -{" "}
                                {item.challengeDescription}
                              </span>
                            )}
                          </>
                        )}
                        {item.type === "admin" && (
                          <>
                            <span className="font-semibold text-purple-400">
                              Admin
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              {item.description}
                            </span>
                            {item.teams && (
                              <span className="text-muted-foreground">
                                {" "}
                                for{" "}
                                <span className="font-semibold">
                                  {item.teams.name}
                                </span>
                              </span>
                            )}
                            {item.pubName && (
                              <span className="text-muted-foreground">
                                {" "}
                                at{" "}
                                <span className="font-semibold">
                                  {item.pubName}
                                </span>
                              </span>
                            )}
                          </>
                        )}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                        {new Date(item.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Media thumbnail */}
                {item.media_url && (
                  <button
                    onClick={() => setPreviewMedia(item.media_url || null)}
                    className="mt-3 ml-11 rounded-lg overflow-hidden w-[calc(100%-2.75rem)] text-left cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary border-0 p-0 block"
                  >
                    {item.media_url.endsWith(".mp4") ? (
                      <CachedVideo
                        src={item.media_url}
                        className="w-full max-h-40 object-cover pointer-events-none block rounded-lg"
                        playsInline
                        muted
                      />
                    ) : (
                      <CachedImage
                        src={item.media_url}
                        alt="evidence"
                        width={400}
                        height={300}
                        className="w-full max-h-40 object-cover pointer-events-none block rounded-lg"
                      />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
                <CachedVideo
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
                  <CachedImage
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

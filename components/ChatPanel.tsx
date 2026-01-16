"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatMessages, ChatMessage } from "@/lib/hooks/useChatMessages";
import { useMediaUpload } from "@/lib/hooks/useMediaUpload";
import { usePlayer } from "@/lib/hooks/usePlayer";
import { Send, Loader2, ImageIcon, X } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({
  message,
  isOwnMessage,
  onMediaClick,
}: {
  message: ChatMessage;
  isOwnMessage: boolean;
  onMediaClick: (url: string) => void;
}) {
  const teamColor = message.teams?.color || "#666";
  const isVideo = message.media_url?.includes(".mp4");

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isOwnMessage ? "rounded-br-sm" : "rounded-bl-sm"
        }`}
        style={{
          backgroundColor: teamColor + "15",
          borderColor: teamColor + "30",
          borderWidth: 1,
        }}
      >
        {/* Sender name (not shown for own messages) */}
        {!isOwnMessage && (
          <div className="text-xs font-semibold mb-1" style={{ color: teamColor }}>
            {message.players?.nickname || "Unknown"}
          </div>
        )}

        {/* Media (if present) */}
        {message.media_url && (
          <div className="mb-2 rounded-lg overflow-hidden">
            {isVideo ? (
              <video
                src={message.media_url}
                controls
                className="max-w-full max-h-48 rounded-lg"
                playsInline
              />
            ) : (
              <Image
                src={message.media_url}
                alt="Chat image"
                width={300}
                height={200}
                className="max-w-full max-h-48 object-cover rounded-lg cursor-pointer"
                onClick={() => onMediaClick(message.media_url!)}
              />
            )}
          </div>
        )}

        {/* Text content */}
        {message.content && (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {/* Timestamp */}
        <div className="text-[10px] text-muted-foreground mt-1 text-right">
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}

export function ChatPanel() {
  const { player } = usePlayer();
  const {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    addOptimisticMessage,
  } = useChatMessages();

  const [messageText, setMessageText] = useState("");
  const [pendingMedia, setPendingMedia] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);

  const {
    uploadMedia,
    uploading,
    uploadProgress,
    error: uploadError,
    reset: resetUpload,
  } = useMediaUpload();

  // Track scroll position to detect "at bottom"
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if scrolled to top (for loading more)
    if (container.scrollTop < 50 && hasNextPage && !isFetchingNextPage) {
      prevScrollHeightRef.current = container.scrollHeight;
      fetchNextPage();
    }

    // Track if at bottom for auto-scroll on new messages
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;
    isAtBottomRef.current = isAtBottom;
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Maintain scroll position after loading more messages
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isFetchingNextPage) return;

    if (prevScrollHeightRef.current > 0) {
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      if (scrollDiff > 0) {
        container.scrollTop = scrollDiff;
      }
      prevScrollHeightRef.current = 0;
    }
  }, [messages, isFetchingNextPage]);

  // Auto-scroll to bottom on new messages (if already at bottom)
  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
    }
  }, [isLoading, messages.length === 0]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingMedia(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // Clear pending media
  const clearPendingMedia = () => {
    setPendingMedia(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    resetUpload();
  };

  // Send message
  const handleSend = async () => {
    if (!player) return;
    if (!messageText.trim() && !pendingMedia) return;

    setIsSending(true);
    const currentText = messageText;
    const currentMedia = pendingMedia;

    // Clear form immediately for better UX
    setMessageText("");

    try {
      let mediaUrl: string | null = null;

      // Upload media if present
      if (currentMedia) {
        const result = await uploadMedia(currentMedia, `chat/${player.id}`);
        if (result.error) {
          // Restore message text on error
          setMessageText(currentText);
          setIsSending(false);
          return;
        }
        mediaUrl = result.mediaUrl;
      }

      // Send to API
      const formData = new FormData();
      formData.append("playerId", player.id);
      if (currentText.trim()) {
        formData.append("content", currentText.trim());
      }
      if (mediaUrl) {
        formData.append("mediaUrl", mediaUrl);
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to send message:", errorText);
        // Restore message text on error
        setMessageText(currentText);
        setIsSending(false);
        return;
      }

      const { message } = await res.json();

      // Add to UI optimistically
      addOptimisticMessage(message);

      // Clear media preview
      clearPendingMedia();

      // Scroll to bottom
      isAtBottomRef.current = true;
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isDisabled = isSending || uploading;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Messages container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-2"
        >
          {/* Loading more indicator */}
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Load more hint */}
          {hasNextPage && !isFetchingNextPage && (
            <div className="text-center py-2">
              <span className="text-xs text-muted-foreground">
                Scroll up for older messages
              </span>
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to say something!
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={message.player_id === player?.id}
              onMediaClick={setPreviewMedia}
            />
          ))}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>

        {/* Media preview */}
        {previewUrl && (
          <div className="px-4 py-2 border-t bg-muted/30">
            <div className="relative inline-block">
              {pendingMedia?.type.startsWith("video/") ? (
                <video
                  src={previewUrl}
                  className="h-20 w-20 object-cover rounded-lg"
                />
              ) : (
                <Image
                  src={previewUrl}
                  alt="Preview"
                  width={80}
                  height={80}
                  className="h-20 w-20 object-cover rounded-lg"
                />
              )}
              <button
                onClick={clearPendingMedia}
                disabled={isDisabled}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-destructive/90 disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            {uploading && (
              <div className="text-xs text-muted-foreground mt-1">
                Uploading... {Math.round(uploadProgress || 0)}%
              </div>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="px-4 py-3 border-t bg-background">
          <div className="flex items-end gap-2">
            {/* Image button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled}
              className="shrink-0"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Text input */}
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isDisabled}
              className="flex-1"
            />

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={isDisabled || (!messageText.trim() && !pendingMedia)}
              size="icon"
              className="shrink-0"
            >
              {isSending || uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          {uploadError && (
            <div className="text-xs text-destructive mt-2">{uploadError}</div>
          )}
        </div>
      </div>

      {/* Media preview dialog */}
      <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          <DialogDescription className="sr-only">
            Full size image preview
          </DialogDescription>
          {previewMedia && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <Image
                src={previewMedia}
                alt="Preview"
                width={800}
                height={600}
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

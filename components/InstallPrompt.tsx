"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    // Check if user has dismissed before
    const dismissed = localStorage.getItem("install-prompt-dismissed");
    if (dismissed === "true") {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
      setIsInstalled(true);
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("install-prompt-dismissed", "true");
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Install App
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Install Capture the Pub for a better experience. Add it to your home
            screen for quick access.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleInstall} className="text-xs h-8">
              Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-xs h-8"
            >
              Maybe Later
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}


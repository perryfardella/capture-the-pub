"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, Plus, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "unknown">("unknown");
  const [browser, setBrowser] = useState<"safari" | "chrome" | "other">("other");

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    const isChrome = /chrome|crios/.test(userAgent);

    if (isIOS) {
      setPlatform("ios");
      setBrowser(isSafari ? "safari" : "other");
    } else if (isAndroid) {
      setPlatform("android");
      setBrowser(isChrome ? "chrome" : "other");
    } else {
      setPlatform("desktop");
      setBrowser(isChrome ? "chrome" : "other");
    }

    // Listen for the beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );
    window.addEventListener("appinstalled", handleAppInstalled);

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
      setIsInstalled(true);
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="p-4 space-y-6 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">App Installed! 🎉</h1>
          <p className="text-muted-foreground">
            Capture the Pub is now installed on your device.
          </p>
          <Link href="/">
            <Button className="mt-4">Go to Game</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Install App</h1>
          <p className="text-sm text-muted-foreground">
            Add Capture the Pub to your home screen
          </p>
        </div>
      </div>

      {/* Android Chrome - Automatic Install */}
      {platform === "android" && browser === "chrome" && deferredPrompt && (
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Download className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold text-base mb-2">
                  Quick Install (Android Chrome)
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Click the button below to install the app directly.
                </p>
                <Button onClick={handleInstall} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Install Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Instructions */}
      {platform === "ios" && browser === "safari" && (
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Share className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold text-base mb-2">
                  Install on iPhone/iPad (Safari)
                </h2>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                      1
                    </span>
                    <span className="pt-0.5">
                      Tap the <strong>Share</strong> button{" "}
                      <Share className="h-4 w-4 inline align-text-bottom" /> at
                      the bottom of the screen
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                      2
                    </span>
                    <span className="pt-0.5">
                      Scroll down and tap{" "}
                      <strong className="flex items-center gap-1">
                        <Plus className="h-4 w-4 inline" /> Add to Home Screen
                      </strong>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                      3
                    </span>
                    <span className="pt-0.5">
                      Tap <strong>Add</strong> in the top right corner
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Android Other Browser Instructions */}
      {platform === "android" && browser !== "chrome" && (
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Share className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold text-base mb-2">
                  Install on Android
                </h2>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                      1
                    </span>
                    <span className="pt-0.5">
                      Tap the <strong>Menu</strong> button (three dots) in the
                      top right corner
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                      2
                    </span>
                    <span className="pt-0.5">
                      Look for <strong>Add to Home screen</strong> or{" "}
                      <strong>Install app</strong>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                      3
                    </span>
                    <span className="pt-0.5">
                      Tap <strong>Install</strong> or <strong>Add</strong>
                    </span>
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Tip:</strong> For the best experience, use Chrome
                  browser on Android.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Instructions */}
      {platform === "desktop" && (
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Download className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold text-base mb-2">
                  Install on Desktop
                </h2>
                {browser === "chrome" && deferredPrompt ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click the button below to install the app.
                    </p>
                    <Button onClick={handleInstall} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Install Now
                    </Button>
                  </>
                ) : (
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                        1
                      </span>
                      <span className="pt-0.5">
                        Look for the install icon{" "}
                        <Download className="h-4 w-4 inline align-text-bottom" />{" "}
                        in your browser&apos;s address bar
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                        2
                      </span>
                      <span className="pt-0.5">
                        Click it and select <strong>Install</strong>
                      </span>
                    </li>
                  </ol>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Note:</strong> This app is optimized for mobile
                  devices. For the best experience, install on your phone.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="space-y-3">
        <h2 className="font-semibold text-base">Why Install?</h2>
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <span className="text-lg shrink-0">📱</span>
            <div>
              <p className="font-medium text-sm">App-like Experience</p>
              <p className="text-xs text-muted-foreground">
                Quick access from your home screen
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <span className="text-lg shrink-0">🔔</span>
            <div>
              <p className="font-medium text-sm">Push Notifications</p>
              <p className="text-xs text-muted-foreground">
                Get real-time updates about captures and challenges
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <span className="text-lg shrink-0">⚡</span>
            <div>
              <p className="font-medium text-sm">Faster Loading</p>
              <p className="text-xs text-muted-foreground">
                Works offline and loads faster
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Game Link */}
      <div className="pt-4">
        <Link href="/">
          <Button variant="outline" className="w-full">
            Back to Game
          </Button>
        </Link>
      </div>
    </div>
  );
}


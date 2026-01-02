"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, ChevronDown } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallState = "ready" | "installing" | "installed";

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>("ready");
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "unknown">("unknown");
  const [browser, setBrowser] = useState<"safari" | "chrome" | "other">("other");
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstallState("installed");
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
      // Don't immediately show installed - keep showing "installing" for a bit
      // The installing state handles the delay
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Handle countdown for installed state
  useEffect(() => {
    if (installState === "installed" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [installState, countdown]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show installing state
    setInstallState("installing");

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      // Keep showing "installing" for a few seconds even after acceptance
      // This prevents issues with closing browser too early
      setTimeout(() => {
        setInstallState("installed");
      }, 3000);
    } else {
      // User dismissed - go back to ready state
      setInstallState("ready");
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
  };

  // Installing state - show "don't close browser" message
  if (installState === "installing") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm">
          {/* Animated beer */}
          <div className="relative">
            <div className="text-8xl animate-bounce">🍺</div>
            <div className="absolute -top-2 -right-2 text-2xl animate-ping">✨</div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-amber-900">Installing...</h1>
            <p className="text-amber-700 font-medium">Hang tight legend!</p>
          </div>

          {/* Warning message */}
          <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4">
            <p className="text-amber-800 font-semibold text-lg">⚠️ Don&apos;t close your browser!</p>
            <p className="text-amber-700 text-sm mt-1">
              Keep this page open until the install finishes
            </p>
          </div>

          {/* Loading indicator */}
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  // Installed state - celebration!
  if (installState === "installed") {
    const isCountdownComplete = countdown === 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm animate-in zoom-in-50 duration-500">
          {/* Celebration */}
          <div className="text-8xl">{isCountdownComplete ? "🎉" : "⏳"}</div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-green-800">
              {isCountdownComplete ? "You're all set!" : "Installing..."}
            </h1>
            <p className="text-green-600 text-lg">
              {isCountdownComplete 
                ? "App installed successfully" 
                : `Ready in ${countdown} seconds...`}
            </p>
          </div>

          {isCountdownComplete ? (
            <div className="bg-green-100 border-2 border-green-300 rounded-xl p-5 space-y-3">
              <p className="text-green-800 font-semibold text-lg">
                🏠 Find the app on your home screen
              </p>
              <p className="text-green-700">
                Close this browser and tap the <strong>Capture the Pub</strong> icon to get started!
              </p>
              <div className="pt-2 text-4xl">🍻</div>
            </div>
          ) : (
            <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4">
              <p className="text-amber-800 font-semibold">⚠️ Don&apos;t close yet!</p>
              <p className="text-amber-700 text-sm mt-1">
                Finishing up the installation...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Ready state - show install instructions
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Hero Section */}
      <div className="px-6 pt-12 pb-8 text-center">
        <div className="text-7xl mb-4">🍻</div>
        <h1 className="text-3xl font-black text-amber-900 mb-2">Capture the Pub</h1>
        <p className="text-lg text-amber-700 font-medium">Reuben&apos;s Bucks Party</p>
      </div>

      {/* Install Card */}
      <div className="px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 overflow-hidden max-w-md mx-auto">
          {/* Android Chrome - One tap install */}
          {platform === "android" && browser === "chrome" && deferredPrompt && (
            <div className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Download className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Get the App</h2>
                <p className="text-gray-600">One tap and you&apos;re in, legend</p>
              </div>

              <Button
                onClick={handleInstall}
                size="lg"
                className="w-full text-lg py-6 bg-amber-500 hover:bg-amber-600 text-white font-bold"
              >
                <Download className="h-5 w-5 mr-2" />
                Install Now
              </Button>
            </div>
          )}

          {/* Android without prompt ready */}
          {platform === "android" && !deferredPrompt && (
            <div className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Download className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Get the App</h2>
                <p className="text-gray-600">
                  {browser === "chrome" 
                    ? "Loading install button..." 
                    : "Open this page in Chrome for the best experience"}
                </p>
              </div>

              {browser !== "chrome" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Tip:</strong> Copy this link and open it in Chrome browser for easy install
                  </p>
                </div>
              )}
            </div>
          )}

          {/* iOS Safari Instructions */}
          {platform === "ios" && browser === "safari" && (
            <div className="p-6 space-y-5">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Share className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Add to Home Screen</h2>
                <p className="text-gray-600">Three quick taps and you&apos;re in</p>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-3 bg-amber-50 rounded-xl">
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                    1
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-semibold text-gray-900">
                      Tap the Share button
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Share className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-gray-600">at the bottom of Safari</span>
                    </div>
                  </div>
                </div>

                {/* Animated arrow pointing down */}
                <div className="flex justify-center">
                  <ChevronDown className="h-6 w-6 text-amber-400 animate-bounce" />
                </div>

                <div className="flex items-start gap-4 p-3 bg-amber-50 rounded-xl">
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                    2
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-semibold text-gray-900">
                      Scroll down and tap
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded font-medium">
                        <span className="text-lg">+</span> Add to Home Screen
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 bg-amber-50 rounded-xl">
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                    3
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-semibold text-gray-900">
                      Tap Add (top right)
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Then open the app from your home screen
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual pointer to share button */}
              <div className="fixed bottom-0 left-0 right-0 pb-8 flex justify-center pointer-events-none">
                <div className="flex flex-col items-center animate-bounce">
                  <div className="bg-amber-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                    Tap Share below 👇
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* iOS not Safari */}
          {platform === "ios" && browser !== "safari" && (
            <div className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-3xl">
                  🧭
                </div>
                <h2 className="text-xl font-bold text-gray-900">Open in Safari</h2>
                <p className="text-gray-600">iOS requires Safari to install apps</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-sm text-amber-800 font-medium">
                  Copy this link and open it in Safari:
                </p>
                <div className="bg-white rounded-lg p-3 border text-sm font-mono text-gray-700 break-all">
                  {typeof window !== "undefined" ? window.location.href : ""}
                </div>
              </div>
            </div>
          )}

          {/* Desktop */}
          {platform === "desktop" && (
            <div className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-3xl">
                  📱
                </div>
                <h2 className="text-xl font-bold text-gray-900">Mobile Only</h2>
                <p className="text-gray-600">
                  This game is designed for your phone
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-sm text-amber-800 font-medium text-center">
                  Open this page on your phone to install the app
                </p>
              </div>

              {browser === "chrome" && deferredPrompt && (
                <Button
                  onClick={handleInstall}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install on Desktop Anyway
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Why Install Section */}
      <div className="px-4 pb-12">
        <div className="max-w-md mx-auto space-y-3">
          <h3 className="text-center text-amber-800 font-bold text-lg mb-4">Why Install?</h3>
          
          <div className="flex items-center gap-3 bg-white/80 rounded-xl p-4">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-semibold text-gray-900">Works Offline</p>
              <p className="text-sm text-gray-600">No worries about dodgy pub wifi</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white/80 rounded-xl p-4">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-semibold text-gray-900">Get Notifications</p>
              <p className="text-sm text-gray-600">Know when pubs get captured</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white/80 rounded-xl p-4">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="font-semibold text-gray-900">Quick Access</p>
              <p className="text-sm text-gray-600">One tap from your home screen</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

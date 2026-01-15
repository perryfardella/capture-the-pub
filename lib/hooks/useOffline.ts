import { useEffect, useState } from "react";

export function useOffline() {
  const [offline, setOffline] = useState(() => {
    // Check if we're in the browser before accessing navigator
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      return !navigator.onLine;
    }
    // Default to online (false) during SSR
    return false;
  });

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);

    // Subscribe to online/offline events
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return offline;
}

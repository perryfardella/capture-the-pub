"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface AnimatedItem {
  id: string;
  type: "flash" | "pulse" | "slide" | "glow";
  color?: string;
  timestamp: number;
}

interface UseRealtimeAnimationsOptions {
  /** Duration in ms before animation state is cleared (default: 2000) */
  animationDuration?: number;
}

/**
 * Hook to track and animate items that have recently changed via realtime updates.
 * 
 * Usage:
 * const { triggerAnimation, isAnimating, getAnimationClass } = useRealtimeAnimations();
 * 
 * // When a realtime update occurs:
 * triggerAnimation(itemId, "flash", teamColor);
 * 
 * // In render:
 * <div className={getAnimationClass(itemId)}>...</div>
 */
export function useRealtimeAnimations(options: UseRealtimeAnimationsOptions = {}) {
  const { animationDuration = 2000 } = options;
  const [animatedItems, setAnimatedItems] = useState<Map<string, AnimatedItem>>(new Map());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const triggerAnimation = useCallback(
    (id: string, type: AnimatedItem["type"] = "flash", color?: string) => {
      const item: AnimatedItem = {
        id,
        type,
        color,
        timestamp: Date.now(),
      };

      setAnimatedItems((prev) => {
        const next = new Map(prev);
        next.set(id, item);
        return next;
      });

      // Clear any existing timeout for this item
      const existingTimeout = timeoutsRef.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout to clear animation
      const timeout = setTimeout(() => {
        setAnimatedItems((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        timeoutsRef.current.delete(id);
      }, animationDuration);

      timeoutsRef.current.set(id, timeout);
    },
    [animationDuration]
  );

  const isAnimating = useCallback(
    (id: string): boolean => {
      return animatedItems.has(id);
    },
    [animatedItems]
  );

  const getAnimationItem = useCallback(
    (id: string): AnimatedItem | undefined => {
      return animatedItems.get(id);
    },
    [animatedItems]
  );

  const getAnimationClass = useCallback(
    (id: string): string => {
      const item = animatedItems.get(id);
      if (!item) return "";

      switch (item.type) {
        case "flash":
          return "animate-realtime-flash";
        case "pulse":
          return "animate-realtime-pulse";
        case "slide":
          return "animate-realtime-slide";
        case "glow":
          return "animate-realtime-glow";
        default:
          return "";
      }
    },
    [animatedItems]
  );

  const clearAnimation = useCallback((id: string) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setAnimatedItems((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.clear();
    setAnimatedItems(new Map());
  }, []);

  return {
    triggerAnimation,
    isAnimating,
    getAnimationItem,
    getAnimationClass,
    clearAnimation,
    clearAll,
    animatedItems,
  };
}

/**
 * Hook to track previous values and detect changes for animations.
 * Useful for comparing current vs previous state to trigger animations.
 */
export function usePreviousValue<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

/**
 * Helper to detect which items changed between two arrays.
 * Returns the IDs of items that were added or modified.
 */
export function detectChanges<T extends { id: string }>(
  previous: T[] | undefined,
  current: T[],
  compareFields: (keyof T)[]
): { added: string[]; changed: string[] } {
  const added: string[] = [];
  const changed: string[] = [];

  if (!previous) {
    // All items are new
    return { added: current.map((item) => item.id), changed: [] };
  }

  const prevMap = new Map(previous.map((item) => [item.id, item]));

  for (const item of current) {
    const prevItem = prevMap.get(item.id);
    if (!prevItem) {
      added.push(item.id);
    } else {
      // Check if any of the compare fields changed
      const hasChanged = compareFields.some((field) => item[field] !== prevItem[field]);
      if (hasChanged) {
        changed.push(item.id);
      }
    }
  }

  return { added, changed };
}


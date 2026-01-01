"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const supabase = createSupabaseBrowserClient();
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const loadState = useCallback(async () => {
    const { data, error } = await supabase
      .from("game_state")
      .select("is_active")
      .single();

    if (error) {
      console.error("Error loading game state:", error);
      alert(`Failed to load game state: ${error.message}`);
      return;
    }

    console.log("Loaded game state:", data);
    setIsActive(data?.is_active ?? false);
  }, [supabase]);

  useEffect(() => {
    async function load() {
      if (!authorized) return;
      await loadState();
    }
    load().catch((error) => {
      console.error(error);
    });
  }, [authorized, loadState]);

  if (!authorized) {
    return (
      <div className="p-4 space-y-4">
        <Input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          onClick={() => {
            if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
              setAuthorized(true);
            } else {
              alert("Wrong password");
            }
          }}
        >
          Enter
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Admin Panel</h1>

      <p>
        Game status: <strong>{isActive ? "Active" : "Inactive"}</strong>
      </p>

      <Button
        onClick={async () => {
          console.log("Toggling game state...");

          // Use RPC function to toggle game state
          // This avoids the issue with boolean primary key filtering in PostgREST
          const { data, error } = await supabase.rpc("toggle_game_state");

          if (error) {
            console.error("Error toggling game state:", error);
            alert(`Failed to toggle game state: ${error.message}`);
            return;
          }

          console.log("Game state toggled successfully:", data);

          // Update local state from the returned data
          if (data) {
            setIsActive(data.is_active);
          } else {
            // Fallback: reload from DB
            await loadState();
          }
        }}
      >
        Toggle Game
      </Button>
    </div>
  );
}

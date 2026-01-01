"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const supabase = createSupabaseBrowserClient();
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [isActive, setIsActive] = useState(false);

  async function loadState() {
    const { data } = await supabase
      .from("game_state")
      .select("is_active")
      .single();

    setIsActive(data?.is_active ?? false);
  }

  useEffect(() => {
    async function load() {
      if (!authorized) return;
      await loadState();
    }
    load().catch((error) => {
      console.error(error);
    });
  }, [authorized]);

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
          await supabase
            .from("game_state")
            .update({ is_active: !isActive })
            .eq("id", true);

          setIsActive(!isActive);
        }}
      >
        Toggle Game
      </Button>
    </div>
  );
}

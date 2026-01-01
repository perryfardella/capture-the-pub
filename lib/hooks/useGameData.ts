"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useGameData() {
  const supabase = createSupabaseBrowserClient();

  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teams, setTeams] = useState<any[]>([]);
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pubs, setPubs] = useState<any[]>([]);
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bonusPoints, setBonusPoints] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: teams }, { data: pubs }, { data: bonus }] =
        await Promise.all([
          supabase.from("teams").select("*"),
          supabase.from("pubs").select("*"),
          supabase.from("bonus_points").select("*"),
        ]);

      setTeams(teams ?? []);
      setPubs(pubs ?? []);
      setBonusPoints(bonus ?? []);
    }

    load();
  }, []);

  return { teams, pubs, bonusPoints };
}

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const LOCAL_KEY = "roxou_saved_events";

const readLocalSavedEvents = () => {
  if (typeof window === "undefined") return [] as string[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [] as string[];
  }
};

export function useSavedEvents() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [localSavedIds, setLocalSavedIds] = useState<string[]>(readLocalSavedEvents);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setLocalSavedIds(readLocalSavedEvents());
    window.addEventListener("storage", sync);
    window.addEventListener("roxou:saved-events", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("roxou:saved-events", sync);
    };
  }, []);

  const { data: savedIds = [], isLoading } = useQuery({
    queryKey: ["saved-events", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", user!.id);
      return (data || []).map((r) => r.event_id);
    },
    enabled: !!user?.id,
  });

  const toggleSave = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) {
        const current = readLocalSavedEvents();
        const next = current.includes(eventId)
          ? current.filter((id) => id !== eventId)
          : [...current, eventId];
        window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        setLocalSavedIds(next);
        window.dispatchEvent(new Event("roxou:saved-events"));
        return;
      }
      const isSaved = savedIds.includes(eventId);
      if (isSaved) {
        await supabase.from("saved_events").delete()
          .eq("user_id", user.id).eq("event_id", eventId);
      } else {
        await supabase.from("saved_events").insert({
          user_id: user.id,
          event_id: eventId,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-events", user?.id] });
    },
  });

  const activeSavedIds = user ? savedIds : localSavedIds;
  const isSaved = (eventId: string) => activeSavedIds.includes(eventId);

  return { savedIds: activeSavedIds, isSaved, toggleSave: toggleSave.mutate, isLoading: user ? isLoading : false };
}

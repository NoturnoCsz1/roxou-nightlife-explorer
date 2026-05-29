import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type PresenceStatus = "going" | "interested";

export function useEventPresence(eventId: string | undefined) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ going: 0, interested: 0 });
  const [myStatus, setMyStatus] = useState<PresenceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    const { data } = await supabase
      .from("event_presence")
      .select("status, user_id")
      .eq("event_id", eventId);

    const rows = data ?? [];
    setCounts({
      going: rows.filter((r) => r.status === "going").length,
      interested: rows.filter((r) => r.status === "interested").length,
    });
    if (user) {
      const mine = rows.find((r) => r.user_id === user.id);
      setMyStatus((mine?.status as PresenceStatus) ?? null);
    } else {
      setMyStatus(null);
    }
    setLoading(false);
  }, [eventId, user]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const setStatus = async (status: PresenceStatus | null) => {
    if (!user || !eventId || saving) return;
    setSaving(true);
    try {
      if (status === null) {
        await supabase.from("event_presence").delete().eq("event_id", eventId).eq("user_id", user.id);
      } else {
        await supabase
          .from("event_presence")
          .upsert(
            { event_id: eventId, user_id: user.id, status, updated_at: new Date().toISOString() },
            { onConflict: "event_id,user_id" }
          );
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggle = (status: PresenceStatus) => setStatus(myStatus === status ? null : status);

  return { counts, myStatus, loading, saving, toggle, isAuthed: !!user };
}

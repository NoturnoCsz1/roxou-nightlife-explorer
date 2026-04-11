import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useSavedEvents() {
  const { user } = useAuth();
  const qc = useQueryClient();

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
      if (!user) throw new Error("Not authenticated");
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

  const isSaved = (eventId: string) => savedIds.includes(eventId);

  return { savedIds, isSaved, toggleSave: toggleSave.mutate, isLoading };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useSavedPartners() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: savedIds = [], isLoading } = useQuery({
    queryKey: ["saved-partners", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_partners")
        .select("partner_id")
        .eq("user_id", user!.id);
      return (data || []).map((r: any) => r.partner_id);
    },
    enabled: !!user?.id,
  });

  const toggleFollow = useMutation({
    mutationFn: async (partnerId: string) => {
      if (!user) throw new Error("Not authenticated");
      const isFollowed = savedIds.includes(partnerId);
      if (isFollowed) {
        await supabase.from("saved_partners").delete()
          .eq("user_id", user.id).eq("partner_id", partnerId);
      } else {
        await supabase.from("saved_partners").insert({
          user_id: user.id,
          partner_id: partnerId,
        } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-partners", user?.id] });
    },
  });

  const isFollowed = (partnerId: string) => savedIds.includes(partnerId);

  return { savedIds, isFollowed, toggleFollow: toggleFollow.mutate, isLoading };
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, CheckCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Partner = Tables<"partners">;

const ParceirosList = () => {
  const { cityFilter } = useAdminProfile();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
  const [hasLinkedEvents, setHasLinkedEvents] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  async function loadPartners() {
    setLoading(true);
    const { data } = await supabase
      .from("partners")
      .select("*")
      .order("created_at", { ascending: false });
    setPartners(data || []);
    setLoading(false);
  }

  async function handleDeleteClick(partner: Partner) {
    // Check for linked events
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partner.id);

    if (count && count > 0) {
      setHasLinkedEvents(true);
    } else {
      setHasLinkedEvents(false);
    }
    setDeleteTarget(partner);
  }

  async function handleDelete() {
    if (!deleteTarget || hasLinkedEvents) return;
    const { error } = await supabase.from("partners").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      toast.error("Erro ao excluir parceiro. Tente novamente.");
    } else {
      toast.success("Parceiro excluído com sucesso.");
      loadPartners();
    }
  }

  const filtered = partners.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.type || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 md:ml-44">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Parceiros</h1>
        <Link
          to="/admin/parceiros/novo"
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Novo
        </Link>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar parceiro..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhum parceiro encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-border/40 bg-card p-3 hover:border-primary/30 transition"
            >
              <Link to={`/admin/parceiros/${p.id}/editar`} className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground truncate">{p.name}</span>
                  {p.verified_partner && <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5">{p.type}</span>
              </Link>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {p.active ? (
                  <span className="text-[10px] font-medium text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">Ativo</span>
                ) : (
                  <span className="text-[10px] font-medium text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Inativo</span>
                )}
                <button
                  onClick={() => handleDeleteClick(p)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 transition"
                  title="Excluir parceiro"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasLinkedEvents ? "Não é possível excluir" : "Excluir parceiro"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasLinkedEvents ? (
                <>Este parceiro possui eventos vinculados. Remova ou reatribua os eventos antes de excluí-lo.</>
              ) : (
                <>Tem certeza que deseja excluir <strong>"{deleteTarget?.name}"</strong>? Esta ação não pode ser desfeita.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!hasLinkedEvents && (
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ParceirosList;

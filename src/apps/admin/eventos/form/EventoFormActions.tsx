import { ArrowLeft, Instagram, Loader2, Sparkles, Tv, Trash2 } from "lucide-react";
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
import type { UseEventoFormReturn } from "./useEventoForm";

interface Props {
  ctx: UseEventoFormReturn;
}

export default function EventoFormActions({ ctx }: Props) {
  const {
    isEdit,
    form,
    navigate,
    setIgModalOpen,
    reprocessFlyerWithAi,
    reprocessing,
    reprocessSportsTransmission,
    reprocessingSports,
    setDeleteOpen,
    deleteOpen,
    deleting,
    softDeleteEvent,
  } = ctx;

  return (
    <>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-foreground">{isEdit ? "Editar Evento" : "Novo Evento"}</h1>
        {!isEdit && (
          <button
            type="button"
            onClick={() => setIgModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"
          >
            <Instagram className="h-3.5 w-3.5" />
            Importar do Instagram
          </button>
        )}
        {isEdit && form.image_url && (
          <button
            type="button"
            onClick={reprocessFlyerWithAi}
            disabled={reprocessing}
            className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-50"
            title="Pedir para a IA reler o flyer (sem inventar horário; se não houver, marca como 'a confirmar')"
          >
            {reprocessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {reprocessing ? "Re-processando..." : "Re-processar com IA"}
          </button>
        )}
        {isEdit && (
          <button
            type="button"
            onClick={reprocessSportsTransmission}
            disabled={reprocessingSports}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-50"
            title="Detectar transmissão esportiva (futebol/telão) e vincular ao jogo correspondente"
          >
            {reprocessingSports ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tv className="h-3.5 w-3.5" />}
            {reprocessingSports ? "Reprocessando..." : "Reprocessar transmissão esportiva"}
          </button>
        )}
        {isEdit && (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
            title="Arquiva o evento (sai do site público, mantém histórico)"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir evento
          </button>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este evento?</AlertDialogTitle>
            <AlertDialogDescription>
              O evento será <strong>arquivado</strong>: sai imediatamente do site público,
              mas o registro fica preservado para auditoria. Esta ação pode ser revertida
              alterando o status para "publicado" novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                softDeleteEvent();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

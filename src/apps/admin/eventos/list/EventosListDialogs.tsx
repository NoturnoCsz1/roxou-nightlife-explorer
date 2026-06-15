// Diálogos de exclusão e "Aprovar todos seguros" (Fase 3B). JSX literal.

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
import AuraCreateEventModal from "@/components/admin/AuraCreateEventModal";
import { getChecklist } from "./helpers";
import type { EventosListCtx } from "./useEventosList";

export function EventosListDialogs({ ctx }: { ctx: EventosListCtx }) {
  const {
    auraModalOpen,
    setAuraModalOpen,
    deleteTarget,
    setDeleteTarget,
    handleDelete,
    bulkSafeOpen,
    setBulkSafeOpen,
    filtered,
    handleApproveAllSafe,
  } = ctx;

  return (
    <>
      <AuraCreateEventModal open={auraModalOpen} onClose={() => setAuraModalOpen(false)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>"{deleteTarget?.title}"</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Aprovar todos seguros */}
      <AlertDialog open={bulkSafeOpen} onOpenChange={setBulkSafeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar todos os eventos seguros?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const safe = filtered.filter(
                  (e) => e.status !== "published" && e.status !== "archived" && getChecklist(e).complete
                );
                return (
                  <>
                    A Aura encontrou <strong className="text-green-400">{safe.length}</strong> evento(s)
                    completo(s) nos filtros atuais (título, data futura, local, descrição rica e flyer). Eles
                    serão publicados em lote.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const safeIds = filtered
                  .filter(
                    (e) => e.status !== "published" && e.status !== "archived" && getChecklist(e).complete
                  )
                  .map((e) => e.id);
                handleApproveAllSafe(safeIds);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Publicar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * PartnerNotEnabledState — Fase 2.
 *
 * Estado exibido quando o usuário está autenticado mas ainda não possui
 * vínculo ativo em `organization_members`.
 *
 * NÃO oferece criação de organização ou estabelecimento: a habilitação é
 * feita pelo Admin Roxou (venue oficial + usuário oficial + organization +
 * organization_member owner).
 */
import { Building2 } from "lucide-react";

export interface PartnerNotEnabledStateProps {
  email?: string | null;
  onRefresh?: () => void;
}

export function PartnerNotEnabledState({
  email,
  onRefresh,
}: PartnerNotEnabledStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card/60 p-8 text-center backdrop-blur">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Building2 className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="text-xl font-semibold">
        Partner Pro ainda não habilitado para esta conta
      </h1>
      <p className="text-sm text-muted-foreground">
        {email ? (
          <>
            A conta <strong>{email}</strong> está autenticada, mas ainda não foi
            vinculada a um estabelecimento no Partner Pro.
          </>
        ) : (
          <>
            Sua conta está autenticada, mas ainda não foi vinculada a um
            estabelecimento no Partner Pro.
          </>
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        A liberação é feita pela equipe Roxou. Assim que o vínculo for criado,
        basta atualizar esta página.
      </p>
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Verificar novamente
        </button>
      ) : null}
    </div>
  );
}

export default PartnerNotEnabledState;

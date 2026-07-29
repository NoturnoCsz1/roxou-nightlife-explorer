import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import SEO from "@/components/SEO";
import { BdaLayout } from "@/components/bda/BdaLayout";
import { decideGuardianConfirmation, fetchGuardianConfirmation } from "@/modules/bda/bdaService";
import { BDA_CONSENTS, BDA_PRIVACY_NOTE } from "@/modules/bda/bdaLegal";
import { toast } from "sonner";

export default function BdaConfirmacao() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"accept" | "refuse" | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Link inválido ou incompleto.");
      return;
    }
    fetchGuardianConfirmation(token)
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, [token]);

  async function decide(decision: "accept" | "refuse") {
    setSaving(true);
    try {
      await decideGuardianConfirmation(token, decision);
      setResult(decision);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível registrar a decisão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BdaLayout>
      <SEO
        title="Autorização do responsável | Batalha de Aura PP"
        description="Página de confirmação do responsável legal."
        canonical="https://roxou.com.br/batalhadeaura/confirmacao"
        noindex
      />
      <section className="px-4 py-16">
        <div className="mx-auto max-w-lg rounded-[2rem] border border-[#A855F7]/30 bg-black/40 p-7">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-[#8FC0FF]" />
            <h1 className="bda-font-display text-lg font-black uppercase text-white">
              Autorização do responsável
            </h1>
          </div>

          {error && <p className="bda-font-body mt-5 text-sm text-[#FF8FA3]">{error}</p>}

          {!error && !info && !result && (
            <p className="bda-font-body mt-6 flex items-center gap-2 text-sm text-[#C8D2E0]/70">
              <Loader2 className="h-4 w-4 animate-spin" /> Validando link...
            </p>
          )}

          {result && (
            <p className="bda-font-body mt-6 text-sm text-[#C8D2E0]/85">
              {result === "accept"
                ? "Autorização registrada. A inscrição seguiu para análise da organização."
                : "Autorização recusada. A inscrição foi cancelada e nenhum dado será publicado."}
            </p>
          )}

          {info && !result && (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[#C8D2E0]/12 p-4">
                <p className="bda-font-body text-xs text-[#C8D2E0]/70">
                  Participante: <strong className="text-white">{info.participantPublicName}</strong>
                </p>
                <p className="bda-font-body mt-1 text-xs text-[#C8D2E0]/70">
                  Categoria: <strong className="text-white">{info.category === "dupla" ? "Dupla" : "Solo"}</strong>
                </p>
              </div>

              <div className="rounded-2xl border border-[#C8D2E0]/12 p-4">
                <p className="bda-font-display text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                  Autorizações solicitadas
                </p>
                <ul className="bda-font-body mt-2 space-y-1.5 text-[11px] text-[#C8D2E0]/70">
                  {BDA_CONSENTS.filter((c) => (info.consentKeys ?? []).includes(c.key)).map((c) => (
                    <li key={c.key}>• {c.title}</li>
                  ))}
                </ul>
              </div>

              <p className="bda-font-body text-[11px] text-[#C8D2E0]/60">{BDA_PRIVACY_NOTE}</p>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => decide("accept")}
                  className="bda-font-display inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#A855F7] to-[#2E7DFF] text-[11px] font-black uppercase tracking-[0.16em] text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Autorizar
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => decide("refuse")}
                  className="bda-font-display inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-[#C8D2E0]/25 text-[11px] font-bold uppercase tracking-[0.16em] text-[#C8D2E0]/75 disabled:opacity-50"
                >
                  <X className="h-4 w-4" /> Recusar
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </BdaLayout>
  );
}

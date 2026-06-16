/**
 * PartnerOnboardingPage — Fase 10A.
 *
 * Usuário autenticado busca um estabelecimento existente em `partners`
 * (nome / instagram / cidade / tipo) e envia solicitação de acesso.
 * Não cria estabelecimento novo.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  createAccessRequest,
  listMyAccessRequests,
  searchPartnersForOnboarding,
  type PartnerAccessRequest,
  type PartnerSearchResult,
} from "../services/partnerAccessRequests";

const PartnerOnboardingPage = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PartnerSearchResult[]>([]);
  const [myRequests, setMyRequests] = useState<PartnerAccessRequest[]>([]);
  const [selected, setSelected] = useState<PartnerSearchResult | null>(null);
  const [form, setForm] = useState({
    requested_name: "",
    requested_email: "",
    requested_phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data?.user) {
        navigate("/login", { replace: true });
        return;
      }
      setForm((f) => ({
        ...f,
        requested_email: data.user?.email ?? "",
        requested_name:
          (data.user?.user_metadata?.full_name as string | undefined) ?? "",
      }));
      setAuthChecked(true);
      try {
        const reqs = await listMyAccessRequests();
        if (!cancelled) setMyRequests(reqs);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Se já tem solicitação pendente, manda para tela de "em análise".
  useEffect(() => {
    if (!authChecked) return;
    if (myRequests.some((r) => r.status === "pending")) {
      navigate("/pending", { replace: true });
    }
  }, [authChecked, myRequests, navigate]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      searchPartnersForOnboarding(query, 25)
        .then((rows) => {
          if (!cancelled) setResults(rows);
        })
        .catch((err: unknown) => {
          if (!cancelled)
            toast.error(
              err instanceof Error ? err.message : "Erro ao buscar estabelecimentos",
            );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, authChecked]);

  const pendingIds = useMemo(
    () =>
      new Set(
        myRequests.filter((r) => r.status === "pending").map((r) => r.partner_id),
      ),
    [myRequests],
  );

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await createAccessRequest(selected.id, form);
      toast.success("Solicitação enviada!");
      navigate("/pending?just=1", { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao enviar solicitação",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">Solicitar acesso ao Partner Pro</h1>
        <p className="text-sm text-muted-foreground">
          Busque seu estabelecimento já cadastrado na Roxou. A equipe irá validar
          e liberar seu acesso em até 1 dia útil.
        </p>
      </header>

      {selected ? (
        <section className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-4">
          <div className="flex items-start gap-3">
            {selected.logo_url ? (
              <img
                src={selected.logo_url}
                alt={selected.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-secondary" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{selected.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {[selected.city, selected.type, selected.instagram]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {selected.address && (
                <p className="text-xs text-muted-foreground truncate">
                  {selected.address}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Trocar
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Seu nome"
              value={form.requested_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, requested_name: e.target.value }))
              }
              maxLength={100}
            />
            <Input
              placeholder="E-mail de contato"
              value={form.requested_email}
              onChange={(e) =>
                setForm((f) => ({ ...f, requested_email: e.target.value }))
              }
              type="email"
              maxLength={255}
            />
            <Input
              placeholder="WhatsApp (com DDD)"
              value={form.requested_phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, requested_phone: e.target.value }))
              }
              maxLength={20}
              className="sm:col-span-2"
            />
            <Textarea
              placeholder="Conte rapidamente seu cargo / como podemos validar"
              value={form.message}
              onChange={(e) =>
                setForm((f) => ({ ...f, message: e.target.value }))
              }
              maxLength={500}
              className="sm:col-span-2"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar solicitação"}
            </Button>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          <Input
            placeholder="Buscar por nome, @instagram, cidade ou tipo"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="space-y-2">
            {loading && (
              <p className="text-xs text-muted-foreground">Buscando...</p>
            )}
            {!loading && results.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum estabelecimento encontrado. Tente outro termo.
              </p>
            )}
            {results.map((p) => {
              const alreadyPending = pendingIds.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={alreadyPending}
                  onClick={() => setSelected(p)}
                  className="w-full text-left rounded-lg border border-border/40 bg-card/40 hover:bg-card/70 p-3 flex items-center gap-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt={p.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-secondary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[p.city, p.type, p.instagram].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {alreadyPending && (
                    <span className="text-[10px] uppercase tracking-wider text-amber-300">
                      Pendente
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};

export default PartnerOnboardingPage;

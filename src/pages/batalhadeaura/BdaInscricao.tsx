import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck, Upload, X } from "lucide-react";
import SEO from "@/components/SEO";
import { BdaLayout } from "@/components/bda/BdaLayout";
import { BDA_ROUTES } from "@/components/bda/bdaConfig";
import { BDA_CONSENTS, BDA_LEGAL_LINKS, BDA_PRIVACY_NOTE } from "@/modules/bda/bdaLegal";
import { preparePhoto } from "@/modules/bda/photoUtils";
import { BdaParticipantInput, submitRegistration } from "@/modules/bda/bdaService";
import { useBdaSettings } from "@/modules/bda/useBdaSettings";

import { toast } from "sonner";

const CANONICAL = "https://roxou.com.br/batalhadeaura/inscricao";

const STEPS = [
  "Categoria",
  "Participante",
  "Idade e responsável",
  "Foto",
  "Consentimentos",
  "Revisão",
];

type Consents = Record<string, boolean>;

interface FormParticipant {
  fullName: string;
  publicName: string;
  birthDate: string;
  city: string;
  phone: string;
  email: string;
  instagram: string;
  notes: string;
  photoOriginal: string | null;
  photoOptimized: string | null;
  photoPreview: string | null;
  guardian: {
    fullName: string;
    cpf: string;
    birthDate: string;
    phone: string;
    email: string;
    relationship: string;
    declarationAccepted: boolean;
    authorityConfirmed: boolean;
  };
  consents: Consents;
}

const emptyParticipant = (): FormParticipant => ({
  fullName: "",
  publicName: "",
  birthDate: "",
  city: "",
  phone: "",
  email: "",
  instagram: "",
  notes: "",
  photoOriginal: null,
  photoOptimized: null,
  photoPreview: null,
  guardian: {
    fullName: "",
    cpf: "",
    birthDate: "",
    phone: "",
    email: "",
    relationship: "",
    declarationAccepted: false,
    authorityConfirmed: false,
  },
  consents: {},
});

function ageFrom(birthDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const b = new Date(`${birthDate}T00:00:00-03:00`);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function isValidCpf(raw: string) {
  const cpf = raw.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(cpf[i]) * (10 - i);
  let d1 = (s * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(cpf[i]) * (11 - i);
  let d2 = (s * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
}

const inputClass =
  "bda-font-body w-full rounded-xl border border-[#C8D2E0]/18 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-[#C8D2E0]/35 outline-none transition focus:border-[#A855F7]/70";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="bda-font-body mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#C8D2E0]/70">
        {label}
      </span>
      {children}
      {hint && <span className="bda-font-body mt-1 block text-[11px] text-[#C8D2E0]/45">{hint}</span>}
    </label>
  );
}

export default function BdaInscricao() {
  const { settings, loading: settingsLoading } = useBdaSettings();
  const startedAt = useRef(Date.now());

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<"solo" | "dupla">("solo");
  const [teamName, setTeamName] = useState("");
  const [participants, setParticipants] = useState<FormParticipant[]>([emptyParticipant()]);
  const [current, setCurrent] = useState(0);
  const [honeypot, setHoneypot] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | { requiresGuardian: boolean }>(null);

  const list = participants.slice(0, category === "dupla" ? 2 : 1);
  const p = list[current] ?? list[0];
  const age = ageFrom(p.birthDate);
  const isMinor = age !== null && age < 18;

  const update = (patch: Partial<FormParticipant>) =>
    setParticipants((prev) => prev.map((x, i) => (i === current ? { ...x, ...patch } : x)));

  const setCategoryAndSlots = (value: "solo" | "dupla") => {
    setCategory(value);
    setCurrent(0);
    setParticipants((prev) =>
      value === "dupla" && prev.length < 2 ? [...prev, emptyParticipant()] : prev,
    );
  };

  const stepValid = useMemo(() => {
    if (step === 0) return category === "solo" || teamName.trim().length >= 2;
    if (step === 1)
      return (
        p.fullName.trim().length >= 5 &&
        p.publicName.trim().length >= 2 &&
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email.trim()) &&
        p.phone.replace(/\D/g, "").length >= 10
      );
    if (step === 2) {
      if (age === null) return false;
      if (!isMinor) return true;
      const g = p.guardian;
      return (
        g.fullName.trim().length >= 5 &&
        isValidCpf(g.cpf) &&
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.email.trim()) &&
        g.phone.replace(/\D/g, "").length >= 10 &&
        !!g.relationship &&
        g.declarationAccepted &&
        g.authorityConfirmed
      );
    }
    if (step === 4) {
      if (!p.consents.tratamento_dados) return false;
      if (isMinor && !p.consents.participacao_evento) return false;
      return true;
    }
    return true;
  }, [step, category, teamName, p, age, isMinor]);

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    try {
      const { original, optimized } = await preparePhoto(file);
      update({ photoOriginal: original, photoOptimized: optimized, photoPreview: optimized });
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível processar a imagem.");
    }
  }

  const allParticipantsReady = list.every((item) => {
    const a = ageFrom(item.birthDate);
    if (a === null) return false;
    if (!item.consents.tratamento_dados) return false;
    if (a < 18) {
      const g = item.guardian;
      return (
        item.consents.participacao_evento &&
        g.fullName.trim().length >= 5 &&
        isValidCpf(g.cpf) &&
        g.declarationAccepted &&
        g.authorityConfirmed
      );
    }
    return true;
  });

  async function handleSubmit() {
    if (!allParticipantsReady) {
      toast.error("Complete os dados de todos os participantes antes de enviar.");
      return;
    }
    setSending(true);
    try {
      const payload: BdaParticipantInput[] = list.map((item) => {
        const a = ageFrom(item.birthDate) ?? 0;
        return {
          fullName: item.fullName.trim(),
          publicName: item.publicName.trim(),
          birthDate: item.birthDate,
          city: item.city.trim(),
          phone: item.phone.trim(),
          email: item.email.trim(),
          instagram: item.instagram.trim(),
          notes: item.notes.trim(),
          photo: item.photoOriginal,
          photoPublic: item.photoOptimized,
          guardian:
            a < 18
              ? {
                  fullName: item.guardian.fullName.trim(),
                  cpf: item.guardian.cpf,
                  birthDate: item.guardian.birthDate,
                  phone: item.guardian.phone.trim(),
                  email: item.guardian.email.trim(),
                  relationship: item.guardian.relationship,
                  declarationAccepted: item.guardian.declarationAccepted,
                  authorityConfirmed: item.guardian.authorityConfirmed,
                }
              : null,
          consents: item.consents as any,
        };
      });
      const res = await submitRegistration({
        category,
        teamName: teamName.trim(),
        participants: payload,
        elapsedMs: Date.now() - startedAt.current,
        website: honeypot,
      });
      setDone({ requiresGuardian: !!res.requiresGuardian });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar inscrição.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <BdaLayout>
        <SEO title="Inscrição enviada | Batalha de Aura PP" description="Inscrição recebida." canonical={CANONICAL} noindex />
        <section className="px-4 py-20">
          <div className="mx-auto max-w-lg rounded-[2rem] border border-[#A855F7]/35 bg-white/[0.03] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#A855F7] to-[#2E7DFF]">
              <Check className="h-7 w-7 text-white" />
            </div>
            <h1 className="bda-font-display mt-5 text-2xl font-black uppercase text-white">
              Inscrição enviada
            </h1>
            <p className="bda-font-body mt-3 text-sm text-[#C8D2E0]/80">
              {done.requiresGuardian
                ? "Como há participante menor de 18 anos, a inscrição só segue para análise após a confirmação do responsável pelo link de autorização."
                : "Sua inscrição está aguardando análise da organização. Você receberá o retorno pelos contatos informados."}
            </p>
            <Link
              to={BDA_ROUTES.home}
              className="bda-font-display mt-7 inline-flex h-12 items-center rounded-full border border-[#2E7DFF]/45 px-7 text-xs font-bold uppercase tracking-[0.2em] text-[#8FC0FF]"
            >
              Voltar ao início
            </Link>
          </div>
        </section>
      </BdaLayout>
    );
  }

  // Inscrições fechadas por configuração: rota permanece válida, sem formulário.
  if (!settingsLoading && !settings.registrations_open) {
    return (
      <BdaLayout>
        <SEO
          title="Inscrição | Batalha de Aura PP"
          description="As inscrições da Batalha de Aura PP serão abertas em breve."
          canonical={CANONICAL}
          noindex
        />
        <section className="flex min-h-[70svh] flex-col items-center justify-center px-4 text-center">
          <span className="bda-font-body rounded-full border border-[#2E7DFF]/40 bg-[#2E7DFF]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#8FC0FF]">
            Em breve
          </span>
          <h1 className="bda-font-display mt-4 text-3xl font-black uppercase text-white sm:text-5xl">
            Inscrições em breve
          </h1>
          <p className="bda-font-body mt-3 max-w-sm text-[#C8D2E0]/75">
            A abertura das inscrições da Batalha de Aura PP será anunciada pela organização.
          </p>
          <Link
            to={BDA_ROUTES.home}
            className="bda-font-display mt-8 inline-flex h-11 items-center rounded-full border border-[#C8D2E0]/25 px-6 text-xs font-bold uppercase tracking-[0.2em] text-[#C8D2E0] hover:border-[#A855F7] hover:text-white"
          >
            Voltar ao campeonato
          </Link>
        </section>
      </BdaLayout>
    );
  }

  return (
    <BdaLayout>
      <SEO
        title="Inscrição | Batalha de Aura PP"
        description="Faça sua inscrição na Batalha de Aura PP nas categorias Solo e Dupla."
        canonical={CANONICAL}
        ogType="website"
      />


      <section className="px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="bda-font-display text-center text-2xl font-black uppercase text-white sm:text-4xl [text-shadow:0_0_24px_rgba(168,85,247,0.5)]">
            Inscrição
          </h1>

          {/* progresso */}
          <ol className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={`bda-font-body rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  i === step
                    ? "border-[#A855F7] bg-[#A855F7]/15 text-white"
                    : i < step
                      ? "border-[#2E7DFF]/40 text-[#8FC0FF]"
                      : "border-[#C8D2E0]/15 text-[#C8D2E0]/40"
                }`}
              >
                {i + 1}. {label}
              </li>
            ))}
          </ol>

          {category === "dupla" && step > 0 && step < 5 && (
            <div className="mt-5 flex justify-center gap-2">
              {list.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  className={`bda-font-display rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ${
                    current === i
                      ? "border-[#A855F7] bg-[#A855F7]/15 text-white"
                      : "border-[#C8D2E0]/18 text-[#C8D2E0]/60"
                  }`}
                >
                  Participante {i + 1}
                </button>
              ))}
            </div>
          )}

          <div className="mt-7 rounded-[1.75rem] border border-[#C8D2E0]/12 bg-black/35 p-5 backdrop-blur-sm sm:p-7">
            {/* honeypot */}
            <input
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              name="website"
              className="hidden"
              aria-hidden
            />

            {step === 0 && (
              <div className="space-y-4">
                <p className="bda-font-body text-sm text-[#C8D2E0]/80">Escolha a categoria da disputa.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["solo", "dupla"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCategoryAndSlots(value)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        category === value
                          ? "border-[#A855F7] bg-[#A855F7]/12"
                          : "border-[#C8D2E0]/15 hover:border-[#2E7DFF]/45"
                      }`}
                    >
                      <span className="bda-font-display block text-lg font-black uppercase text-white">
                        {value === "solo" ? "Solo" : "Dupla"}
                      </span>
                      <span className="bda-font-body mt-1 block text-xs text-[#C8D2E0]/70">
                        {value === "solo"
                          ? "Disputa individual, 1 vs 1."
                          : "Disputa em dupla, 2 vs 2 — exige dois cadastros completos."}
                      </span>
                    </button>
                  ))}
                </div>
                {category === "dupla" && (
                  <Field label="Nome da dupla">
                    <input className={inputClass} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Ex.: Aura Squad" />
                  </Field>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <Field label="Nome completo" hint="Uso interno da organização. Não aparece publicamente.">
                  <input className={inputClass} value={p.fullName} onChange={(e) => update({ fullName: e.target.value })} />
                </Field>
                <Field label="Nome público ou apelido" hint="É o único nome que pode aparecer na lista pública.">
                  <input className={inputClass} value={p.publicName} onChange={(e) => update({ publicName: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Cidade">
                    <input className={inputClass} value={p.city} onChange={(e) => update({ city: e.target.value })} />
                  </Field>
                  <Field label="Telefone" hint="Nunca exibido publicamente.">
                    <input className={inputClass} value={p.phone} onChange={(e) => update({ phone: e.target.value })} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="E-mail" hint="Nunca exibido publicamente.">
                    <input className={inputClass} value={p.email} onChange={(e) => update({ email: e.target.value })} />
                  </Field>
                  <Field label="Instagram (opcional)">
                    <input className={inputClass} value={p.instagram} onChange={(e) => update({ instagram: e.target.value })} />
                  </Field>
                </div>
                <Field label="Observações (opcional)">
                  <textarea className={inputClass} rows={3} value={p.notes} onChange={(e) => update({ notes: e.target.value })} />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Field label="Data de nascimento" hint="A idade exata nunca é exibida publicamente.">
                  <input type="date" className={inputClass} value={p.birthDate} onChange={(e) => update({ birthDate: e.target.value })} />
                </Field>

                {isMinor && (
                  <div className="rounded-2xl border border-[#2E7DFF]/35 bg-[#2E7DFF]/8 p-4">
                    <p className="bda-font-body flex items-start gap-2 text-xs text-[#C8D2E0]/85">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#8FC0FF]" />
                      Participante menor de 18 anos: os dados do responsável legal são obrigatórios e a
                      publicação do perfil só ocorre após autorização e análise da organização.
                    </p>
                    <div className="mt-4 space-y-4">
                      <Field label="Nome completo do responsável">
                        <input className={inputClass} value={p.guardian.fullName} onChange={(e) => update({ guardian: { ...p.guardian, fullName: e.target.value } })} />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="CPF do responsável" hint="Armazenado de forma protegida e nunca exibido publicamente.">
                          <input className={inputClass} value={p.guardian.cpf} onChange={(e) => update({ guardian: { ...p.guardian, cpf: e.target.value } })} placeholder="000.000.000-00" />
                        </Field>
                        <Field label="Data de nascimento do responsável">
                          <input type="date" className={inputClass} value={p.guardian.birthDate} onChange={(e) => update({ guardian: { ...p.guardian, birthDate: e.target.value } })} />
                        </Field>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Telefone do responsável">
                          <input className={inputClass} value={p.guardian.phone} onChange={(e) => update({ guardian: { ...p.guardian, phone: e.target.value } })} />
                        </Field>
                        <Field label="E-mail do responsável" hint="Receberá o link de autorização.">
                          <input className={inputClass} value={p.guardian.email} onChange={(e) => update({ guardian: { ...p.guardian, email: e.target.value } })} />
                        </Field>
                      </div>
                      <Field label="Vínculo com o participante">
                        <select className={inputClass} value={p.guardian.relationship} onChange={(e) => update({ guardian: { ...p.guardian, relationship: e.target.value } })}>
                          <option value="">Selecione</option>
                          <option value="mae">Mãe</option>
                          <option value="pai">Pai</option>
                          <option value="responsavel_legal">Responsável legal</option>
                          <option value="tutor">Tutor(a)</option>
                        </select>
                      </Field>
                      <label className="bda-font-body flex items-start gap-3 text-xs text-[#C8D2E0]/85">
                        <input type="checkbox" className="mt-0.5" checked={p.guardian.declarationAccepted} onChange={(e) => update({ guardian: { ...p.guardian, declarationAccepted: e.target.checked } })} />
                        Declaro que as informações prestadas são verdadeiras e que sou responsável pelo participante.
                      </label>
                      <label className="bda-font-body flex items-start gap-3 text-xs text-[#C8D2E0]/85">
                        <input type="checkbox" className="mt-0.5" checked={p.guardian.authorityConfirmed} onChange={(e) => update({ guardian: { ...p.guardian, authorityConfirmed: e.target.checked } })} />
                        Confirmo que possuo poderes legais para autorizar a participação.
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <p className="bda-font-body text-sm text-[#C8D2E0]/80">
                  A foto é opcional. O arquivo original fica em armazenamento privado; a versão pública só é
                  publicada se houver autorização e aprovação administrativa.
                </p>
                {p.photoPreview ? (
                  <div className="relative inline-block">
                    <img src={p.photoPreview} alt="Pré-visualização" className="h-40 w-40 rounded-2xl object-cover" />
                    <button
                      type="button"
                      onClick={() => update({ photoOriginal: null, photoOptimized: null, photoPreview: null })}
                      className="absolute -right-2 -top-2 rounded-full bg-[#A855F7] p-1.5 text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="bda-font-body flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#C8D2E0]/25 px-5 py-4 text-xs text-[#C8D2E0]/70 hover:border-[#A855F7]/60">
                    <Upload className="h-4 w-4" /> Escolher foto (JPG, PNG ou WEBP até 8 MB)
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} />
                  </label>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <p className="bda-font-body text-xs text-[#C8D2E0]/70">{BDA_PRIVACY_NOTE}</p>
                {BDA_CONSENTS.map((c) => {
                  const required = c.alwaysRequired || (c.requiredForMinors && isMinor);
                  return (
                    <label key={c.key} className="block rounded-2xl border border-[#C8D2E0]/12 bg-white/[0.02] p-4">
                      <span className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={!!p.consents[c.key]}
                          onChange={(e) => update({ consents: { ...p.consents, [c.key]: e.target.checked } })}
                        />
                        <span>
                          <span className="bda-font-display block text-xs font-bold uppercase tracking-[0.12em] text-white">
                            {c.title} {required && <span className="text-[#A855F7]">*</span>}
                          </span>
                          <span className="bda-font-body mt-1 block text-[11px] leading-relaxed text-[#C8D2E0]/70">
                            {c.text}
                          </span>
                        </span>
                      </span>
                    </label>
                  );
                })}
                {!isMinor && (
                  <label className="bda-font-body flex items-start gap-3 rounded-2xl border border-[#C8D2E0]/12 bg-white/[0.02] p-4 text-[11px] text-[#C8D2E0]/70">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={!!p.consents.exibicao_cidade}
                      onChange={(e) => update({ consents: { ...p.consents, exibicao_cidade: e.target.checked } })}
                    />
                    Autorizo exibir também minha cidade na lista pública.
                  </label>
                )}
                <div className="bda-font-body flex flex-wrap gap-3 pt-2 text-[11px] text-[#8FC0FF]">
                  {BDA_LEGAL_LINKS.map((l) => (
                    <a key={l.label} href={l.href} className="underline underline-offset-2">
                      {l.label}
                    </a>
                  ))}
                </div>
                <p className="bda-font-body text-[10px] text-[#C8D2E0]/45">
                  Textos provisórios, pendentes de revisão jurídica.
                </p>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <h2 className="bda-font-display text-sm font-bold uppercase tracking-[0.16em] text-white">Revisão</h2>
                <div className="rounded-2xl border border-[#C8D2E0]/12 p-4">
                  <p className="bda-font-body text-xs text-[#C8D2E0]/70">
                    Categoria: <strong className="text-white">{category === "dupla" ? `Dupla${teamName ? ` — ${teamName}` : ""}` : "Solo"}</strong>
                  </p>
                </div>
                {list.map((item, i) => {
                  const a = ageFrom(item.birthDate);
                  return (
                    <div key={i} className="rounded-2xl border border-[#C8D2E0]/12 p-4">
                      <p className="bda-font-display text-xs font-bold uppercase tracking-[0.14em] text-white">
                        Participante {i + 1} — {item.publicName || "—"}
                      </p>
                      <ul className="bda-font-body mt-2 space-y-1 text-[11px] text-[#C8D2E0]/70">
                        <li>Nome completo: {item.fullName || "—"}</li>
                        <li>Contato: {item.email || "—"}</li>
                        <li>Foto enviada: {item.photoOptimized ? "sim" : "não"}</li>
                        <li>
                          Menor de idade: {a !== null && a < 18 ? "sim — responsável informado" : "não"}
                        </li>
                        <li>
                          Exibição pública autorizada: {item.consents.exibicao_publica ? "sim" : "não"}
                        </li>
                      </ul>
                      {!item.consents.tratamento_dados && (
                        <p className="bda-font-body mt-2 text-[11px] text-[#FF8FA3]">
                          Faltam consentimentos obrigatórios para este participante.
                        </p>
                      )}
                    </div>
                  );
                })}
                <p className="bda-font-body text-[11px] text-[#C8D2E0]/60">
                  Após o envio, inscrições com participantes menores de 18 anos ficam
                  “aguardando autorização do responsável”. Nenhum perfil é publicado automaticamente.
                </p>
              </div>
            )}

            {/* navegação */}
            <div className="mt-7 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="bda-font-display inline-flex h-11 items-center gap-2 rounded-full border border-[#C8D2E0]/20 px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#C8D2E0]/70 disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  disabled={!stepValid}
                  onClick={() => setStep((s) => s + 1)}
                  className="bda-font-display inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#A855F7] to-[#2E7DFF] px-6 text-[11px] font-black uppercase tracking-[0.16em] text-white disabled:opacity-40"
                >
                  Avançar <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={sending || !allParticipantsReady}
                  onClick={handleSubmit}
                  className="bda-font-display inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#A855F7] to-[#2E7DFF] px-6 text-[11px] font-black uppercase tracking-[0.16em] text-white disabled:opacity-40"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Enviar inscrição
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </BdaLayout>
  );
}

import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Car, ShieldCheck, Upload, X, Loader2, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import {
  validateCPF,
  maskCPF,
  maskCPFForDisplay,
  maskPhoneBR,
  validatePhoneBR,
  validatePlate,
  normalizePlate,
  validateFullName,
  validateVehicleModel,
  validateImageFile,
  validateDriverRegistrationPayload,
} from "@/lib/driverValidation";

const APPS = ["Uber", "99", "inDrive", "Outro", "Ainda não trabalho, mas tenho interesse"];
const HOURS = ["Manhã", "Tarde", "Noite", "Madrugada"];
const VEHICLE_TYPES = ["Carro", "Moto", "Van", "SUV"];

type PhotoSlot = "face" | "vehicle" | "plate";

interface PhotoState {
  file: File | null;
  url: string | null;
  uploading: boolean;
  preview: string | null;
}

const emptyPhoto: PhotoState = { file: null, url: null, uploading: false, preview: null };

export default function CadastroMotorista() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "review">("form");

  const [form, setForm] = useState({
    full_name: "",
    cpf: "",
    whatsapp: "",
    email: user?.email || "",
    city: "",
    neighborhood: "",
    apps_experience: [] as string[],
    vehicle_type: "",
    vehicle_model: "",
    vehicle_year: "",
    vehicle_color: "",
    vehicle_plate: "",
    vehicle_good_condition: null as boolean | null,
    availability: [] as string[],
    attends_events: null as boolean | null,
    regions: "",
    receive_driver_lead_emails: true,
    accepted_terms: false,
    accepted_privacy: false,
    accepted_data_removal: false,
    accepted_connection_only: false,
    declared_truthful: false,
    understood_suspension: false,
  });

  const [photos, setPhotos] = useState<Record<PhotoSlot, PhotoState>>({
    face: { ...emptyPhoto },
    vehicle: { ...emptyPhoto },
    plate: { ...emptyPhoto },
  });

  const toggleArr = (key: "apps_experience" | "availability", val: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val],
    }));

  const handlePhotoChange = async (slot: PhotoSlot, file: File | null) => {
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      const msg =
        err === "type" ? "Formato inválido. Use JPG, PNG ou WEBP." :
        err === "size" ? "Imagem maior que 8MB." :
        "Arquivo inválido ou vazio.";
      toast.error(msg);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotos((p) => ({ ...p, [slot]: { ...p[slot], preview: ev.target?.result as string, file } }));
    };
    reader.readAsDataURL(file);

    setPhotos((p) => ({ ...p, [slot]: { ...p[slot], uploading: true, file } }));

    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `drivers/${slot}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      setPhotos((p) => ({ ...p, [slot]: { ...p[slot], uploading: false, url: data.publicUrl } }));
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error("Erro no upload: " + (e.message || ""));
      setPhotos((p) => ({ ...p, [slot]: { ...emptyPhoto } }));
    }
  };

  const removePhoto = (slot: PhotoSlot) => {
    setPhotos((p) => ({ ...p, [slot]: { ...emptyPhoto } }));
  };

  const allTerms =
    form.accepted_terms &&
    form.accepted_privacy &&
    form.accepted_data_removal &&
    form.accepted_connection_only &&
    form.declared_truthful &&
    form.understood_suspension;

  const photosReady = !!(photos.face.url && photos.vehicle.url && photos.plate.url);
  const photosUploading = photos.face.uploading || photos.vehicle.uploading || photos.plate.uploading;

  const handleGoToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Faça login para se cadastrar como motorista.");
      navigate("/auth?redirect=/cadastro-motorista");
      return;
    }
    if (!photosReady) {
      toast.error("Envie sua selfie, foto do veículo e foto da placa para continuar.");
      return;
    }
    if (!allTerms) {
      toast.error("É preciso aceitar todos os termos.");
      return;
    }
    const errs = validateDriverRegistrationPayload({
      full_name: form.full_name,
      cpf: form.cpf,
      whatsapp: form.whatsapp,
      city: form.city,
      vehicle_model: form.vehicle_model,
      vehicle_color: form.vehicle_color,
      vehicle_plate: form.vehicle_plate,
      vehicle_type: form.vehicle_type,
      face_photo_url: photos.face.url,
      vehicle_photo_url: photos.vehicle.url,
      plate_photo_url: photos.plate.url,
    });
    if (errs.length) {
      toast.error(errs[0]);
      return;
    }
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!user) return;
    const errs = validateDriverRegistrationPayload({
      full_name: form.full_name,
      cpf: form.cpf,
      whatsapp: form.whatsapp,
      city: form.city,
      vehicle_model: form.vehicle_model,
      vehicle_color: form.vehicle_color,
      vehicle_plate: form.vehicle_plate,
      vehicle_type: form.vehicle_type,
      face_photo_url: photos.face.url,
      vehicle_photo_url: photos.vehicle.url,
      plate_photo_url: photos.plate.url,
    });
    if (errs.length) {
      toast.error(errs[0]);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("driver_applications").insert({
        user_id: user.id,
        full_name: form.full_name.trim(),
        cpf: form.cpf.replace(/\D/g, ""),
        whatsapp: form.whatsapp,
        email: form.email,
        city: form.city.trim(),
        neighborhood: form.neighborhood.trim() || null,
        apps_experience: form.apps_experience,
        vehicle_type: form.vehicle_type,
        vehicle_model: form.vehicle_model.trim(),
        vehicle_year: form.vehicle_year || null,
        vehicle_color: form.vehicle_color.trim(),
        vehicle_plate: normalizePlate(form.vehicle_plate),
        vehicle_good_condition: form.vehicle_good_condition,
        availability: form.availability,
        attends_events: form.attends_events,
        regions: form.regions || null,
        receive_driver_lead_emails: form.receive_driver_lead_emails,
        accepted_terms: form.accepted_terms,
        accepted_privacy: form.accepted_privacy,
        accepted_data_removal: form.accepted_data_removal,
        accepted_connection_only: form.accepted_connection_only,
        declared_truthful: form.declared_truthful,
        understood_suspension: form.understood_suspension,
        face_photo_url: photos.face.url,
        vehicle_photo_url: photos.vehicle.url,
        plate_photo_url: photos.plate.url,
        driver_status: "pending",
      } as any);
      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe um cadastro com este CPF.");
        } else {
          toast.error("Erro ao enviar: " + error.message);
        }
        return;
      }
      toast.success("Cadastro enviado para análise da equipe Roxou.", { duration: 6000 });
      navigate("/perfil");
    } finally {
      setSubmitting(false);
    }
  };

  // ------- RENDER REVIEW -------
  if (step === "review") {
    return (
      <div className="min-h-screen bg-background pb-24">
        <SEO title="Revisar cadastro | Roxou" canonical="https://roxou.com.br/cadastro-motorista" />
        <header className="sticky top-0 z-40 glass border-b border-border/30">
          <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
            <button onClick={() => setStep("form")} className="p-2 -ml-2 rounded-xl hover:bg-card">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="font-display font-bold text-lg">Revisar cadastro</h1>
              <p className="text-[11px] text-muted-foreground">Confira antes de enviar para aprovação</p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
          <section className="rounded-2xl border border-border/40 bg-card/60 p-4 space-y-2 text-sm">
            <Row label="Nome" value={form.full_name} />
            <Row label="CPF" value={maskCPFForDisplay(form.cpf)} />
            <Row label="WhatsApp" value={form.whatsapp} />
            <Row label="Cidade" value={form.city} />
            <Row label="Veículo" value={`${form.vehicle_type} • ${form.vehicle_model} • ${form.vehicle_color}`} />
            <Row label="Placa" value={normalizePlate(form.vehicle_plate)} />
          </section>

          <section className="space-y-2">
            <h2 className="font-display font-bold text-sm uppercase tracking-wider text-primary">Imagens enviadas</h2>
            <div className="grid grid-cols-3 gap-2">
              {(["face", "vehicle", "plate"] as PhotoSlot[]).map((s) => (
                <div key={s} className="relative">
                  <img src={photos[s].preview || photos[s].url || ""} alt={s} className="w-full aspect-square object-cover rounded-xl border border-border/40" />
                  <p className="text-[10px] text-center mt-1 text-muted-foreground capitalize">
                    {s === "face" ? "Selfie" : s === "vehicle" ? "Veículo" : "Placa"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Seu cadastro entrará como <strong>pendente</strong>. A aprovação é feita manualmente pela equipe Roxou.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("form")} disabled={submitting}>
              Voltar e editar
            </Button>
            <Button type="button" className="flex-1 font-bold" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar para aprovação"}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ------- RENDER FORM -------
  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="Cadastro de Motorista | Roxou"
        description="Seja um motorista parceiro da Roxou. Cadastre-se na fase de testes."
        canonical="https://roxou.com.br/cadastro-motorista"
      />

      <header className="sticky top-0 z-40 glass border-b border-border/30">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 rounded-xl hover:bg-card">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-lg flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" /> Seja motorista parceiro
            </h1>
            <p className="text-[11px] text-muted-foreground">Fase de testes — cadastro gratuito</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <p className="text-sm">
            A Roxou conecta passageiros e motoristas independentes. Cadastros incompletos ou com dados falsos serão rejeitados automaticamente.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-[12px] leading-relaxed flex gap-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-300" />
          <p>
            A Roxou não é empresa de transporte. A plataforma atua apenas como ambiente de conexão entre passageiros e motoristas independentes.
          </p>
        </section>

        <form onSubmit={handleGoToReview} className="space-y-6">
          {/* Dados pessoais */}
          <fieldset className="space-y-3">
            <legend className="font-display font-bold text-sm uppercase tracking-wider text-primary">Dados pessoais</legend>
            <div>
              <Input placeholder="Nome completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              {form.full_name && !validateFullName(form.full_name) && <FieldError msg="Informe nome e sobrenome reais (mín. 6 caracteres)." />}
            </div>
            <div>
              <Input placeholder="CPF" value={maskCPF(form.cpf)} onChange={(e) => setForm({ ...form, cpf: e.target.value })} required maxLength={14} inputMode="numeric" />
              {form.cpf && !validateCPF(form.cpf) && <FieldError msg="CPF inválido." />}
            </div>
            <div>
              <Input placeholder="WhatsApp (XX) XXXXX-XXXX" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhoneBR(e.target.value) })} required inputMode="tel" />
              {form.whatsapp && !validatePhoneBR(form.whatsapp) && <FieldError msg="Telefone inválido." />}
            </div>
            <Input type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            <Input placeholder="Bairro (opcional)" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
          </fieldset>

          {/* Imagens obrigatórias */}
          <fieldset className="space-y-3">
            <legend className="font-display font-bold text-sm uppercase tracking-wider text-primary">Imagens obrigatórias</legend>
            <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP. Máx 8MB cada.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <PhotoUploader label="Selfie" slot="face" state={photos.face} onChange={handlePhotoChange} onRemove={removePhoto} />
              <PhotoUploader label="Foto do veículo" slot="vehicle" state={photos.vehicle} onChange={handlePhotoChange} onRemove={removePhoto} />
              <PhotoUploader label="Foto da placa" slot="plate" state={photos.plate} onChange={handlePhotoChange} onRemove={removePhoto} />
            </div>
            {!photosReady && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Envie selfie, foto do veículo e foto da placa para continuar.
              </p>
            )}
          </fieldset>

          {/* Veículo */}
          <fieldset className="space-y-3">
            <legend className="font-display font-bold text-sm uppercase tracking-wider text-primary">Veículo</legend>
            <div>
              <Label className="text-xs">Tipo do veículo</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {VEHICLE_TYPES.map((t) => (
                  <Button key={t} type="button" size="sm" variant={form.vehicle_type === t ? "default" : "outline"} onClick={() => setForm({ ...form, vehicle_type: t })}>
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Input placeholder="Modelo (ex: Onix, Civic)" value={form.vehicle_model} onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} required />
              {form.vehicle_model && !validateVehicleModel(form.vehicle_model) && <FieldError msg="Modelo inválido." />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Ano (opcional)" value={form.vehicle_year} onChange={(e) => setForm({ ...form, vehicle_year: e.target.value })} inputMode="numeric" />
              <Input placeholder="Cor" value={form.vehicle_color} onChange={(e) => setForm({ ...form, vehicle_color: e.target.value })} required />
            </div>
            <div>
              <Input
                placeholder="Placa (ABC-1234 ou ABC1D23)"
                value={form.vehicle_plate}
                onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value.toUpperCase() })}
                required
                maxLength={8}
              />
              {form.vehicle_plate && !validatePlate(form.vehicle_plate) && <FieldError msg="Placa inválida (ABC-1234 ou ABC1D23)." />}
            </div>
            <p className="text-xs text-muted-foreground">O veículo está em boas condições?</p>
            <div className="flex gap-2">
              <Button type="button" variant={form.vehicle_good_condition === true ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, vehicle_good_condition: true })}>Sim</Button>
              <Button type="button" variant={form.vehicle_good_condition === false ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, vehicle_good_condition: false })}>Não</Button>
            </div>
          </fieldset>

          {/* Experiência */}
          <fieldset className="space-y-2">
            <legend className="font-display font-bold text-sm uppercase tracking-wider text-primary">Experiência em apps</legend>
            {APPS.map((app) => (
              <label key={app} className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.apps_experience.includes(app)} onCheckedChange={() => toggleArr("apps_experience", app)} />
                {app}
              </label>
            ))}
          </fieldset>

          {/* Disponibilidade */}
          <fieldset className="space-y-2">
            <legend className="font-display font-bold text-sm uppercase tracking-wider text-primary">Disponibilidade</legend>
            {HOURS.map((h) => (
              <label key={h} className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.availability.includes(h)} onCheckedChange={() => toggleArr("availability", h)} />
                {h}
              </label>
            ))}
            <p className="text-xs text-muted-foreground mt-3">Atende eventos?</p>
            <div className="flex gap-2">
              <Button type="button" variant={form.attends_events === true ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, attends_events: true })}>Sim</Button>
              <Button type="button" variant={form.attends_events === false ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, attends_events: false })}>Não</Button>
            </div>
            <Textarea placeholder="Regiões atendidas (opcional)" value={form.regions} onChange={(e) => setForm({ ...form, regions: e.target.value })} className="mt-2" />
          </fieldset>

          {/* Termos */}
          <fieldset className="space-y-2">
            <legend className="font-display font-bold text-sm uppercase tracking-wider text-primary">Termos obrigatórios</legend>
            {[
              { key: "accepted_terms", label: <>Li e aceito os <Link to="/terms" className="text-primary underline">Termos de Uso</Link></> },
              { key: "accepted_privacy", label: <>Li e aceito a <Link to="/privacy" className="text-primary underline">Política de Privacidade</Link></> },
              { key: "accepted_data_removal", label: <>Li e aceito a <Link to="/remover-dados" className="text-primary underline">Política de Remoção de Dados</Link></> },
              { key: "accepted_connection_only", label: "Entendo que a Roxou apenas conecta motoristas e passageiros" },
              { key: "declared_truthful", label: "Declaro que as informações enviadas são verdadeiras" },
              { key: "understood_suspension", label: "Entendo que denúncias podem gerar suspensão" },
            ].map((t) => (
              <label key={t.key} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={(form as any)[t.key]}
                  onCheckedChange={(v) => setForm({ ...form, [t.key]: !!v } as any)}
                  className="mt-0.5"
                />
                <span>{t.label}</span>
              </label>
            ))}
          </fieldset>

          <Button
            type="submit"
            disabled={submitting || photosUploading || !photosReady || !allTerms}
            className="w-full rounded-xl h-12 font-bold"
          >
            {photosUploading ? "Enviando imagens..." : "Revisar e enviar"}
          </Button>

          {!photosReady && (
            <p className="text-[11px] text-center text-muted-foreground">
              Botão liberado após enviar as 3 imagens obrigatórias.
            </p>
          )}
        </form>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-border/20 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{msg}</p>;
}

function PhotoUploader({
  label,
  slot,
  state,
  onChange,
  onRemove,
}: {
  label: string;
  slot: PhotoSlot;
  state: PhotoState;
  onChange: (slot: PhotoSlot, file: File | null) => void;
  onRemove: (slot: PhotoSlot) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasImage = !!(state.preview || state.url);

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">
        {hasImage ? (
          <div className="relative">
            <img src={state.preview || state.url || ""} alt={label} className="w-full aspect-square object-cover rounded-xl border border-border/40" />
            {state.uploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : state.url ? (
              <div className="absolute top-1 left-1 bg-primary/90 text-primary-foreground rounded-full p-1">
                <Check className="w-3 h-3" />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => onRemove(slot)}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive p-1 text-destructive-foreground"
              aria-label="Remover"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/50 bg-background hover:border-primary/50 transition text-xs text-muted-foreground"
          >
            <Upload className="w-4 h-4" />
            Enviar
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={slot === "face" ? "user" : "environment"}
        onChange={(e) => onChange(slot, e.target.files?.[0] || null)}
        className="hidden"
      />
      {state.url && !state.uploading && <p className="text-[10px] text-primary mt-1">Imagem enviada</p>}
    </div>
  );
}

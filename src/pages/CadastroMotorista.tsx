import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Car, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SEO from "@/components/SEO";

// CPF validation
function validateCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  if (["12345678900", "01234567890"].includes(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(c[10]);
}

const APPS = ["Uber", "99", "inDrive", "Outro", "Ainda não trabalho, mas tenho interesse"];
const HOURS = ["Manhã", "Tarde", "Noite", "Madrugada"];

export default function CadastroMotorista() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    cpf: "",
    whatsapp: "",
    email: user?.email || "",
    city: "",
    neighborhood: "",
    apps_experience: [] as string[],
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

  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);

  const toggleArr = (key: "apps_experience" | "availability", val: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val],
    }));

  const uploadPhoto = async (file: File, prefix: string): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `drivers/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: false });
    if (error) {
      toast.error(`Erro ao enviar foto ${prefix}`);
      return null;
    }
    const { data } = supabase.storage.from("uploads").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Faça login para se cadastrar como motorista.");
      navigate("/auth?redirect=/cadastro-motorista");
      return;
    }
    if (!validateCPF(form.cpf)) {
      toast.error("CPF inválido");
      return;
    }
    const allTerms =
      form.accepted_terms &&
      form.accepted_privacy &&
      form.accepted_data_removal &&
      form.accepted_connection_only &&
      form.declared_truthful &&
      form.understood_suspension;
    if (!allTerms) {
      toast.error("É preciso aceitar todos os termos.");
      return;
    }

    setSubmitting(true);
    try {
      let face_photo_url: string | null = null;
      let vehicle_photo_url: string | null = null;
      if (facePhoto) face_photo_url = await uploadPhoto(facePhoto, "face");
      if (vehiclePhoto) vehicle_photo_url = await uploadPhoto(vehiclePhoto, "vehicle");

      const { error } = await supabase.from("driver_applications").insert({
        user_id: user.id,
        ...form,
        cpf: form.cpf.replace(/\D/g, ""),
        face_photo_url,
        vehicle_photo_url,
        driver_status: "pending",
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe um cadastro com este CPF.");
        } else {
          toast.error("Erro ao enviar: " + error.message);
        }
        return;
      }
      toast.success("Cadastro enviado para análise.");
      navigate("/perfil");
    } finally {
      setSubmitting(false);
    }
  };

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
            A Roxou conecta pessoas que vão a eventos com motoristas parceiros disponíveis. Nesta fase de testes, o cadastro é gratuito e passa por análise. Após a validação do modelo, a Roxou poderá oferecer planos de assinatura para motoristas aprovados que desejarem continuar participando da rede.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-[12px] leading-relaxed flex gap-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-300" />
          <p>
            A Roxou não é empresa de transporte, não vende corridas, não define preços e não intermedia pagamentos. A plataforma atua apenas como ambiente de conexão entre passageiros e motoristas independentes. Toda negociação, deslocamento, pagamento, conduta e segurança durante a viagem são de responsabilidade direta entre passageiro e motorista.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados pessoais */}
          <fieldset className="space-y-3">
            <legend className="font-display font-bold text-sm uppercase tracking-wider text-primary">Dados pessoais</legend>
            <Input placeholder="Nome completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <Input placeholder="CPF (somente números)" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} required maxLength={14} />
            <Input placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} required />
            <Input type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            <Input placeholder="Bairro" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
          </fieldset>

          {/* Identificação simples */}
          <fieldset className="space-y-3">
            <legend className="font-display font-bold text-sm uppercase tracking-wider text-primary">Identificação</legend>
            <div>
              <Label className="text-xs">Foto do rosto</Label>
              <Input type="file" accept="image/*" onChange={(e) => setFacePhoto(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label className="text-xs">Foto do veículo</Label>
              <Input type="file" accept="image/*" onChange={(e) => setVehiclePhoto(e.target.files?.[0] || null)} />
            </div>
          </fieldset>

          {/* Experiência */}
          <fieldset className="space-y-2">
            <legend className="font-display font-bold text-sm uppercase tracking-wider text-primary">Experiência em apps</legend>
            <p className="text-xs text-muted-foreground">Você já trabalha ou trabalhou com aplicativo de transporte?</p>
            {APPS.map((app) => (
              <label key={app} className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.apps_experience.includes(app)} onCheckedChange={() => toggleArr("apps_experience", app)} />
                {app}
              </label>
            ))}
          </fieldset>

          {/* Veículo */}
          <fieldset className="space-y-3">
            <legend className="font-display font-bold text-sm uppercase tracking-wider text-primary">Veículo</legend>
            <Input placeholder="Modelo" value={form.vehicle_model} onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} required />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Ano" value={form.vehicle_year} onChange={(e) => setForm({ ...form, vehicle_year: e.target.value })} required />
              <Input placeholder="Cor" value={form.vehicle_color} onChange={(e) => setForm({ ...form, vehicle_color: e.target.value })} required />
            </div>
            <Input placeholder="Placa" value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value.toUpperCase() })} required />
            <p className="text-xs text-muted-foreground">O veículo está em boas condições?</p>
            <div className="flex gap-2">
              <Button type="button" variant={form.vehicle_good_condition === true ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, vehicle_good_condition: true })}>Sim</Button>
              <Button type="button" variant={form.vehicle_good_condition === false ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, vehicle_good_condition: false })}>Não</Button>
            </div>
          </fieldset>

          {/* Disponibilidade */}
          <fieldset className="space-y-2">
            <legend className="font-display font-bold text-sm uppercase tracking-wider text-primary">Disponibilidade</legend>
            <p className="text-xs text-muted-foreground">Horários que costuma atender</p>
            {HOURS.map((h) => (
              <label key={h} className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.availability.includes(h)} onCheckedChange={() => toggleArr("availability", h)} />
                {h}
              </label>
            ))}
            <p className="text-xs text-muted-foreground mt-3">Tem interesse em atender eventos?</p>
            <div className="flex gap-2">
              <Button type="button" variant={form.attends_events === true ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, attends_events: true })}>Sim</Button>
              <Button type="button" variant={form.attends_events === false ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, attends_events: false })}>Não</Button>
            </div>
            <Textarea placeholder="Quais regiões costuma atender?" value={form.regions} onChange={(e) => setForm({ ...form, regions: e.target.value })} className="mt-2" />
          </fieldset>

          {/* Propostas por e-mail */}
          <fieldset className="space-y-2">
            <legend className="font-display font-bold text-sm uppercase tracking-wider text-primary">Propostas por e-mail</legend>
            <p className="text-xs text-muted-foreground">Deseja receber propostas de passageiros por e-mail quando houver uma solicitação ativa?</p>
            <div className="flex gap-2">
              <Button type="button" variant={form.receive_driver_lead_emails ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, receive_driver_lead_emails: true })}>Sim, quero receber</Button>
              <Button type="button" variant={!form.receive_driver_lead_emails ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, receive_driver_lead_emails: false })}>Não, prefiro não receber</Button>
            </div>
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
              { key: "understood_suspension", label: "Entendo que denúncias podem gerar suspensão ou remoção da plataforma" },
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

          <Button type="submit" disabled={submitting} className="w-full rounded-xl h-12 font-bold">
            {submitting ? "Enviando..." : "Enviar cadastro"}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            Cadastro enviado para análise. A Roxou irá revisar suas informações e poderá aprovar, solicitar ajustes ou recusar o cadastro.
          </p>
        </form>
      </main>
    </div>
  );
}

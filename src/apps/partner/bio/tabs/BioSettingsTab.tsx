import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { updateBio, type BioProfile } from "@/services/bio";
import { Field } from "./shared";

export function BioSettingsTab({
  bio,
  onUpdated,
}: {
  bio: BioProfile;
  onUpdated: (b: BioProfile) => void;
}) {
  const [form, setForm] = useState(bio);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(bio), [bio]);

  async function save(patch: Partial<BioProfile>) {
    setSaving(true);
    const merged = { ...form, ...patch };
    setForm(merged);
    try {
      await updateBio(bio.id, patch);
      onUpdated({ ...bio, ...patch });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const modules: Array<[keyof BioProfile, string, string]> = [
    ["show_events", "Eventos", "Próximos eventos publicados"],
    ["show_reservations", "Reservas", "Botão Reservar mesa"],
    ["show_vip", "Lista VIP", "Acesso à lista pública"],
    ["show_transport", "Transportes", "Excursões e motoristas"],
    ["show_menu", "Cardápio", "Menu digital"],
    ["show_news", "Notícias", "Últimas novidades"],
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Módulos visíveis</h3>
        <p className="text-xs text-muted-foreground">
          Ative apenas o que faz sentido para o seu negócio. Tudo é consumido automaticamente do ecossistema Roxou.
        </p>
        {modules.map(([key, label, hint]) => (
          <div key={key as string} className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm">{label}</div>
              <div className="text-[11px] text-muted-foreground">{hint}</div>
            </div>
            <Switch
              checked={Boolean(form[key])}
              disabled={saving}
              onCheckedChange={(v) => save({ [key]: v } as Partial<BioProfile>)}
            />
          </div>
        ))}
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">CTA principal</h3>
        <Field label="Texto" value={form.primary_cta_label ?? ""} onChange={(v) => setForm({ ...form, primary_cta_label: v })} />
        <Field label="URL" value={form.primary_cta_url ?? ""} onChange={(v) => setForm({ ...form, primary_cta_url: v })} />
        <Button
          size="sm"
          onClick={() => save({ primary_cta_label: form.primary_cta_label, primary_cta_url: form.primary_cta_url })}
          disabled={saving}
        >
          Salvar
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Status</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm">Bio ativa</span>
          <Switch checked={form.is_active} onCheckedChange={(v) => save({ is_active: v })} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Bio pública</span>
          <Switch checked={form.is_public} onCheckedChange={(v) => save({ is_public: v })} />
        </div>
      </Card>
    </div>
  );
}

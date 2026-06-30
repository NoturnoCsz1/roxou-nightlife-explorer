import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateBio, type BioProfile } from "@/services/bio";
import { Field, Row, Section } from "./shared";

export function BioProfileTab({
  bio,
  onUpdated,
}: {
  bio: BioProfile;
  onUpdated: (b: BioProfile) => void;
}) {
  const [form, setForm] = useState(bio);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(bio), [bio]);

  async function save() {
    setSaving(true);
    try {
      const patch = {
        display_name: form.display_name,
        headline: form.headline,
        bio: form.bio,
        avatar_url: form.avatar_url,
        cover_url: form.cover_url,
        address: form.address,
        city: form.city,
        whatsapp: form.whatsapp,
        instagram: form.instagram,
        tiktok: form.tiktok,
        youtube: form.youtube,
        website: form.website,
        theme: form.theme,
        accent_color: form.accent_color,
      };
      await updateBio(bio.id, patch);
      onUpdated({ ...bio, ...patch });
      toast.success("Perfil atualizado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Section title="Informações básicas">
        <Row>
          <Field label="Nome" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} />
          <Field label="Cidade" value={form.city ?? ""} onChange={(v) => setForm({ ...form, city: v })} />
        </Row>
        <Field label="Headline" value={form.headline ?? ""} onChange={(v) => setForm({ ...form, headline: v })} placeholder="Uma frase que te define" />
        <div className="space-y-1">
          <Label className="text-xs">Descrição</Label>
          <Textarea rows={3} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <Row>
          <Field label="Avatar (URL)" value={form.avatar_url ?? ""} onChange={(v) => setForm({ ...form, avatar_url: v })} />
          <Field label="Capa (URL)" value={form.cover_url ?? ""} onChange={(v) => setForm({ ...form, cover_url: v })} />
        </Row>
        <Field label="Endereço" value={form.address ?? ""} onChange={(v) => setForm({ ...form, address: v })} />
      </Section>

      <Section title="Contato e redes">
        <Row>
          <Field label="WhatsApp" value={form.whatsapp ?? ""} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="(18) 99999-9999" />
          <Field label="Instagram" value={form.instagram ?? ""} onChange={(v) => setForm({ ...form, instagram: v })} placeholder="@usuario" />
        </Row>
        <Row>
          <Field label="TikTok" value={form.tiktok ?? ""} onChange={(v) => setForm({ ...form, tiktok: v })} />
          <Field label="YouTube" value={form.youtube ?? ""} onChange={(v) => setForm({ ...form, youtube: v })} />
        </Row>
        <Field label="Site" value={form.website ?? ""} onChange={(v) => setForm({ ...form, website: v })} />
      </Section>

      <Section title="Visual">
        <Row>
          <Field label="Cor de destaque" value={form.accent_color ?? ""} onChange={(v) => setForm({ ...form, accent_color: v })} placeholder="#a855f7" />
          <div className="space-y-1">
            <Label className="text-xs">Tema</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
            >
              <option value="default">Roxou (padrão)</option>
              <option value="midnight">Midnight</option>
              <option value="neon">Neon</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>
        </Row>
      </Section>

      <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 rounded-lg border border-border bg-background/95 p-3 backdrop-blur">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar perfil"}
        </Button>
      </div>
    </div>
  );
}

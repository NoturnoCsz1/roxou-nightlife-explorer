import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useV3Profile } from "@/hooks/useV3Profile";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { profileSchema, maskWhatsappBR } from "@/lib/v3Validation";

const BUCKET = "uploads";

export default function V3ProfileEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading } = useV3Profile();

  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingCover, setSavingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setNickname((profile as any).nickname || "");
      setWhatsapp((profile as any).whatsapp || "");
      setAvatarUrl(profile.avatar_url || null);
      setCoverUrl((profile as any).cover_image_url || null);
    }
  }, [profile]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Faça login para editar seu perfil.</p>
        <Button onClick={() => navigate("/v3/auth")}>Entrar</Button>
      </div>
    );
  }

  const uploadImage = async (file: File, kind: "avatar" | "cover") => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB).");
      return null;
    }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `v3-profiles/${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (error) {
      toast.error("Falha no upload: " + error.message);
      return null;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingAvatar(true);
    const url = await uploadImage(file, "avatar");
    if (url) {
      setAvatarUrl(url);
      await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
      toast.success("Avatar atualizado!");
    }
    setSavingAvatar(false);
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingCover(true);
    const url = await uploadImage(file, "cover");
    if (url) {
      setCoverUrl(url);
      await supabase.from("profiles").update({ cover_image_url: url } as any).eq("user_id", user.id);
      toast.success("Capa atualizada!");
    }
    setSavingCover(false);
  };

  const handleSave = async () => {
    const result = profileSchema.safeParse({ display_name: displayName, nickname, whatsapp });
    if (!result.success) {
      const first = Object.values(result.error.flatten().fieldErrors).flat()[0];
      toast.error(first || "Verifique os campos.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: result.data.display_name,
      nickname: result.data.nickname || null,
      whatsapp: result.data.whatsapp || null,
    } as any).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Perfil atualizado!");
    navigate("/v3/perfil");
  };

  return (
    <div className="pb-32 lg:pb-12">
      {/* Header */}
      <header className="sticky top-0 z-20 v3-glass-strong border-b border-primary/15 px-4 py-3">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Link to="/v3/perfil" className="rounded-full p-2 hover:bg-white/5 transition">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <h1 className="font-display text-lg font-black text-foreground">Editar Perfil</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto">
        {/* Cover (21:9) */}
        <div className="relative aspect-[21/9] w-full overflow-hidden bg-secondary border-b border-white/5">
          {coverUrl ? (
            <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent/10 to-background">
              <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          <label className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 cursor-pointer rounded-full bg-background/80 backdrop-blur-md border border-primary/30 px-3 py-2 text-[11px] font-bold text-foreground hover:border-primary/60 transition">
            {savingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Trocar capa
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} disabled={savingCover} />
          </label>
        </div>

        {/* Avatar — overlap */}
        <div className="px-4 -mt-12 mb-4 relative z-10">
          <div className="relative w-fit">
            <div className="h-24 w-24 rounded-3xl border-2 border-primary/60 bg-background/80 backdrop-blur-xl p-1 shadow-[0_0_30px_hsl(var(--primary)/0.45)]">
              <div className="h-full w-full overflow-hidden rounded-[1.25rem] bg-secondary flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-primary" />
                )}
              </div>
            </div>
            <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-primary p-2 shadow-lg shadow-primary/40 hover:scale-110 transition-transform">
              {savingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-foreground" /> : <Camera className="h-3.5 w-3.5 text-primary-foreground" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={savingAvatar} />
            </label>
          </div>
        </div>

        {/* Form */}
        <div className="px-4 space-y-4">
          <Field label="Nome">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={80}
              placeholder="Seu nome completo"
              className="w-full rounded-2xl bg-card border border-border/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none transition"
            />
          </Field>

          <Field label="Apelido (exibição)" hint="Como você aparece na comunidade. Letras, números, . _ -">
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value.toLowerCase())}
              maxLength={30}
              placeholder="ex: dudaprudente"
              className="w-full rounded-2xl bg-card border border-border/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none transition"
            />
          </Field>

          <Field label="E-mail" hint="Vinculado à sua conta. Não pode ser alterado por aqui.">
            <input
              type="email"
              value={user.email || ""}
              disabled
              className="w-full rounded-2xl bg-card/40 border border-border/30 px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
            />
          </Field>

          <Field label="WhatsApp" hint="Usado apenas com seu consentimento, criptografado ponta a ponta.">
            <input
              type="tel"
              value={whatsapp}
              onChange={e => setWhatsapp(maskWhatsappBR(e.target.value))}
              placeholder="(18) 99999-9999"
              className="w-full rounded-2xl bg-card border border-border/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none transition"
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl h-12"
              onClick={() => navigate("/v3/perfil")}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-2xl h-12 font-bold text-white border-0"
              style={{
                background: "linear-gradient(135deg, hsl(280 90% 60%), hsl(320 90% 60%))",
                boxShadow: "0 8px 30px -8px hsl(290 90% 60% / 0.6)",
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-muted-foreground/70 leading-relaxed">{hint}</p>}
    </div>
  );
}

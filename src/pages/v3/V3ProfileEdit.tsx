import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useV3Profile } from "@/hooks/useV3Profile";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { profileSchema, maskWhatsappBR } from "@/lib/v3Validation";
import CommunityConsentModal from "@/components/v3/CommunityConsentModal";
import { ShieldCheck } from "lucide-react";

const BUCKET = "uploads";

export default function V3ProfileEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading } = useV3Profile();
  const [consentOpen, setConsentOpen] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingCover, setSavingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
        <Button onClick={() => navigate("/auth")}>Entrar</Button>
      </div>
    );
  }

  const uploadImage = async (file: File, kind: "avatar" | "cover") => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type.toLowerCase())) {
      toast.error("Use uma imagem JPG, PNG ou WebP.");
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

  async function handleCoverUpload(file: File) {
    if (!user?.id) {
      toast.error("Usuário não carregado.");
      return;
    }
    setSavingCover(true);
    try {
      const uploadedUrl = await uploadImage(file, "cover");
      if (!uploadedUrl) return;
      const { error } = await supabase
        .from("profiles")
        .update({ cover_image_url: uploadedUrl } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      setCoverUrl(`${uploadedUrl}?t=${Date.now()}`);
      toast.success("Capa atualizada com sucesso");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar capa");
    } finally {
      setSavingCover(false);
    }
  }

  const handleSave = async () => {
    const result = profileSchema.safeParse({ display_name: displayName, nickname, whatsapp });
    if (!result.success) {
      const first = Object.values(result.error.flatten().fieldErrors).flat()[0];
      toast.error(first || "Verifique os campos.");
      return;
    }
    setSaving(true);

    const trimmedNick = (result.data.nickname || "").trim();
    if (trimmedNick) {
      const { data: existing, error: checkError } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("nickname", trimmedNick)
        .neq("user_id", user.id)
        .maybeSingle();
      if (checkError) {
        setSaving(false);
        toast.error("Erro ao validar apelido: " + checkError.message);
        return;
      }
      if (existing) {
        setSaving(false);
        toast.error("Apelido já em uso");
        return;
      }
    }

    const { error } = await supabase.from("profiles").update({
      display_name: result.data.display_name,
      nickname: trimmedNick || null,
      whatsapp: result.data.whatsapp || null,
    } as any).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      if ((error as any).code === "23505" || /duplicate|unique/i.test(error.message)) {
        toast.error("Apelido já em uso");
      } else {
        toast.error("Erro ao salvar: " + error.message);
      }
      return;
    }
    toast.success("Perfil atualizado!");
    navigate("/perfil");
  };

  return (
    <div className="pb-32 lg:pb-12">
      <input
        id="cover-upload-input"
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="sr-only"
        onChange={async (e) => {
          toast.info("Arquivo selecionado");
          const file = e.target.files?.[0];
          if (!file) return;
          await handleCoverUpload(file);
          e.target.value = "";
        }}
      />

      {/* Header — glass rounded V3 */}
      <header className="sticky top-2 z-20 mx-3 mt-2">
        <div className="max-w-3xl mx-auto v3-glass-strong rounded-2xl border border-primary/25 px-4 py-3 shadow-[0_0_0_1px_hsl(var(--primary)/0.15),0_8px_28px_-8px_hsl(var(--primary)/0.35)]">
          <div className="flex items-center gap-3">
            <Link
              to="/perfil"
              className="rounded-full p-2 hover:bg-primary/15 hover:text-primary transition text-muted-foreground"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-lg font-black text-foreground">Editar Perfil</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Cover (21:9) — glass rounded */}
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
          {coverUrl ? (
            <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent/10 to-background">
              <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          <label
            htmlFor="cover-upload-input"
            className="absolute right-3 bottom-3 z-[9999] pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur-xl border border-primary/40 px-3 py-2 text-[11px] font-bold text-foreground transition hover:border-primary hover:bg-primary/15 hover:text-primary cursor-pointer"
          >
            {savingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Camera className="h-3.5 w-3.5" />}
            {savingCover ? "Enviando..." : "Trocar capa"}
          </label>
        </div>

        {/* Avatar — centralizado, overlap */}
        <div className="flex justify-center -mt-12 mb-4 relative z-10">
          <div className="relative">
            <div className="h-24 w-24 rounded-2xl border-2 border-primary/60 bg-white/5 backdrop-blur-xl p-1 shadow-[0_0_30px_hsl(var(--primary)/0.45)]">
              <div className="h-full w-full overflow-hidden rounded-xl bg-secondary/40 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-primary" />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={savingAvatar}
              className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-primary p-2 shadow-lg shadow-primary/40 hover:scale-110 transition-transform disabled:opacity-70"
              aria-label="Trocar avatar"
            >
              {savingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-foreground" /> : <Camera className="h-3.5 w-3.5 text-primary-foreground" />}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* Form — card glass único centralizado */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 space-y-4">
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

          {/* +18 / LGPD status */}
          {(() => {
            const accepted = !!(profile as any)?.age_confirmed_at && !!(profile as any)?.community_terms_accepted_at;
            return (
              <button
                type="button"
                onClick={() => setConsentOpen(true)}
                className={`w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  accepted ? "border-emerald-500/30 bg-emerald-500/5" : "border-primary/40 bg-primary/5 hover:border-primary/70"
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${accepted ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/15 text-primary"}`}>
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">
                    {accepted ? "Você está apto à Comunidade ✓" : "Validação +18 e Termos da Comunidade"}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground leading-relaxed mt-0.5">
                    {accepted
                      ? "Aceite registrado. Você pode rever quando quiser."
                      : "Necessário para chat e funções sociais. Conformidade LGPD."}
                  </p>
                </div>
              </button>
            );
          })()}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl h-12"
              onClick={() => navigate("/perfil")}
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
      <CommunityConsentModal open={consentOpen} onOpenChange={setConsentOpen} />
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

import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Instagram, Sparkles, Image as ImageIcon, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from "@/components/admin/ImageUpload";

const CATEGORIES = [
  { value: "geral", label: "Geral" },
  { value: "bares", label: "Bares" },
  { value: "festas", label: "Festas" },
  { value: "baladas", label: "Baladas" },
  { value: "restaurantes", label: "Restaurantes" },
  { value: "shows", label: "Shows" },
  { value: "gastronomia", label: "Gastronomia" },
  { value: "cultura", label: "Cultura" },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

const NoticiaForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const table = "roxou_news";
  const backTo = `/admin/noticias`;

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    cover_image_url: "",
    author: "",
    category: "geral",
    status: "draft",
    published_at: "",
    seo_keyword: "",
    source_url: "",
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [autoPublishIG, setAutoPublishIG] = useState(false);

  useEffect(() => {
    if (!editing) return;
    (async () => {
      const { data } = await supabase.from("roxou_news").select("*").eq("id", id).maybeSingle();
      if (!data) {
        toast({ title: "Não encontrado", variant: "destructive" });
        navigate("/admin/noticias");
        return;
      }
      setForm({
        title: data.title ?? "",
        slug: data.slug ?? "",
        excerpt: data.excerpt ?? "",
        content: data.content ?? "",
        cover_image_url: data.cover_image_url ?? "",
        author: data.author ?? "",
        category: data.category ?? "geral",
        status: data.status ?? "draft",
        published_at: data.published_at ?? "",
        seo_keyword: (data as any).seo_keyword ?? "",
        source_url: (data as any).source_url ?? "",
      });
      setSlugTouched(true);
      setLoading(false);
    })();
  }, [id, editing, navigate]);

  const updateTitle = (rawTitle: string) => {
    const title = rawTitle.toUpperCase();
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  };

  const persist = async (publish: boolean) => {
    if (!form.title || !form.author) {
      toast({ title: "Preencha título e autor", variant: "destructive" });
      return;
    }
    setSaving(true);
    const finalStatus = publish ? "published" : form.status;

    // SEO automático: garante slug com palavra-chave + injeta linha SEO no conteúdo
    const baseSlug = form.slug || slugify(form.title);
    const seoSlug = form.seo_keyword
      ? `${slugify(form.seo_keyword)}-${baseSlug}`.replace(/-+/g, "-").slice(0, 90)
      : baseSlug;

    const seoFooter = `\n\n<p><em>Notícias de bares, festas, baladas, restaurantes e shows em Presidente Prudente — ROXOU.</em> <a href="https://roxou.com.br/noticias">Veja todas as notícias da Roxou</a>.</p>`;
    const sentinelText = "Notícias de bares, festas, baladas";
    const contentWithSeo = form.content?.includes(sentinelText)
      ? form.content
      : (form.content || "") + seoFooter;

    const payload: any = {
      title: form.title,
      slug: seoSlug,
      excerpt: form.excerpt || null,
      content: contentWithSeo,
      cover_image_url: form.cover_image_url || null,
      author: form.author,
      category: form.category,
      status: finalStatus,
      seo_keyword: form.seo_keyword || null,
      source_url: form.source_url?.trim() || null,
      published_at:
        finalStatus === "published"
          ? form.published_at || new Date().toISOString()
          : null,
    };

    const op = editing
      ? supabase.from(table).update(payload).eq("id", id!).select("id, cover_image_url, title, excerpt, author, slug").single()
      : supabase.from(table).insert(payload).select("id, cover_image_url, title, excerpt, author, slug").single();

    const { data: saved, error } = await op;
    if (error) { setSaving(false); return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); }

    if (autoPublishIG && payload.status === "published" && saved?.cover_image_url) {
      const slugPath = `noticia/${saved.slug}`;
      const utmCampaign = "roxou_news";
      const tags = "#roxou #prudente #presidenteprudente #baladasprudente #baresprudente #festasprudente";
      const caption = `🔥 ${saved.title}\n\n${saved.excerpt || ""}\n\n📍 Roxou — Presidente Prudente\n👉 roxou.com.br/${slugPath}?utm_source=instagram&utm_medium=organic&utm_campaign=${utmCampaign}\n\n${tags}`;
      const { data: userData } = await supabase.auth.getUser();
      const { data: postRow, error: postErr } = await supabase.from("instagram_posts").insert({
        caption,
        image_url: saved.cover_image_url,
        status: "draft",
        created_by: userData.user?.id,
      }).select("id").single();
      if (!postErr && postRow?.id) {
        const { data: pub, error: pubErr } = await supabase.functions.invoke("instagram-publish", { body: { post_id: postRow.id } });
        if (pubErr || !pub?.success) {
          toast({ title: "Notícia salva, mas Instagram falhou", description: pub?.error || pubErr?.message, variant: "destructive" });
        } else {
          toast({ title: "Notícia + Instagram publicados!" });
        }
      }
    } else {
      toast({ title: editing ? "Notícia atualizada" : publish ? "Notícia publicada!" : "Rascunho salvo" });
    }
    setSaving(false);
    navigate(backTo);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="relative">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-10 right-0 w-72 h-72 bg-orange-500/10 blur-3xl rounded-full -z-10" />
      <div className="pointer-events-none absolute top-40 -left-10 w-72 h-72 bg-primary/15 blur-3xl rounded-full -z-10" />

      <div className="flex items-center gap-2 mb-5">
        <Link to={backTo} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black font-display flex items-center gap-2">
            {editing ? "Editar notícia" : "Nova notícia"}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-primary/20 border border-primary/30 text-primary">
              <Sparkles className="h-2.5 w-2.5" /> Roxou
            </span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Notícias da Roxou (bares, festas, baladas, restaurantes, shows)
          </p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); persist(false); }} className="space-y-5 max-w-3xl">
        {/* Bloco principal */}
        <div className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-md p-5 space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => updateTitle(e.target.value)} placeholder="Ex: Gusttavo Lima confirmado na Expo 2026" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }}
                placeholder="gerado-automaticamente"
              />
            </div>
            <div>
              <Label>Autor</Label>
              <Input value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} placeholder="Ex: Fernando Roxou" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-orange-400/20 bg-gradient-to-r from-orange-500/5 to-yellow-500/5 p-3">
            <Label className="flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3 w-3 text-orange-400" /> Foco SEO (palavra-chave principal)
            </Label>
            <Input
              value={form.seo_keyword}
              onChange={(e) => setForm((f) => ({ ...f, seo_keyword: e.target.value }))}
              placeholder='Ex: "shows expo prudente 2026"'
              className="mt-1.5"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Aparecerá no slug da URL e turbina o ranking no Google. Frase natural focada em Presidente Prudente.
            </p>
          </div>

          <div>
            <Label className="text-xs">Link da fonte (opcional)</Label>
            <Input
              type="url"
              value={form.source_url}
              onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
              placeholder="https://exemplo.com.br/materia-original"
              className="mt-1.5"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Se a matéria foi baseada em outra publicação, cole aqui o link da fonte original. Aparecerá como crédito no final da notícia.
            </p>
          </div>
        </div>

        {/* Capa */}
        <div className="rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/5 via-transparent to-primary/5 backdrop-blur-md p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-orange-400" />
            <Label className="m-0">Imagem de capa</Label>
          </div>

          {form.cover_image_url && (
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30">
              <img src={form.cover_image_url} alt="Capa" className="w-full max-h-64 object-cover" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, cover_image_url: "" }))}
                className="absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold bg-black/70 text-white hover:bg-destructive/80 backdrop-blur-md"
              >
                Remover
              </button>
            </div>
          )}

          <ImageUpload
            folder="expo-news"
            currentUrl={form.cover_image_url}
            onUploaded={(url) => setForm((f) => ({ ...f, cover_image_url: url }))}
            label=""
          />
          <p className="text-[11px] text-muted-foreground">
            Formato ideal: 1200×750. Aparece nos cards do hotsite e na publicação do Instagram.
          </p>
        </div>

        {/* Galeria — placeholder visual (sem suporte no banco ainda) */}
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 opacity-70">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <Label className="m-0">Galeria adicional <span className="text-[10px] text-muted-foreground font-normal">(em breve)</span></Label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Imagens extras da matéria estarão disponíveis em uma próxima versão. Por enquanto, embeb imagens diretamente no conteúdo via HTML.
          </p>
        </div>

        {/* Conteúdo */}
        <div className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-md p-5 space-y-4">
          <div>
            <Label>Resumo (opcional)</Label>
            <Textarea
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              placeholder="Chamada curta exibida nos cards"
              rows={2}
            />
          </div>

          <div>
            <Label>Conteúdo (HTML simples permitido: &lt;p&gt; &lt;strong&gt; &lt;em&gt; &lt;ul&gt; &lt;li&gt; &lt;img&gt;)</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={14}
              placeholder="Escreva a matéria. Pode usar HTML básico para formatar."
              className="font-mono text-sm"
            />
          </div>
        </div>

        {/* IG */}
        <div className="space-y-3">

          <div className="flex items-start gap-2 rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-500/5 to-purple-500/5 p-3">
            <Checkbox
              id="autoIG"
              checked={autoPublishIG}
              onCheckedChange={(v) => setAutoPublishIG(Boolean(v))}
            />
            <Label htmlFor="autoIG" className="cursor-pointer text-sm leading-tight">
              <span className="flex items-center gap-1.5 font-semibold">
                <Instagram className="h-3.5 w-3.5 text-pink-400" /> Publicar também no Instagram @roxou.pp
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Requer status "Publicado" e imagem de capa. O card vai direto para o feed.
              </span>
            </Label>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-3 pt-2 sticky bottom-2">
          <Button type="submit" disabled={saving} variant="secondary" className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar notícia"}
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => persist(true)}
            className="gap-2 bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-400 text-black hover:from-orange-400 hover:to-yellow-300 shadow-[0_0_25px_-5px_rgba(251,146,60,0.6)] font-bold"
          >
            <Rocket className="h-4 w-4" /> {saving ? "Publicando..." : "Salvar e publicar"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NoticiaForm;

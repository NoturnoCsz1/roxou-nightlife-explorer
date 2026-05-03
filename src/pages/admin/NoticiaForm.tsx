import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Instagram } from "lucide-react";
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
  { value: "shows", label: "Shows" },
  { value: "rodeio", label: "Rodeio" },
  { value: "gastronomia", label: "Gastronomia" },
  { value: "avisos", label: "Avisos" },
  { value: "geral", label: "Geral" },
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
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [autoPublishIG, setAutoPublishIG] = useState(false);

  useEffect(() => {
    if (!editing) return;
    (async () => {
      const { data, error } = await supabase.from("expo_news").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
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
      });
      setSlugTouched(true);
      setLoading(false);
    })();
  }, [id, editing, navigate]);

  const updateTitle = (title: string) => {
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.author) {
      return toast({ title: "Preencha título e autor", variant: "destructive" });
    }
    setSaving(true);
    const payload = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      excerpt: form.excerpt || null,
      content: form.content,
      cover_image_url: form.cover_image_url || null,
      author: form.author,
      category: form.category,
      status: form.status,
      published_at:
        form.status === "published"
          ? form.published_at || new Date().toISOString()
          : null,
    };

    const op = editing
      ? supabase.from("expo_news").update(payload).eq("id", id!).select("id, cover_image_url, title, excerpt, author").single()
      : supabase.from("expo_news").insert(payload).select("id, cover_image_url, title, excerpt, author").single();

    const { data: saved, error } = await op;
    if (error) { setSaving(false); return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); }

    // Publicação direta no Instagram
    if (autoPublishIG && payload.status === "published" && saved?.cover_image_url) {
      const caption = `📰 ${saved.title}\n\n${saved.excerpt || ""}\n\nLeia em roxou.com.br/expo2026/noticia/${payload.slug}\n\nPor ${saved.author} · ROXOU`;
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
      toast({ title: editing ? "Notícia atualizada" : "Notícia criada" });
    }
    setSaving(false);
    navigate("/admin/noticias");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link to="/admin/noticias" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-black font-display">{editing ? "Editar notícia" : "Nova notícia"}</h1>
      </div>

      <form onSubmit={submit} className="space-y-4 max-w-3xl">
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

        <div>
          <Label>Imagem de capa</Label>
          <ImageUpload
            folder="expo-news"
            currentUrl={form.cover_image_url}
            onUploaded={(url) => setForm((f) => ({ ...f, cover_image_url: url }))}
            label=""
          />
        </div>

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
          <Label>Conteúdo (HTML simples permitido: &lt;p&gt; &lt;strong&gt; &lt;em&gt; &lt;ul&gt; &lt;li&gt;)</Label>
          <Textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={14}
            placeholder="Escreva a matéria. Pode usar HTML básico para formatar."
            className="font-mono text-sm"
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-pink-500/30 bg-gradient-to-r from-pink-500/5 to-purple-500/5 p-3">
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

        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar notícia"}
        </Button>
      </form>
    </div>
  );
};

export default NoticiaForm;

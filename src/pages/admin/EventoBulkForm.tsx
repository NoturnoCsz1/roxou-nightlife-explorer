import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Save, Send, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import EventFormBlock, { emptyEventForm, type EventFormData } from "@/components/admin/EventFormBlock";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { buildEventPayload } from "@/lib/adminEventPayload";

type Partner = Tables<"partners">;

const EventoBulkForm = () => {
  const navigate = useNavigate();
  const { cityFilter } = useAdminProfile();
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [forms, setForms] = useState<EventFormData[]>([emptyEventForm()]);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);

  async function handleGenerateDescription(index: number) {
    const form = forms[index];
    if (!form.title) return;
    setGeneratingIdx(index);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          title: form.title,
          venue_name: form.venue_name,
          date_time: form.date_time,
          category: form.category,
          image_url: form.image_url,
        },
      });
      if (error) throw error;
      if (data?.description) {
        setForms((prev) => prev.map((f, i) => i === index ? { ...f, description: f.description || data.description } : f));
        toast.success(`Descrição gerada para o evento ${index + 1}!`);
      }
    } catch (err: any) {
      console.error("Erro ao gerar descrição:", err);
      toast.error("Erro ao gerar descrição");
    } finally {
      setGeneratingIdx(null);
    }
  }

  async function handleGenerateAll() {
    const empty = forms.map((f, i) => ({ f, i })).filter(({ f }) => !f.description && f.title);
    if (!empty.length) {
      toast.info("Todos os eventos já possuem descrição");
      return;
    }
    for (const { i } of empty) {
      await handleGenerateDescription(i);
    }
  }

  useEffect(() => {
    let query = supabase.from("partners").select("*").eq("active", true).order("name");
    if (cityFilter) query = query.eq("city", cityFilter);
    query.then(({ data }) => setPartners(data || []));
  }, [cityFilter]);

  function handleFormChange(index: number, updated: EventFormData) {
    setForms((prev) => prev.map((f, i) => (i === index ? updated : f)));
  }

  function addForm() {
    setForms((prev) => [...prev, emptyEventForm()]);
  }

  function removeForm(index: number) {
    setForms((prev) => prev.filter((_, i) => i !== index));
  }

  function findDuplicates(): number[] {
    const seen = new Map<string, number>();
    const dupes: number[] = [];
    for (let i = 0; i < forms.length; i++) {
      const slug = forms[i].slug.trim().toLowerCase();
      const title = forms[i].title.trim().toLowerCase();
      const keys = [`slug:${slug}`, `title:${title}`];
      for (const key of keys) {
        if (!key.endsWith(":")) {
          const prev = seen.get(key);
          if (prev !== undefined) {
            if (!dupes.includes(prev)) dupes.push(prev);
            if (!dupes.includes(i)) dupes.push(i);
          } else {
            seen.set(key, i);
          }
        }
      }
    }
    return dupes.sort((a, b) => a - b);
  }

  async function handleBulkSave(status: "draft" | "published") {
    const invalid = forms.findIndex((f) => !f.title || !f.slug || !f.date_time);
    if (invalid !== -1) {
      toast.error(`Evento ${invalid + 1}: Título, slug e data são obrigatórios`);
      return;
    }

    const dupes = findDuplicates();
    if (dupes.length > 0) {
      const blocos = dupes.map((i) => `Bloco ${i + 1}${forms[i].title ? ` (${forms[i].title})` : ""}`).join(", ");
      toast.error(`Duplicidade detectada: ${blocos}. Verifique título ou slug repetido.`);
      return;
    }

    setSaving(true);
    const payloads = forms.map((form) => buildEventPayload(form, { city: cityFilter, status }));

    try {
      const { error } = await supabase.from("events").insert(payloads);
      if (error) throw error;
      toast.success(`${forms.length} evento(s) ${status === "published" ? "publicado(s)" : "salvo(s) como rascunho"}!`);
      navigate("/admin/eventos");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="md:ml-44 max-w-xl pb-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-foreground">Criar Eventos em Lote</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={generatingIdx !== null}
            onClick={handleGenerateAll}
            className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition disabled:opacity-50"
          >
            {generatingIdx !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Gerar descrições
          </button>
          <span className="text-xs text-muted-foreground">{forms.length} evento(s)</span>
        </div>
      </div>

      <div className="space-y-4">
        {forms.map((form, i) => (
          <EventFormBlock
            key={i}
            index={i}
            form={form}
            partners={partners}
            onChange={handleFormChange}
            onRemove={removeForm}
            showRemove={forms.length > 1}
            onGenerateDescription={handleGenerateDescription}
            generatingDesc={generatingIdx === i}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addForm}
        className="mt-4 flex items-center gap-1.5 w-full justify-center rounded-lg border border-dashed border-border/60 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar mais um evento
      </button>

      <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          disabled={saving}
          onClick={() => handleBulkSave("draft")}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 transition disabled:opacity-50 flex-1"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar todos como rascunho"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleBulkSave("published")}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 flex-1"
        >
          <Send className="h-4 w-4" />
          {saving ? "Publicando..." : "Publicar todos"}
        </button>
      </div>
    </div>
  );
};

export default EventoBulkForm;

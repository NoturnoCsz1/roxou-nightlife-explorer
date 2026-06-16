import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PartnerEventPayload, PartnerEventRow } from "../services/partnerEvents";

interface Props {
  initial?: Partial<PartnerEventRow>;
  busy?: boolean;
  submitLabel?: string;
  onSubmit: (payload: PartnerEventPayload) => void | Promise<void>;
  onCancel?: () => void;
}

const CATEGORIES = ["festa", "show", "bar", "gastronomia", "cultura", "esporte"];

/** Converte ISO timestamptz para o formato `datetime-local` em America/Sao_Paulo. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const sp = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${sp.getFullYear()}-${pad(sp.getMonth() + 1)}-${pad(sp.getDate())}T${pad(sp.getHours())}:${pad(sp.getMinutes())}`;
}

export function PartnerEventForm({
  initial,
  busy,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [shortSummary, setShortSummary] = useState(initial?.short_summary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dateTime, setDateTime] = useState(toLocalInput(initial?.date_time));
  const [venue, setVenue] = useState(initial?.venue_name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "festa");
  const [subCategory, setSubCategory] = useState(initial?.sub_category ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [ticketUrl, setTicketUrl] = useState(initial?.ticket_url ?? "");
  const [igCaption, setIgCaption] = useState(initial?.instagram_caption ?? "");
  const [tagsText, setTagsText] = useState(
    (initial?.opportunity_tags ?? []).join(", "),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // datetime-local é interpretado como horário local do usuário; o admin do
    // Roxou opera sempre em SP, então anexamos -03:00 para evitar drift.
    const iso = dateTime ? `${dateTime}:00-03:00` : "";
    const payload: PartnerEventPayload = {
      title,
      short_summary: shortSummary,
      description,
      date_time: iso,
      venue_name: venue,
      category,
      sub_category: subCategory,
      image_url: imageUrl,
      ticket_url: ticketUrl,
      instagram_caption: igCaption,
      opportunity_tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    void onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="date_time">Data e hora *</Label>
          <Input
            id="date_time"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="venue">Local</Label>
          <Input
            id="venue"
            value={venue ?? ""}
            onChange={(e) => setVenue(e.target.value)}
            maxLength={200}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sub">Subcategoria</Label>
          <Input
            id="sub"
            value={subCategory ?? ""}
            onChange={(e) => setSubCategory(e.target.value)}
            maxLength={80}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="short">Resumo curto</Label>
        <Input
          id="short"
          value={shortSummary ?? ""}
          onChange={(e) => setShortSummary(e.target.value)}
          maxLength={180}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="desc">Descrição</Label>
        <Textarea
          id="desc"
          rows={5}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="image">Imagem (URL)</Label>
          <Input
            id="image"
            value={imageUrl ?? ""}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ticket">Link de ingresso</Label>
          <Input
            id="ticket"
            value={ticketUrl ?? ""}
            onChange={(e) => setTicketUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="ig">Legenda Instagram</Label>
        <Textarea
          id="ig"
          rows={3}
          value={igCaption ?? ""}
          onChange={(e) => setIgCaption(e.target.value)}
          maxLength={2000}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
        <Input
          id="tags"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="open bar, sertanejo, fim de semana"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={busy} className="bg-fuchsia-600 hover:bg-fuchsia-500">
          {busy ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VipListPayload } from "../services/partnerVipLists";

interface Props {
  initial?: VipListPayload;
  onSubmit: (payload: VipListPayload) => void | Promise<void>;
  submitting?: boolean;
}

export function VipListForm({ initial, onSubmit, submitting }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [startsAt, setStartsAt] = useState(initial?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState(initial?.ends_at ?? "");
  const [maxEntries, setMaxEntries] = useState<string>(
    initial?.max_entries != null ? String(initial.max_entries) : "",
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          title: title.trim(),
          description: description || null,
          starts_at: startsAt || null,
          ends_at: endsAt || null,
          max_entries: maxEntries ? Number(maxEntries) : null,
        });
      }}
    >
      <div>
        <Label>Título</Label>
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Lista VIP — Sexta no rooftop"
        />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Início</Label>
          <Input
            type="datetime-local"
            value={startsAt ?? ""}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div>
          <Label>Fim</Label>
          <Input
            type="datetime-local"
            value={endsAt ?? ""}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label>Capacidade de convidados</Label>
        <Input
          type="number"
          min={1}
          value={maxEntries}
          onChange={(e) => setMaxEntries(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={submitting || !title.trim()}>
        {submitting ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}

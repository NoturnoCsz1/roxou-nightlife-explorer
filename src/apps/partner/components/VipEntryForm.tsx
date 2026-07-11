import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VipEntryPayload } from "@modules/partner/vip";
import type { PartnerPromoter } from "@modules/partner/vip/promoters";

interface Props {
  onSubmit: (payload: VipEntryPayload) => void | Promise<void>;
  submitting?: boolean;
  promoters?: PartnerPromoter[];
  onCreatePromoter?: (name: string) => Promise<PartnerPromoter | null>;
}

export function VipEntryForm({
  onSubmit,
  submitting,
  promoters = [],
  onCreatePromoter,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [people, setPeople] = useState("1");
  const [promoterId, setPromoterId] = useState<string>("");
  const [newPromoterName, setNewPromoterName] = useState("");
  const [savingPromoter, setSavingPromoter] = useState(false);

  const handleAddPromoter = async () => {
    if (!onCreatePromoter || !newPromoterName.trim()) return;
    setSavingPromoter(true);
    try {
      const p = await onCreatePromoter(newPromoterName.trim());
      if (p) {
        setPromoterId(p.id);
        setNewPromoterName("");
      }
    } finally {
      setSavingPromoter(false);
    }
  };

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          name: name.trim(),
          phone: phone || null,
          email: email || null,
          people_count: Number(people) || 1,
          promoter_id: promoterId || null,
        });
        setName("");
        setPhone("");
        setEmail("");
        setPeople("1");
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <Label>Nome</Label>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="min-w-0">
          <Label>Telefone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="min-w-0">
          <Label>E-mail</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="min-w-0">
          <Label>Convidados</Label>
          <Input
            type="number"
            min={1}
            value={people}
            onChange={(e) => setPeople(e.target.value)}
          />
        </div>
        <div className="min-w-0 sm:col-span-2">
          <Label>Promoter</Label>
          <select
            value={promoterId}
            onChange={(e) => setPromoterId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Sem promoter —</option>
            {promoters.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {onCreatePromoter ? (
          <div className="min-w-0 sm:col-span-2">
            <Label>Novo promoter</Label>
            <div className="flex gap-2">
              <Input
                value={newPromoterName}
                onChange={(e) => setNewPromoterName(e.target.value)}
                placeholder="Nome do promoter"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleAddPromoter}
                disabled={savingPromoter || !newPromoterName.trim()}
              >
                {savingPromoter ? "..." : "Adicionar"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <Button type="submit" disabled={submitting || !name.trim()} size="sm">
        {submitting ? "Adicionando..." : "Adicionar convidado"}
      </Button>
    </form>
  );
}

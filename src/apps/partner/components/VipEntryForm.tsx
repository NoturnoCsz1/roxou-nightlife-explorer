import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VipEntryPayload } from "../services/partnerVipLists";

interface Props {
  onSubmit: (payload: VipEntryPayload) => void | Promise<void>;
  submitting?: boolean;
}

export function VipEntryForm({ onSubmit, submitting }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [people, setPeople] = useState("1");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          name: name.trim(),
          phone: phone || null,
          email: email || null,
          people_count: Number(people) || 1,
        });
        setName("");
        setPhone("");
        setEmail("");
        setPeople("1");
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Nome</Label>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label>Pessoas</Label>
          <Input
            type="number"
            min={1}
            value={people}
            onChange={(e) => setPeople(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={submitting || !name.trim()} size="sm">
        {submitting ? "Adicionando..." : "Adicionar convidado"}
      </Button>
    </form>
  );
}

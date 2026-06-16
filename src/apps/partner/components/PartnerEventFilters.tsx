import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PartnerEventStatus } from "../services/partnerEvents";

export interface PartnerEventFiltersValue {
  status: PartnerEventStatus | "all";
  search: string;
}

interface Props {
  value: PartnerEventFiltersValue;
  onChange: (v: PartnerEventFiltersValue) => void;
}

const STATUS: Array<{ value: PartnerEventStatus | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Rascunho" },
  { value: "pending", label: "Em revisão" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Arquivado" },
];

export function PartnerEventFilters({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        placeholder="Buscar por título…"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        className="sm:max-w-xs"
      />
      <Select
        value={value.status}
        onValueChange={(s) =>
          onChange({ ...value, status: s as PartnerEventStatus | "all" })
        }
      >
        <SelectTrigger className="sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

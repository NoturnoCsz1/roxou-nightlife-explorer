import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PartnerReservationStatus } from "../services/partnerReservations";

export interface ReservationFiltersValue {
  status: PartnerReservationStatus | "all";
  search: string;
}

export function ReservationFilters({
  value,
  onChange,
}: {
  value: ReservationFiltersValue;
  onChange: (v: ReservationFiltersValue) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        placeholder="Buscar por nome, telefone ou e-mail"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        className="sm:max-w-xs"
      />
      <Select
        value={value.status}
        onValueChange={(v) =>
          onChange({
            ...value,
            status: v as ReservationFiltersValue["status"],
          })
        }
      >
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="pending">Pendentes</SelectItem>
          <SelectItem value="confirmed">Confirmadas</SelectItem>
          <SelectItem value="completed">Concluídas</SelectItem>
          <SelectItem value="cancelled">Canceladas</SelectItem>
          <SelectItem value="no_show">No-show</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default ReservationFilters;

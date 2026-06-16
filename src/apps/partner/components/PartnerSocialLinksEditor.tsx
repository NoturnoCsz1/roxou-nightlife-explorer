/**
 * PartnerSocialLinksEditor — Fase 9E
 * Edita Instagram (handle) e WhatsApp do parceiro.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Instagram, Phone } from "lucide-react";

interface Props {
  instagram: string;
  whatsapp: string;
  onChange: (patch: { instagram?: string; whatsapp?: string }) => void;
  disabled?: boolean;
}

export function PartnerSocialLinksEditor({
  instagram,
  whatsapp,
  onChange,
  disabled,
}: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="partner-instagram" className="text-xs">
          Instagram
        </Label>
        <div className="relative">
          <Instagram className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="partner-instagram"
            value={instagram}
            placeholder="@seuestabelecimento"
            className="pl-8"
            disabled={disabled}
            maxLength={50}
            onChange={(e) => onChange({ instagram: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="partner-whatsapp" className="text-xs">
          WhatsApp
        </Label>
        <div className="relative">
          <Phone className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="partner-whatsapp"
            value={whatsapp}
            placeholder="+55 18 99999-9999"
            className="pl-8"
            inputMode="tel"
            disabled={disabled}
            maxLength={20}
            onChange={(e) => onChange({ whatsapp: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export default PartnerSocialLinksEditor;

import { ChevronDown, ChevronUp } from "lucide-react";
import type { SectionsState } from "./types";

interface Props {
  sectionKey: keyof SectionsState;
  label: string;
  sections: SectionsState;
  setSections: React.Dispatch<React.SetStateAction<SectionsState>>;
}

export default function EventoFormSectionHeader({ sectionKey, label, sections, setSections }: Props) {
  return (
    <button
      type="button"
      onClick={() => setSections((s) => ({ ...s, [sectionKey]: !s[sectionKey] }))}
      className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1.5 border-b border-border/30"
    >
      {label}
      {sections[sectionKey] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
    </button>
  );
}

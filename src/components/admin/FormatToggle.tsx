import { type ArtFormat, FORMAT_SIZES } from "@/lib/coverRenderer";

export type OutputFormat = "feed" | "story" | "both";

interface Props {
  value: OutputFormat;
  onChange: (v: OutputFormat) => void;
}

const OPTIONS: { key: OutputFormat; label: string; icon: string }[] = [
  { key: "feed", label: "Feed 4:5", icon: "📷" },
  { key: "story", label: "Story 9:16", icon: "📱" },
  { key: "both", label: "Feed + Story", icon: "✨" },
];

export default function FormatToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-full font-semibold transition ${
            value === o.key
              ? "bg-primary/20 text-primary"
              : "bg-secondary/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  );
}

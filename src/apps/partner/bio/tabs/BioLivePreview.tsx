import { useMemo } from "react";
import { type BioProfile } from "@/services/bio";

export function BioLivePreview({ bio }: { bio: BioProfile }) {
  const reloadKey = useMemo(
    () => `${bio.id}-${bio.display_name}-${bio.accent_color}-${bio.theme}`,
    [bio],
  );
  return (
    <div className="hidden lg:block sticky top-4">
      <div className="mx-auto" style={{ width: 360 }}>
        <div className="rounded-[2.5rem] border-8 border-foreground/80 bg-foreground/80 shadow-2xl overflow-hidden">
          <div className="h-6 bg-foreground/80 flex items-center justify-center">
            <div className="h-1 w-16 rounded-full bg-background/40" />
          </div>
          <div className="bg-black" style={{ height: 640 }}>
            <iframe
              key={reloadKey}
              src={`/bio/${bio.slug}?embed=1`}
              title="Preview Roxou Bio"
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-2">
          Preview em tempo real · /bio/{bio.slug}
        </p>
      </div>
    </div>
  );
}

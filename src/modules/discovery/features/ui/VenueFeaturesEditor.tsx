/**
 * Onda 20 — Editor visual de Features (reutilizável).
 *
 * Consome exclusivamente o catálogo do Feature Engine.
 * Não conhece Supabase — pai controla persistência.
 */
import { useMemo } from "react";
import {
  FEATURE_CATALOG,
  groupResolvedFeaturesByCategory,
  getFeatureIcon,
  type ResolvedVenueFeature,
} from "..";
import type { VenueFeatureAssignment } from "../types/feature";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props {
  selectedSlugs: string[];
  disabled?: boolean;
  onChange: (slugs: string[]) => void;
}

/**
 * Renderiza todas as features enabled agrupadas por categoria.
 * Uso: Partner Pro e Admin.
 */
export function VenueFeaturesEditor({
  selectedSlugs,
  disabled,
  onChange,
}: Props) {
  const selected = useMemo(() => new Set(selectedSlugs ?? []), [selectedSlugs]);

  const groups = useMemo(() => {
    const enabled = FEATURE_CATALOG.filter((f) => f.enabled);
    // Reusa o helper de agrupamento: transforma catálogo em assignments virtuais.
    const virtual: ResolvedVenueFeature[] = enabled.map((feature) => ({
      feature,
      assignment: {
        featureId: feature.id,
        featureSlug: feature.slug,
        source: "manual_admin",
        approved: true,
      } as VenueFeatureAssignment,
    }));
    return groupResolvedFeaturesByCategory(virtual);
  }, []);

  function toggle(slug: string, checked: boolean) {
    if (disabled) return;
    const next = new Set(selected);
    if (checked) next.add(slug);
    else next.delete(slug);
    onChange(Array.from(next));
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.category} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map(({ feature }) => {
              const Icon = getFeatureIcon(feature.icon);
              const id = `feat-${feature.slug}`;
              const isChecked = selected.has(feature.slug);
              return (
                <label
                  key={feature.slug}
                  htmlFor={id}
                  className={`flex items-start gap-2.5 rounded-lg border border-border p-2.5 text-xs transition-colors ${
                    disabled
                      ? "opacity-60"
                      : "hover:bg-secondary/40 cursor-pointer"
                  } ${isChecked ? "bg-primary/5 border-primary/40" : ""}`}
                >
                  <Checkbox
                    id={id}
                    checked={isChecked}
                    disabled={disabled}
                    onCheckedChange={(v) => toggle(feature.slug, v === true)}
                    className="mt-0.5"
                  />
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={id}
                      className="text-xs font-semibold cursor-pointer"
                    >
                      {feature.name}
                    </Label>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {feature.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default VenueFeaturesEditor;

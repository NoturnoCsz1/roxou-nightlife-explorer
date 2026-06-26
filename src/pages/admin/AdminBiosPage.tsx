/**
 * AdminBiosPage — /admin/bios
 *
 * Lista bios, busca, ativa/desativa e abre a página pública.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { listAllBios, updateBio, type BioProfile } from "@/services/bio";
import { ExternalLink } from "lucide-react";

export default function AdminBiosPage() {
  const [bios, setBios] = useState<BioProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function reload() {
    setLoading(true);
    try {
      setBios(await listAllBios());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return bios;
    return bios.filter((b) =>
      b.slug.toLowerCase().includes(t) ||
      b.display_name.toLowerCase().includes(t) ||
      (b.city ?? "").toLowerCase().includes(t),
    );
  }, [bios, q]);

  async function toggle(b: BioProfile, field: "is_active" | "is_public", v: boolean) {
    try {
      await updateBio(b.id, { [field]: v });
      setBios((prev) => prev.map((x) => (x.id === b.id ? { ...x, [field]: v } : x)));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Bios</h1>
        <Input className="max-w-xs" placeholder="Buscar por slug, nome ou cidade" value={q} onChange={(e) => setQ(e.target.value)} />
      </header>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <Card className="divide-y">
          {filtered.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-3">
              <div className="h-10 w-10 rounded-full bg-muted overflow-hidden shrink-0">
                {b.avatar_url && <img src={b.avatar_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{b.display_name}</div>
                <div className="text-xs text-muted-foreground truncate">/bio/{b.slug} · {b.type}{b.city ? ` · ${b.city}` : ""}</div>
              </div>
              <Badge variant="outline">{b.type}</Badge>
              <div className="flex items-center gap-2">
                <span className="text-xs">Ativa</span>
                <Switch checked={b.is_active} onCheckedChange={(v) => toggle(b, "is_active", v)} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">Pública</span>
                <Switch checked={b.is_public} onCheckedChange={(v) => toggle(b, "is_public", v)} />
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={`/bio/${b.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
          {filtered.length === 0 && <p className="p-6 text-center text-muted-foreground">Nenhuma bio encontrada.</p>}
        </Card>
      )}
    </div>
  );
}

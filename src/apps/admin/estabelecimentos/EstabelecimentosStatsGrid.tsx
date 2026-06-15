import {
  AlertTriangle, CheckCircle2, Eye, FileText, Gauge,
  Image as ImageIcon, Instagram as InstagramIcon, MapPin, Music,
} from "lucide-react";
import { Stat } from "./Stat";
import type { QualityFilter } from "./types";

interface Props {
  stats: {
    total: number; ativo: number; destaque: number; oficial: number; errors: number;
    completos: number; precisamAtencao: number;
    semLogo: number; semCoords: number; semInstagram: number; semDescricao: number; semEstilo: number;
    avgScore: number;
  };
  qualityFilter: QualityFilter;
  setQualityFilter: (q: QualityFilter) => void;
}

export function EstabelecimentosStatsGrid({ stats, qualityFilter, setQualityFilter }: Props) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Total" value={stats.total} icon={<Eye className="h-3 w-3" />} />
        <Stat label="Completos (≥90)" value={stats.completos} tone="green" icon={<CheckCircle2 className="h-3 w-3" />} />
        <Stat label="Precisam atenção (<60)" value={stats.precisamAtencao} tone="red" icon={<AlertTriangle className="h-3 w-3" />} />
        <Stat label="Score médio" value={stats.avgScore} tone={stats.avgScore >= 70 ? "green" : stats.avgScore >= 50 ? "amber" : "red"} icon={<Gauge className="h-3 w-3" />} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Stat label="Sem logo" value={stats.semLogo} tone="amber" icon={<ImageIcon className="h-3 w-3" />} onClick={() => setQualityFilter("no_logo")} active={qualityFilter === "no_logo"} />
        <Stat label="Sem coordenadas" value={stats.semCoords} tone="amber" icon={<MapPin className="h-3 w-3" />} onClick={() => setQualityFilter("no_coords")} active={qualityFilter === "no_coords"} />
        <Stat label="Sem Instagram" value={stats.semInstagram} tone="amber" icon={<InstagramIcon className="h-3 w-3" />} onClick={() => setQualityFilter("no_instagram")} active={qualityFilter === "no_instagram"} />
        <Stat label="Sem descrição" value={stats.semDescricao} tone="amber" icon={<FileText className="h-3 w-3" />} onClick={() => setQualityFilter("no_description")} active={qualityFilter === "no_description"} />
        <Stat label="Sem estilo musical" value={stats.semEstilo} tone="amber" icon={<Music className="h-3 w-3" />} onClick={() => setQualityFilter("no_music_style")} active={qualityFilter === "no_music_style"} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Ativos" value={stats.ativo} tone="green" />
        <Stat label="Destaque" value={stats.destaque} tone="amber" />
        <Stat label="Oficiais" value={stats.oficial} tone="primary" />
        <Stat label="Com erro" value={stats.errors} tone="red" />
      </div>
    </div>
  );
}

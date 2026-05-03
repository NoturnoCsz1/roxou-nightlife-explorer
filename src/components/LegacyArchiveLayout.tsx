import { useEffect } from "react";
import { Outlet } from "react-router-dom";

/**
 * Wrapper para rotas legadas (v2) arquivadas em /archive/legacy-v2/*.
 * Injeta meta robots=noindex,nofollow para impedir indexação.
 */
export default function LegacyArchiveLayout() {
  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]');
    const meta = existing ?? document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex, nofollow, noarchive");
    if (!existing) document.head.appendChild(meta);

    return () => {
      // Restaura para indexável quando sair das rotas legadas
      meta.setAttribute("content", "index, follow");
    };
  }, []);

  return <Outlet />;
}

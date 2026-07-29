import { useEffect, useState } from "react";
import { BDA_DEFAULT_SETTINGS, type BdaSettings } from "@/components/bda/bdaConfig";
import { fetchBdaSettings } from "./bdaService";

/**
 * Configuração operacional da BDA (fonte única: tabela `bda_settings`).
 * Enquanto carrega, usa o fallback seguro: inscrições fechadas, sem data.
 */
export function useBdaSettings() {
  const [settings, setSettings] = useState<BdaSettings>(BDA_DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchBdaSettings()
      .then((s) => alive && setSettings(s))
      .catch(() => alive && setSettings(BDA_DEFAULT_SETTINGS))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { settings, loading };
}

/**
 * Partner Pro — entry standalone para parceiro.roxou.com.br (Fase 9M).
 *
 * Bundle separado do app principal Roxou. Não registra o service worker
 * principal (PWA fica reservado ao bundle público).
 */
import { createRoot } from "react-dom/client";
import PartnerApp from "./App";
import "@/index.css";

createRoot(document.getElementById("root")!).render(<PartnerApp />);

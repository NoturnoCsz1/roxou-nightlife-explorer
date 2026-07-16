import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// midia.roxou.com.br → sempre entra no site institucional (/midia)
if (
  typeof window !== "undefined" &&
  window.location.hostname.startsWith("midia.") &&
  window.location.pathname === "/"
) {
  window.history.replaceState(null, "", "/midia");
}

// Force immediate update when new SW is available
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);

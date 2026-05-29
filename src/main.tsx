import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Force immediate update when new SW is available
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);

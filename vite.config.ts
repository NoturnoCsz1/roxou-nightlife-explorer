import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// FASE 10G.1 — PWA opcional.
// Em ambientes que apresentam conflito do source-phase import
// (`vite/modulepreload-polyfill`) com o multi-entry (index.html +
// partner/index.html), basta exportar `VITE_DISABLE_PWA=true` (ou
// `DISABLE_PWA=true`) antes do `bun run build` para gerar um bundle
// sem o plugin PWA. Útil exclusivamente para destravar a VPS sem
// quebrar o build padrão da Lovable.
const disablePwa =
  process.env.VITE_DISABLE_PWA === "true" ||
  process.env.DISABLE_PWA === "true";

// Carimbo de build (lido em /admin/system).
const BUILD_TIME = new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3010,
    allowedHosts: [
      "vps.roxou.com.br",
      "localhost",
      "173.212.220.180",
    ],
  },
  define: {
    __ROXOU_BUILD_TIME__: JSON.stringify(BUILD_TIME),
    __ROXOU_PWA_ENABLED__: JSON.stringify(!disablePwa),
  },
  plugins: [
    react(),
    mcpPlugin(),
    mode === "development" && componentTagger(),
    !disablePwa &&
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.png", "og-image.png"],
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,webp,woff2}"],
          // LCP-4D: exclui do precache inicial chunks pesados de rotas raras
          // (admin/partner/reservas/bio). Continuam disponíveis via download
          // sob demanda quando a rota correspondente for acessada.
          globIgnores: [
            "**/assets/vendor-recharts-*.js",
            "**/assets/vendor-qrcode-*.js",
            "**/assets/leaflet-*.js",
            "**/assets/*leaflet*.js",
            "**/assets/V3AIChat-*.js",
            "**/assets/InstagramAdmin-*.js",
            "**/assets/EventoForm-*.js",
            "**/assets/EventoBulkForm-*.js",
            "**/assets/EventosList-*.js",
            "**/assets/jszip-*.js",
            "**/assets/*jszip*.js",
            "**/assets/qr-scanner-worker-*.js",
            "**/assets/*qr-scanner*.js",
            "**/assets/Radar-*.js",
            "**/assets/*Radar*.js",
            "**/assets/EstabelecimentosAudit-*.js",
            "**/assets/SEOLanding-*.js",
            "**/assets/*SEOLanding*.js",
            "**/assets/Dashboard-*.js",
            "**/assets/*Dashboard*.js",
            "**/assets/PartnerPromoterCentralPage-*.js",
          ],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/~oauth/, /^\/health/, /^\/partner\/health/],
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/bapdgykghciiyvlqdrqx\.supabase\.co\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-api",
                expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              },
            },
          ],
        },
        manifest: {
          name: "ROXOU — Eventos em Presidente Prudente",
          short_name: "ROXOU",
          description: "Descubra festas, baladas, shows e bares acontecendo em Presidente Prudente.",
          theme_color: "#7c3aed",
          background_color: "#0d0a14",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          categories: ["entertainment", "lifestyle"],
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
      }),
    Boolean(process.env.ANALYZE) && visualizer({
      filename: "dist/stats.html",
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@public": path.resolve(__dirname, "./src/apps/public"),
      "@admin": path.resolve(__dirname, "./src/apps/admin"),
      "@partner": path.resolve(__dirname, "./src/apps/partner"),
      "@transport": path.resolve(__dirname, "./src/apps/transport"),
      "@games": path.resolve(__dirname, "./src/apps/games"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@services": path.resolve(__dirname, "./src/services"),
    },
    dedupe: ["react", "react-dom"],
  },
  // Multi-entry:
  //   dist/index.html         → roxou.com.br (app público + admin)
  //   dist/partner/index.html → parceiro.roxou.com.br (Partner Pro)
  build: {
    // LCP-4D: impede <link rel="modulepreload"> automático para chunks
    // que não são usados no first paint da Home (recharts, qrcode).
    // Os chunks continuam existindo e são carregados sob demanda.
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter(
          (d) =>
            !/vendor-recharts-.*\.js$/.test(d) &&
            !/vendor-qrcode-.*\.js$/.test(d),
        ),
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        partner: path.resolve(__dirname, "partner/index.html"),
      },
      output: {
        // LCP-4F-1-B: isola React/ReactDOM/scheduler em uma chunk vendor
        // dedicada. Sem isto, Rollup hoisted React para dentro da chunk
        // `vendor-recharts` (dep compartilhada), forçando main.js a importar
        // vendor-recharts.js só para obter React — 551 KiB decoded no LCP.
        manualChunks: (id) => {
          if (
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "vendor-recharts";
          }
          if (id.includes("node_modules/qrcode")) {
            return "vendor-qrcode";
          }
          return undefined;
        },
      },

    },
  },
}));

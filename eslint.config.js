import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * Onda 1 — fronteiras de dependência.
 *
 * Regras rígidas aplicam-se APENAS aos novos módulos (`src/contracts/**`,
 * `src/modules/**`, `src/app/**`). O legado (`src/pages/**`, `src/apps/**`,
 * `src/components/**`, `src/hooks/**`, `src/services/**`, `src/lib/**`)
 * segue com as regras existentes, sem quebrar o build.
 *
 * Fonte de verdade: `docs/regras-dependencias-modulos.md`.
 */
export default tseslint.config(
  { ignores: ["dist", "scripts/audit-cycles.mjs"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // Contratos: TypeScript puro. Sem React, sem Supabase, sem módulos, sem legado.
  {
    files: ["src/contracts/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react-dom", "react/*", "react-dom/*"], message: "contracts é TS puro — sem React." },
            { group: ["@/integrations/supabase/*", "@integrations/supabase/*"], message: "contracts não fala com Supabase." },
            { group: ["@modules/*", "@app/*"], message: "contracts não depende de módulos ou do shell." },
            { group: ["@/apps/*", "@public/*", "@admin/*", "@partner/*", "@transport/*", "@games/*"], message: "contracts não depende do legado apps/*." },
            { group: ["@/pages/*", "@/components/*", "@/hooks/*", "@/lib/*", "@/services/*", "@services/*"], message: "contracts não depende do legado src/{pages,components,hooks,lib,services}." },
          ],
        },
      ],
    },
  },

  // Módulos: sem imports cross-produto. Usar @contracts/*.
  {
    files: ["src/modules/discovery/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@modules/partner/*", "@modules/transport/*", "@modules/admin/*"], message: "discovery não importa outros módulos — use @contracts/*." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/partner/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@modules/discovery/*", "@modules/transport/*", "@modules/admin/*"], message: "partner não importa outros módulos — use @contracts/*." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/transport/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@modules/discovery/*", "@modules/partner/*", "@modules/admin/*"], message: "transport não importa outros módulos — use @contracts/*." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/admin/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@modules/discovery/*/pages/*", "@modules/partner/*/pages/*", "@modules/transport/*/pages/*"], message: "admin não importa páginas reais de produto — use @contracts/*." },
          ],
        },
      ],
    },
  },

  // Shared: não conhece produto nem legado de páginas.
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@modules/*", "@app/*", "@/apps/*", "@/pages/*", "@public/*", "@admin/*", "@partner/*", "@transport/*", "@games/*"], message: "shared não depende de produto — mova o consumidor." },
          ],
        },
      ],
    },
  },

  // Integrations: adapters técnicos. Nada de produto.
  {
    files: ["src/integrations/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@modules/*", "@app/*", "@/apps/*", "@/pages/*"], message: "integrations não depende de produto." },
          ],
        },
      ],
    },
  },
);

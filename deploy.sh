#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# Roxou VPS — deploy unificado (FASE 10G.1)
#
# Uso:
#   ./deploy.sh                  # deploy padrão com PWA desabilitado
#   PWA=true ./deploy.sh         # força build COM PWA (raro)
#
# Pré-requisitos na VPS:
#   - bun ou npm/pnpm
#   - pm2 com processos já registrados (ver ecosystem.config.js)
#   - nginx com config em /etc/nginx/sites-enabled/roxou.conf
#   - acesso git já configurado
# ════════════════════════════════════════════════════════════════════
set -euo pipefail

BRANCH="${BRANCH:-main}"
PWA="${PWA:-false}"

echo "▶ git pull origin ${BRANCH}"
git pull origin "${BRANCH}"

echo "▶ bun install"
bun install --frozen-lockfile || bun install

if [ "${PWA}" = "true" ]; then
  echo "▶ build (PWA on)"
  bun run build
else
  echo "▶ build (PWA OFF — VITE_DISABLE_PWA=true)"
  VITE_DISABLE_PWA=true bun run build
fi

echo "▶ pm2 restart all --update-env"
pm2 restart all --update-env

echo "▶ nginx -t"
sudo nginx -t

echo "▶ systemctl reload nginx"
sudo systemctl reload nginx

echo "▶ pm2 save"
pm2 save

echo "▶ pm2 status"
pm2 status

echo "✅ Deploy concluído em $(date -Iseconds)"

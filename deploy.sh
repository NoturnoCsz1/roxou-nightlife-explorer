#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# Roxou VPS — deploy unificado (FASE 10G.1.1)
#
# Uso:
#   ./deploy.sh                  # deploy padrão com PWA desabilitado
#   PWA=true ./deploy.sh         # força build COM PWA (raro)
#   ROLLBACK=<sha> ./deploy.sh   # checkout em <sha> e redeploy
#
# Health checks executados após reload do nginx:
#   curl -fsS https://localhost/health
#   curl -fsS https://localhost/partner/health
#
# Rollback manual (sem usar ROLLBACK=):
#   cd /var/www/roxou
#   git log --oneline -n 10
#   git checkout <sha-anterior>
#   VITE_DISABLE_PWA=true bun run build
#   pm2 restart all --update-env && sudo systemctl reload nginx
#
# Comandos úteis:
#   ./deploy.sh                            # deploy
#   pm2 status                             # ver processos
#   pm2 logs roxou-web --lines 200         # logs web
#   pm2 logs roxou-partner --lines 200     # logs partner
#   bun run clean:cache || rm -rf node_modules/.cache .vite dist
#   curl -fsS https://roxou.com.br/health  # smoke test público
# ════════════════════════════════════════════════════════════════════
set -euo pipefail

BRANCH="${BRANCH:-main}"
PWA="${PWA:-false}"
ROLLBACK="${ROLLBACK:-}"
HEALTH_HOST="${HEALTH_HOST:-http://127.0.0.1}"

if [ -n "${ROLLBACK}" ]; then
  echo "↩ rollback para ${ROLLBACK}"
  git fetch --all
  git checkout "${ROLLBACK}"
else
  echo "▶ git pull origin ${BRANCH}"
  git pull origin "${BRANCH}"
fi

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

# ────────── FASE 10G.1.1: health checks pós-deploy ──────────
echo "▶ health check ${HEALTH_HOST}/health"
if ! curl -fsS --max-time 5 "${HEALTH_HOST}/health" >/dev/null; then
  echo "❌ /health falhou — verifique pm2 logs roxou-web"
  pm2 status
  exit 1
fi
echo "✓ /health OK"

echo "▶ health check ${HEALTH_HOST}/partner/health"
if ! curl -fsS --max-time 5 "${HEALTH_HOST}/partner/health" >/dev/null; then
  echo "⚠ /partner/health falhou — verifique pm2 logs roxou-partner"
  pm2 status
  # não interrompe: partner pode estar em manutenção
fi
echo "✓ /partner/health verificado"

echo "▶ pm2 status"
pm2 status

echo "✅ Deploy concluído em $(date -Iseconds)"

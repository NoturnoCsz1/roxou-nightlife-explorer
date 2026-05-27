# Roxou VPS — Setup de Servidor

> Guia de provisionamento da VPS. Nenhum passo abaixo deve ser executado em produção
> sem antes validar tudo em `beta.roxou.com.br`.

## 1. Estrutura de pastas

```text
/var/www/roxou/
├── apps/
│   ├── web/                 # SPA buildada (dist/)
│   ├── api/                 # roxou-api + worker + cron
│   └── cortes/              # roxou-cortes (repo separado)
├── storage/
│   ├── uploads/             # uploads brutos (flyers grandes, vídeos curtos)
│   ├── renders/             # vídeos/reels finalizados
│   ├── thumbnails/          # webp/jpg
│   └── temp/                # FFmpeg scratch (limpa diariamente)
├── logs/                    # PM2 + Nginx app logs
└── backups/                 # pg_dump diários
```

Permissões:
```bash
sudo mkdir -p /var/www/roxou/{apps/{web,api,cortes},storage/{uploads,renders,thumbnails,temp},logs,backups}
sudo chown -R deploy:deploy /var/www/roxou
sudo chmod -R 750 /var/www/roxou
sudo chmod -R 770 /var/www/roxou/storage /var/www/roxou/logs
```

## 2. Pacotes base (Ubuntu 22.04+)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx ufw fail2ban certbot python3-certbot-nginx \
  ffmpeg tesseract-ocr tesseract-ocr-por logrotate htop
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2 bun serve
```

## 3. Segurança

### Usuário sem root
```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
sudo passwd -l root
```

### SSH key-only (`/etc/ssh/sshd_config`)
```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

### UFW
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### fail2ban
```bash
sudo systemctl enable --now fail2ban
# /etc/fail2ban/jail.local: ativar [sshd] e [nginx-limit-req]
```

### PM2 startup
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy
```

## 4. Backups

`/etc/cron.d/roxou-backups`:
```cron
0 3 * * * deploy /usr/bin/pg_dump "$SUPABASE_DB_URL" | gzip > /var/www/roxou/backups/pg_$(date +\%F).sql.gz
15 3 * * * deploy find /var/www/roxou/backups -name 'pg_*.sql.gz' -mtime +14 -delete
0 4 * * * deploy /usr/bin/find /var/www/roxou/storage/temp -type f -mtime +1 -delete
```

## 5. logrotate (`/etc/logrotate.d/roxou`)

```text
/var/www/roxou/logs/*.log {
  daily
  rotate 14
  compress
  delaycompress
  missingok
  notifempty
  copytruncate
  su deploy deploy
}
```

## 6. TLS

```bash
sudo certbot --nginx -d roxou.com.br -d www.roxou.com.br
sudo certbot --nginx -d api.roxou.com.br
sudo certbot --nginx -d cortes.roxou.com.br
sudo systemctl enable --now certbot.timer
```

## 7. Plano de DNS (Cloudflare)

1. Subir tudo em `beta.roxou.com.br` (CNAME para a VPS).
2. Validar checklist funcional completo (ver `ROXOU_VPS_MIGRATION_PLAN.md`).
3. Reduzir TTL de `roxou.com.br` para 300s **48h antes** do swap.
4. Swap: trocar A/CNAME apex para IP da VPS.
5. Manter `roxou.lovable.app` ativo por 7 dias como rollback.
6. Após verde: aumentar TTL para 3600s.

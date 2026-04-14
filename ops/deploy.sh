#!/bin/bash
# =============================================================================
#  Clinic CRM — Production Server Setup Script
#  Domain: app.clary.uz
#  Server: Ubuntu 22.04 LTS
#
#  Ishlatish:
#    chmod +x deploy.sh
#    sudo ./deploy.sh
# =============================================================================

set -e

DOMAIN="app.clary.uz"
APP_DIR="/opt/clinic-crm"
REPO_URL=""   # <-- git repo URL ni shu yerga qo'ying (ixtiyoriy)

echo "============================================"
echo "  Clinic CRM — Server Setup  ($DOMAIN)"
echo "============================================"

# ─── 1. Tizim yangilash ───────────────────────────────────────────────────
echo "[1/7] Tizim yangilanmoqda..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw

# ─── 2. Docker o'rnatish ──────────────────────────────────────────────────
echo "[2/7] Docker o'rnatilmoqda..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker $SUDO_USER
fi
if ! command -v docker compose &> /dev/null; then
  apt-get install -y docker-compose-v2
fi
docker --version
docker compose version

# ─── 3. Certbot o'rnatish ─────────────────────────────────────────────────
echo "[3/7] Certbot o'rnatilmoqda..."
apt-get install -y certbot

# ─── 4. Firewall sozlash ──────────────────────────────────────────────────
echo "[4/7] Firewall sozlanmoqda..."
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ─── 5. Loyiha papkasini tayyorlash ──────────────────────────────────────
echo "[5/7] Loyiha tayyorlanmoqda..."
mkdir -p $APP_DIR
mkdir -p /var/www/certbot

if [ -n "$REPO_URL" ]; then
  git clone "$REPO_URL" "$APP_DIR" || (cd "$APP_DIR" && git pull)
else
  echo "  ESLATMA: Loyihani $APP_DIR ga qo'lda ko'chiring (scp yoki git)."
  echo "  Keyin yana shu scriptni ishga tushiring yoki quyidagi 6-7 qadamlarni bajaring."
fi

# ─── 6. SSL sertifikat olish ──────────────────────────────────────────────
echo "[6/7] SSL sertifikat olinmoqda ($DOMAIN)..."
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  # Certbot standalone rejimida ishlaydi (Docker ishlamagan payt)
  certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@clary.uz \
    -d "$DOMAIN"
  echo "  SSL sertifikat muvaffaqiyatli olindi!"
else
  echo "  SSL sertifikat allaqachon mavjud, o'tkazib yuborildi."
fi

# SSL sertifikatni avtomatik yangilash (cron)
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker compose -f $APP_DIR/docker-compose.yml restart nginx") | crontab -

# ─── 7. Frontend build va Docker ishga tushirish ─────────────────────────
echo "[7/7] Docker containers ishga tushirilmoqda..."
if [ -d "$APP_DIR" ] && [ -f "$APP_DIR/docker-compose.yml" ]; then
  cd "$APP_DIR"

  # .env mavjudligini tekshirish
  if [ ! -f ".env" ]; then
    echo ""
    echo "  ❌ .env fayli topilmadi!"
    echo "  .env.example dan nusxa oling va to'ldiring:"
    echo "     cp .env.example .env && nano .env"
    exit 1
  fi

  # Frontend build (agar dist yo'q bo'lsa)
  if [ ! -d "apps/clinic-app/dist" ]; then
    echo "  Frontend build qilinmoqda..."
    cd apps/clinic-app && npm ci && npm run build && cd ../..
  fi

  # Docker containers (production: HTTPS)
  docker compose down --remove-orphans 2>/dev/null || true
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

  echo ""
  echo "============================================"
  echo "  ✅ Deploy muvaffaqiyatli!"
  echo "  🌐 https://$DOMAIN"
  echo "  📊 docker compose logs -f"
  echo "============================================"
else
  echo ""
  echo "============================================"
  echo "  ✅ Server tayyorlandi!"
  echo ""
  echo "  Keyingi qadamlar:"
  echo "  1. Loyihani serverga ko'chiring:"
  echo "       scp -r . user@server_ip:$APP_DIR"
  echo "  2. .env faylini yarating:"
  echo "       cp $APP_DIR/.env.example $APP_DIR/.env"
  echo "       nano $APP_DIR/.env"
  echo "  3. Deploy qiling:"
  echo "       cd $APP_DIR && docker compose up -d --build"
  echo "============================================"
fi

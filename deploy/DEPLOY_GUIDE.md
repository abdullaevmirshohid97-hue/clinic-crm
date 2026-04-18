# 🚀 Clary CRM - Production Deployment Guide

## Talablar
- Ubuntu 20.04+ VPS (minimum 2GB RAM)
- Domain: `app.clary.uz` (DNS A record serverga yo'naltirilgan)
- Docker va Docker Compose o'rnatilgan

---

## 1-qadam: Serverni tayyorlash

```bash
# SSH orqali serverga kiring
ssh root@your-server-ip

# Tizimni yangilang
apt update && apt upgrade -y

# Docker o'rnating
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose

# Git o'rnating
apt install -y git
```

---

## 2-qadam: Loyihani klonlash

```bash
# Loyihani yuklab oling
cd /var/www
git clone https://github.com/your-repo/clary-crm.git clary
cd clary
```

---

## 3-qadam: Environment sozlash

```bash
# .env faylini yarating
cp .env.example .env
nano .env
```

`.env` faylida quyidagilarni to'ldiring:
```
NODE_ENV=production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secret-jwt-key
```

---

## 4-qadam: SSL sertifikati olish (Let's Encrypt)

```bash
# Certbot o'rnating
apt install -y certbot

# SSL sertifikati oling
certbot certonly --standalone -d app.clary.uz --email admin@clary.uz --agree-tos --non-interactive

# Avtomatik yangilanish
echo "0 0 1 * * certbot renew --quiet" | crontab -
```

---

## 5-qadam: Frontend build

```bash
cd /var/www/clary/apps/clinic-app
npm install
npm run build
```

---

## 6-qadam: Docker bilan ishga tushirish

```bash
cd /var/www/clary/deploy
docker-compose -f docker-compose.prod.yml up -d
```

---

## 7-qadam: Nginx sozlash

```bash
# Nginx config nusxalash
cp /var/www/clary/deploy/nginx.conf /etc/nginx/sites-available/clary
ln -s /etc/nginx/sites-available/clary /etc/nginx/sites-enabled/

# Sintaksis tekshirish
nginx -t

# Nginx qayta yuklash
systemctl reload nginx
```

---

## Tekshirish

```bash
# Backend ishlayaptimi?
curl http://localhost:3000/health

# HTTPS ishlayaptimi?
curl https://app.clary.uz
```

---

## Foydali buyruqlar

```bash
# Loglarni ko'rish
docker-compose -f docker-compose.prod.yml logs -f

# Qayta ishga tushirish
docker-compose -f docker-compose.prod.yml restart

# To'xtatish
docker-compose -f docker-compose.prod.yml down
```

---

## Xavfsizlik tekshiruvi

Saytingizni SSL Labs'da tekshiring:
https://www.ssllabs.com/ssltest/analyze.html?d=app.clary.uz

A+ reyting olish kerak!

---

## Muammolar

### 502 Bad Gateway
```bash
# Backend ishlayaptimi tekshiring
docker ps
docker logs clary-backend
```

### SSL xatosi
```bash
# Sertifikat muddati
certbot certificates

# Yangilash
certbot renew --force-renewal
```

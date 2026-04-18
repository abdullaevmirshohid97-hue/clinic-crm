#!/bin/bash
# ============================================
# SSL Setup Script for Clary CRM
# Run this on your VPS server
# ============================================

set -e

DOMAIN="app.clary.uz"
EMAIL="admin@clary.uz"  # Change to your email

echo "🔐 Setting up SSL for $DOMAIN"

# 1. Install Certbot
echo "📦 Installing Certbot..."
apt-get update
apt-get install -y certbot python3-certbot-nginx

# 2. Get SSL certificate
echo "🔑 Getting SSL certificate from Let's Encrypt..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

# 3. Setup auto-renewal
echo "⏰ Setting up auto-renewal..."
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# 4. Test renewal
echo "🧪 Testing renewal..."
certbot renew --dry-run

echo ""
echo "✅ SSL Setup Complete!"
echo ""
echo "Your site is now available at: https://$DOMAIN"
echo ""
echo "Certificate will auto-renew every 90 days."

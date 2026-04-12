# Production Deployment Guide (Subdomain + SSL)

Follow these steps to deploy the Clinic CRM to a production server (Ubuntu/Debian recommended).

## 1. Domain & DNS Setup
- Create an `A` record for your subdomain (e.g., `app.yourclinic.uz`) pointing to your server's public IP address.

## 2. Server Preparation
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install nginx docker.io docker-compose certbot python3-certbot-nginx -y
```

## 3. SSL Certificate (Let's Encrypt)
Run this after DNS has propagated:
```bash
sudo certbot --nginx -d app.yourclinic.uz
```

## 4. Nginx Configuration
Update `/etc/nginx/sites-available/clinic` with the content from `nginx/nginx.conf` (already provided in the project), adjusting the `server_name` and SSL paths.

## 5. Deploy via Docker
1. Clone the repository to the server.
2. Create a `.env` file based on `.env.example`.
3. Start the containers:
```bash
docker-compose up -d --build
```

## 6. Continuous Monitoring
Check container status:
```bash
docker ps
docker-compose logs -f
```

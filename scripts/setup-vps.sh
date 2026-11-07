#!/usr/bin/env bash
set -e

# ==============================================================================
# Script cài đặt & triển khai Saigon Golf 3D Club lên VPS Ubuntu / Debian
# Tên miền: golfhub.cloud
# ==============================================================================

DOMAIN="golfhub.cloud"
APP_DIR="/var/www/golf3d"
REPO_URL="https://github.com/dungphan72/golf3d.git"

echo "=== 1. Cập nhật hệ điều hành & cài đặt gói phụ trợ ==="
sudo apt-get update -y
sudo apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential

echo "=== 2. Cài đặt Node.js 22 LTS và pnpm ==="
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

sudo npm install -g pnpm pm2

echo "=== 3. Tải hoặc cập nhật mã nguồn dự án ==="
if [ ! -d "$APP_DIR" ]; then
  sudo mkdir -p /var/www
  sudo git clone "$REPO_URL" "$APP_DIR"
  sudo chown -R $USER:$USER "$APP_DIR"
else
  cd "$APP_DIR"
  git pull origin main
fi

cd "$APP_DIR"

echo "=== 4. Cài đặt dependencies và build dự án ==="
pnpm install
pnpm build

echo "=== 5. Áp dụng Database Migrations cho cơ sở dữ liệu VPS ==="
MIGRATION_FILES=(
  "drizzle/0000_amazing_dreadnoughts.sql"
  "drizzle/0001_overconfident_sphinx.sql"
  "drizzle/0002_loving_machine_man.sql"
  "drizzle/0003_minor_lady_deathstrike.sql"
  "drizzle/0004_sturdy_ultimo.sql"
  "drizzle/0005_warm_starfox.sql"
  "drizzle/0006_crazy_spot.sql"
  "drizzle/0007_cuddly_black_widow.sql"
  "drizzle/0008_bright_silverclaw.sql"
  "drizzle/0009_salty_red_ghost.sql"
  "drizzle/0010_bouncy_nightshade.sql"
  "drizzle/0011_curved_blue_marvel.sql"
  "drizzle/0012_low_absorbing_man.sql"
  "drizzle/0013_spooky_morg.sql"
  "drizzle/0014_cold_human_cannonball.sql"
  "drizzle/0015_clammy_shaman.sql"
  "drizzle/0016_calm_the_hunter.sql"
  "drizzle/0017_bouncy_night_nurse.sql"
  "drizzle/0018_sticky_yellow_claw.sql"
  "drizzle/0019_chilly_iron_man.sql"
)

for sql in "${MIGRATION_FILES[@]}"; do
  if [ -f "$sql" ]; then
    echo "Running migration: $sql"
    pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file "$sql" || true
  fi
done

echo "=== 6. Cấu hình Nginx Reverse Proxy cho $DOMAIN ==="
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

sudo ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/$DOMAIN"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "=== 7. Khởi động ứng dụng với PM2 ==="
pm2 delete golf3d 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME || true

echo "=== 8. Cấu hình tường lửa UFW ==="
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable || true

echo "=== 9. Kích hoạt chứng chỉ SSL Let's Encrypt (HTTPS) ==="
echo "Kiểm tra DNS của $DOMAIN trước khi cấp SSL..."
if host "$DOMAIN" > /dev/null 2>&1; then
  sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m dungphan72@gmail.com --redirect || {
    echo "⚠️ Certbot chưa hoàn tất (có thể do DNS chưa trỏ xong). Anh có thể chạy lại: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
  }
else
  echo "⚠️ Tên miền $DOMAIN chưa trỏ IP về VPS. Vui lòng trỏ bản ghi A về IP máy chủ này trước khi chạy certbot."
fi

echo "=============================================================================="
echo "🎉 TRIỂN KHAI HOÀN TẤT!"
echo "Ứng dụng đang chạy nền qua PM2 trên cổng 8787 và được Nginx định tuyến."
echo "Truy cập: http://$DOMAIN hoặc https://$DOMAIN"
echo "Kiểm tra log: pm2 logs golf3d"
echo "Khởi động lại: pm2 restart golf3d"
echo "=============================================================================="

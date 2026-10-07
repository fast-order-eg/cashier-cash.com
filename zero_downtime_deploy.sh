#!/bin/bash
set -e

echo "🚀 Starting Zero-Downtime Deployment for Casher System..."

# Configuration
REPO_TOKEN="${1:-$(cat /home/cashier-cash.com/deploy/.github_token 2>/dev/null)}"
if [ -z "$REPO_TOKEN" ]; then
    echo "❌ Error: GitHub Token is missing! Please provide it as an argument or save in /home/cashier-cash.com/deploy/.github_token"
    exit 1
fi
REPO_URL="https://x-access-token:${REPO_TOKEN}@github.com/fast-order-eg/cashier-cash.com.git"
BASE_DIR="/home/cashier-cash.com/deploy"
RELEASES_DIR="$BASE_DIR/releases"
SHARED_DIR="$BASE_DIR/shared"
CURRENT_DIR="$BASE_DIR/current"
RELEASE_NAME=$(date +"%Y%m%d%H%M%S")
RELEASE_DIR="$RELEASES_DIR/$RELEASE_NAME"

echo "📂 Creating new release directory: $RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

echo "📥 Cloning repository..."
git clone --depth 1 "$REPO_URL" "$RELEASE_DIR"

echo "🔗 Linking shared files..."
# Link .env
if [ -f "$SHARED_DIR/.env" ]; then
    ln -nfs "$SHARED_DIR/.env" "$RELEASE_DIR/.env"
else
    echo "⚠️ WARNING: .env not found in shared directory. Copying from repository."
    cp "$RELEASE_DIR/.env.example" "$SHARED_DIR/.env"
    ln -nfs "$SHARED_DIR/.env" "$RELEASE_DIR/.env"
fi

# Link storage
rm -rf "$RELEASE_DIR/storage"
ln -nfs "$SHARED_DIR/storage" "$RELEASE_DIR/storage"

# Ensure standard PATHs for node, npm, composer, and php
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games:~/.nvm/versions/node/$(ls ~/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:/root/.nvm/versions/node/$(ls /root/.nvm/versions/node 2>/dev/null | tail -n 1)/bin

echo "📦 Installing Composer dependencies..."
cd "$RELEASE_DIR"
export COMPOSER_ALLOW_SUPERUSER=1
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

echo "✨ Building Frontend Assets..."
if command -v npm &> /dev/null; then
    npm install --no-audit --no-fund
    npm run build
else
    echo "⚠️ npm command not found in PATH, skipping frontend build step."
fi

echo "🗄️ Running database migrations..."
php artisan migrate --force

echo "🔗 Linking public storage..."
php artisan storage:link || true

echo "🧹 Clearing old caches and compiling fresh config/routes/views..."
php artisan optimize:clear
php artisan cache:clear || true
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "🔄 Swapping symlink for Zero-Downtime..."
ln -nfs "$RELEASE_DIR" "$CURRENT_DIR"

if [ ! -L "/home/cashier-cash.com/public_html" ]; then
    rm -rf /home/cashier-cash.com/public_html
    ln -s "$CURRENT_DIR" /home/cashier-cash.com/public_html
fi

echo "🔄 Restarting Queue Workers and PHP processes..."
php artisan queue:restart || true
# Restart OpenLiteSpeed detached PHP processes
killall -9 lsphp 2>/dev/null || true

echo "🔐 Fixing file permissions..."
chmod -R 775 "$RELEASE_DIR/storage" "$RELEASE_DIR/bootstrap/cache" || true
SITE_USER=$(stat -c '%U' /home/cashier-cash.com 2>/dev/null || echo "cashi3212")
chown -R "$SITE_USER:$SITE_USER" "$RELEASE_DIR" "$SHARED_DIR" 2>/dev/null || true

echo "🧹 Cleaning up old releases (keeping last 3)..."
cd "$RELEASES_DIR"
ls -1t | tail -n +4 | xargs -r rm -rf || true

echo "🎉 Zero-Downtime Deployment completed successfully!"

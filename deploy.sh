#!/bin/bash
set -e

SERVER_IP="194.238.40.236"
SERVER_USER="root"

echo "🚀 Starting deployment to https://tandamen.kz ($SERVER_IP)..."

# Target: frontend, backend, or all
TARGET=${1:-all}

if [ "$TARGET" = "backend" ] || [ "$TARGET" = "all" ]; then
  echo "📦 Building Backend BootJar..."
  (cd backend && ./gradlew bootJar --no-daemon -x test)
  echo "⬆️ Uploading Backend JAR to VPS..."
  scp backend/build/libs/tanda-backend-1.0.0.jar "${SERVER_USER}@${SERVER_IP}:/opt/tanda/tanda-backend.jar"
  echo "🔄 Restarting Backend service..."
  ssh "${SERVER_USER}@${SERVER_IP}" "systemctl restart tanda-backend"
fi

if [ "$TARGET" = "frontend" ] || [ "$TARGET" = "all" ]; then
  echo "📦 Building Frontend SPA..."
  (cd frontend && npm run build)
  echo "⬆️ Uploading Frontend to VPS..."
  tar -czf /tmp/frontend-dist.tar.gz -C frontend/dist .
  scp /tmp/frontend-dist.tar.gz "${SERVER_USER}@${SERVER_IP}:/tmp/frontend-dist.tar.gz"
  ssh "${SERVER_USER}@${SERVER_IP}" "rm -rf /var/www/tanda/* && tar -xzf /tmp/frontend-dist.tar.gz -C /var/www/tanda && chown -R ubuntu:ubuntu /var/www/tanda && rm /tmp/frontend-dist.tar.gz && systemctl reload nginx"
fi

echo "✅ Deployment completed successfully! Live at https://tandamen.kz"

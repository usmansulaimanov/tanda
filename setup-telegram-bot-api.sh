#!/bin/bash
# ==============================================================================
# Tanda — Setup Local Telegram Bot API Server (Support files up to 2000 MB / 2 GB)
# ==============================================================================
set -e

echo "🚀 Setting up Local Telegram Bot API Server on port 8081..."

# Default or prompt for API_ID and API_HASH from my.telegram.org
TELEGRAM_API_ID=${1:-""}
TELEGRAM_API_HASH=${2:-""}

if [ -z "$TELEGRAM_API_ID" ] || [ -z "$TELEGRAM_API_HASH" ]; then
    echo "⚠️  Назар аударыңыз: Telegram API ID және API HASH кілттері қажет."
    echo "Оны алу үшін: https://my.telegram.org сайтына кіріп, 'API development tools' бөлімінен алыңыз."
    echo "Қолданылуы: ./setup-telegram-bot-api.sh <API_ID> <API_HASH>"
    exit 1
fi

# Ensure storage directory exists
STORAGE_DIR="/var/lib/telegram-bot-api"
mkdir -p "$STORAGE_DIR"
chmod 777 "$STORAGE_DIR"

# Stop existing container if running
docker rm -f tanda-telegram-bot-api 2>/dev/null || true

# Run official Telegram Bot API server in Docker
echo "🐳 Starting aiogram/telegram-bot-api container..."
docker run -d \
  --name tanda-telegram-bot-api \
  --restart always \
  -p 8081:8081 \
  -v "$STORAGE_DIR:$STORAGE_DIR" \
  -e TELEGRAM_API_ID="$TELEGRAM_API_ID" \
  -e TELEGRAM_API_HASH="$TELEGRAM_API_HASH" \
  -e TELEGRAM_LOCAL=true \
  -e TELEGRAM_STAT=true \
  aiogram/telegram-bot-api:latest \
  --local --http-port 8081 --dir "$STORAGE_DIR"

# Setup automatic cache cleanup (delete temp files older than 2 days every day at 04:00 AM)
echo "🧹 Setting up daily cache auto-cleanup cron job..."
CRON_JOB="0 4 * * * find $STORAGE_DIR -type f -mtime +2 -delete >/dev/null 2>&1"
(crontab -l 2>/dev/null | grep -v "$STORAGE_DIR"; echo "$CRON_JOB") | crontab -

echo "✅ Local Telegram Bot API successfully running on http://localhost:8081"
echo "🎉 20 MB шектеуі алынып тасталды! 2000 MB (2 GB)-қа дейінгі үлкен файлдар ойнай береді."

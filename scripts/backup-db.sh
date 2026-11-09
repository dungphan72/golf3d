#!/bin/bash
# Saigon Golf 3D Club - Automated Nightly Database Backup Script
# Usage: ./scripts/backup-db.sh

set -e

APP_DIR="/var/www/app-golf3d"
BACKUP_DIR="/var/backups/golf3d"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/golf3d_backup_${TIMESTAMP}.tar.gz"
LOG_FILE="/var/log/golf3d-backup.log"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting automated database backup..." >> "$LOG_FILE"

cd "$APP_DIR"

# Backup .wrangler sqlite database and data files
if [ -d ".wrangler" ]; then
  tar -czf "$BACKUP_FILE" .wrangler
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created successfully: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))" >> "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Warning: .wrangler directory not found!" >> "$LOG_FILE"
fi

# Retention policy: Delete backups older than 30 days
find "$BACKUP_DIR" -type f -name "golf3d_backup_*.tar.gz" -mtime +30 -exec rm -f {} \;
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup retention check complete (30 days)." >> "$LOG_FILE"

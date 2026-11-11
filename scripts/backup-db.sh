#!/bin/bash
# Saigon Golf 3D Club - Automated nightly database backup
# Usage: ./scripts/backup-db.sh
# Optional: BACKUP_PASSPHRASE_FILE=/root/.golf3d-backup-pass  -> backup is encrypted (AES-256, openssl)
set -euo pipefail
umask 077 # backups hold customer data: owner-only files

APP_DIR="${APP_DIR:-/var/www/app-golf3d}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/golf3d}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/golf3d_backup_${TIMESTAMP}.tar.gz"
LOG_FILE="${LOG_FILE:-/var/log/golf3d-backup.log}"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"; }

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
touch "$LOG_FILE"; chmod 600 "$LOG_FILE"

log "Starting automated database backup..."
cd "$APP_DIR"

if [ ! -d ".wrangler" ]; then
  log "ERROR: .wrangler directory not found, nothing backed up"
  exit 1
fi

tar -czf "$BACKUP_FILE" .wrangler
tar -tzf "$BACKUP_FILE" > /dev/null # fails (set -e) if the archive is unreadable

if [ -n "${BACKUP_PASSPHRASE_FILE:-}" ]; then
  openssl enc -aes-256-cbc -pbkdf2 -salt -in "$BACKUP_FILE" -out "${BACKUP_FILE}.enc" -pass "file:${BACKUP_PASSPHRASE_FILE}"
  rm -f "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE}.enc"
fi
sha256sum "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"
log "Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Retention: delete backups older than 30 days
find "$BACKUP_DIR" -type f \( -name "golf3d_backup_*" \) -mtime +30 -delete
log "Retention check complete (30 days)."

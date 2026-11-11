#!/bin/bash
# Rehearse a restore WITHOUT touching production: unpack a backup into a temp dir and check the database files.
# Usage: ./scripts/restore-check.sh /var/backups/golf3d/golf3d_backup_XXXX.tar.gz[.enc]
# For encrypted backups set BACKUP_PASSPHRASE_FILE.
set -euo pipefail
umask 077
FILE="${1:?backup file required}"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
[ -f "${FILE}.sha256" ] && (cd "$(dirname "$FILE")" && sha256sum -c "$(basename "$FILE").sha256")
if [[ "$FILE" == *.enc ]]; then
  openssl enc -d -aes-256-cbc -pbkdf2 -in "$FILE" -out "$WORK/b.tar.gz" -pass "file:${BACKUP_PASSPHRASE_FILE:?set BACKUP_PASSPHRASE_FILE}"
  tar -xzf "$WORK/b.tar.gz" -C "$WORK"
else
  tar -xzf "$FILE" -C "$WORK"
fi
COUNT=0
while IFS= read -r db; do
  COUNT=$((COUNT+1))
  if command -v sqlite3 >/dev/null; then
    echo "$db: $(sqlite3 "$db" 'PRAGMA integrity_check;' | head -1)"
  else
    echo "$db: present (install sqlite3 for integrity_check)"
  fi
done < <(find "$WORK" -name '*.sqlite' -type f)
[ "$COUNT" -gt 0 ] && echo "OK: $COUNT database file(s) restored to a temp dir" || { echo "FAIL: no .sqlite files in backup"; exit 1; }

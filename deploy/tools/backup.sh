#!/usr/bin/env bash
# InvestPlatform MySQL 备份:mysqldump(单事务) → gzip,保留 7 天。
set -euo pipefail
BACKUP_DIR=/home/tinci/InvestPlatform/deploy/backups
PASS=$(cat /home/tinci/.investplatform-mysql-root)
TS=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/capitalos-$TS.sql.gz"
docker exec investplatform-mysql mysqldump -uroot -p"$PASS" --single-transaction --routines --events capitalos 2>/dev/null | gzip > "$OUT"
find "$BACKUP_DIR" -name 'capitalos-*.sql.gz' -mtime +7 -delete 2>/dev/null || true
echo "$(date -Iseconds) backup ok: $OUT ($(du -h "$OUT" | cut -f1))"

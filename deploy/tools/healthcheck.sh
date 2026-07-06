#!/usr/bin/env bash
# 巡检:后端/前端不健康(含挂死返回非 200)则重启对应 systemd 服务。只记异常。
LOG=/home/tinci/InvestPlatform/deploy/healthcheck.log
check() {  # $1=url $2=service
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 6 "$1" 2>/dev/null || echo 000)
  if [ "$code" != "200" ]; then
    echo "$(date -Iseconds) $2 unhealthy ($code) -> restart" >> "$LOG"
    systemctl --user restart "$2"
  fi
}
check http://127.0.0.1:7997/health investplatform-backend
check http://127.0.0.1:8089/ investplatform-frontend

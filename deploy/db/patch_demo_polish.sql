-- 演示数据打磨:修正不真实的种子值(观感)。幂等。
-- 运行:docker exec -i investplatform-mysql mysql --default-character-set=utf8mb4 -uroot -p$PASS capitalos < db/patch_demo_polish.sql

-- Growth Fund I 净资产原为 123456 元(12.3万,与 20 亿规模严重不符)→ 对齐其 2026Q2 财报净资产 16.8 亿。
UPDATE cap_funds SET net_asset_value = 1680000000 WHERE fund_name = 'Growth Fund I' AND net_asset_value < 1000000;

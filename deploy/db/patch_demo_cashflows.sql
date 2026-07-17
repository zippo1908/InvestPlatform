-- issue #30(用户反馈 #25):投资人详情的投资汇总/现金流需要缴款+分配流水支撑,
-- 原种子只有 1 条 investor_call。按已有认缴对(fund,investor)补演示流水,金额与实缴口径自洽。
INSERT INTO cap_cashflows
  (fund_id, investor_id, cashflow_code, cashflow_kind, direction, amount, currency, occurred_on, settlement_status, description)
VALUES
  -- 投资人1 × 基金1:两笔缴款(合计=实缴 4.2亿)+ 两笔分配
  (1, 1, 'CF-DEMO-I1-CALL1', 'investor_call',         'inflow',  200000000, 'CNY', '2022-05-10', 'reconciled', '首期缴款'),
  (1, 1, 'CF-DEMO-I1-CALL2', 'investor_call',         'inflow',  220000000, 'CNY', '2023-03-15', 'reconciled', '二期缴款'),
  (1, 1, 'CF-DEMO-I1-DIST1', 'investor_distribution', 'outflow',  80000000, 'CNY', '2025-11-20', 'settled',    '分配本金'),
  (1, 1, 'CF-DEMO-I1-DIST2', 'investor_distribution', 'outflow',  40000000, 'CNY', '2026-03-10', 'settled',    '分配本金'),
  -- 投资人2 × 基金1:两笔缴款(合计=实缴 3.1亿)+ 一笔分配
  (1, 2, 'CF-DEMO-I2-CALL1', 'investor_call',         'inflow',  150000000, 'CNY', '2022-06-01', 'reconciled', '首期缴款'),
  (1, 2, 'CF-DEMO-I2-CALL2', 'investor_call',         'inflow',  160000000, 'CNY', '2023-04-20', 'reconciled', '二期缴款'),
  (1, 2, 'CF-DEMO-I2-DIST1', 'investor_distribution', 'outflow',  60000000, 'CNY', '2026-01-15', 'settled',    '分配本金'),
  -- 投资人3 × 基金2:一笔缴款(=实缴 0.9亿)+ 一笔分配
  (2, 3, 'CF-DEMO-I3-CALL1', 'investor_call',         'inflow',   90000000, 'CNY', '2024-01-10', 'reconciled', '首期缴款'),
  (2, 3, 'CF-DEMO-I3-DIST1', 'investor_distribution', 'outflow',  15000000, 'CNY', '2026-02-28', 'settled',    '分配本金');

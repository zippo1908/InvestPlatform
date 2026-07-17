-- issue #32(用户反馈 #27):新增投资记录弹框补齐参考系统字段——
-- 基金持有项目估值(原币/币种/人民币)、历史投资方、暂存(草稿)标记。
ALTER TABLE cap_equity_changes
  ADD COLUMN valuation_original DECIMAL(20,4) NULL AFTER post_money_ratio,
  ADD COLUMN valuation_currency VARCHAR(16) NULL DEFAULT '万人民币' AFTER valuation_original,
  ADD COLUMN valuation_cny DECIMAL(20,4) NULL AFTER valuation_currency,
  ADD COLUMN historical_investors TEXT NULL AFTER co_investors,
  ADD COLUMN is_draft TINYINT(1) NOT NULL DEFAULT 0 AFTER historical_investors;

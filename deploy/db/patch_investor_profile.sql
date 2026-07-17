-- issue #30/#31(用户反馈 #25/#26):投资人档案补齐参考系统字段
-- 全称(legal_name)与分类(investor_category,如「境内法人机构(公司等)」)。
ALTER TABLE cap_investors
  ADD COLUMN legal_name VARCHAR(200) NULL AFTER investor_name,
  ADD COLUMN investor_category VARCHAR(64) NULL AFTER investor_kind;

UPDATE cap_investors SET legal_name = investor_name WHERE legal_name IS NULL;

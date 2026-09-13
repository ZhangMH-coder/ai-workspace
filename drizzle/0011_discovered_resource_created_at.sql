-- S1.49: 资源新增统计（扫描变更提示）
-- discovered_resource 增加 created_at：首次被扫描索引的时间。
-- 存量行保持 NULL（不属于任何一次"本次新增"），新插入行由扫描写入。
ALTER TABLE discovered_resource ADD COLUMN created_at text;

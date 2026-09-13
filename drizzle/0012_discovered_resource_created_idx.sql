-- S1.49: created_at 索引（配合 0011 新增列，单语句约束拆分）
CREATE INDEX idx_discovered_created ON discovered_resource (created_at);

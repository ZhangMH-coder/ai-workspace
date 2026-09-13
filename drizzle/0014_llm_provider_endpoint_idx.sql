-- S1.53: 端点默认标记索引
CREATE INDEX IF NOT EXISTS "idx_endpoint_default" ON "llm_provider_endpoint" ("is_default");

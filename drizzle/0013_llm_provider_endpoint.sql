-- S1.53: LLM Provider 端点表（多端点 + 加密 Key 存储）
CREATE TABLE IF NOT EXISTS "llm_provider_endpoint" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "base_url" text NOT NULL,
  "model" text,
  "api_key_enc" text,
  "is_default" integer DEFAULT false NOT NULL,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL
);

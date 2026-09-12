CREATE TABLE `llm_provider_config` (
	`id` text PRIMARY KEY NOT NULL,
	`base_url` text,
	`model` text,
	`api_key` text,
	`updated_at` text NOT NULL
);

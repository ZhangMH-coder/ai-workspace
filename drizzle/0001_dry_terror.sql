ALTER TABLE `agent_run` ADD `model` text;--> statement-breakpoint
ALTER TABLE `agent_run` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `agent_run` ADD `input_tokens` integer;--> statement-breakpoint
ALTER TABLE `agent_run` ADD `output_tokens` integer;--> statement-breakpoint
ALTER TABLE `agent_run` ADD `error_code` text;--> statement-breakpoint
ALTER TABLE `agent_run` ADD `error_message` text;--> statement-breakpoint
-- P5-2 数据迁移：存量 success → succeeded（Run 状态机五态语义；幂等）
UPDATE `agent_run` SET `status` = 'succeeded' WHERE `status` = 'success';

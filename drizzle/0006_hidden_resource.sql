CREATE TABLE `user_hidden_resource` (
	`id` text PRIMARY KEY NOT NULL,
	`source_path` text NOT NULL,
	`hidden_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_hidden_source_path` ON `user_hidden_resource` (`source_path`);

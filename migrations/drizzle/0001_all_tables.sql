CREATE TABLE IF NOT EXISTS `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text,
	`default_project_key` text,
	`allowed_tools` text,
	`token_name` text NOT NULL,
	`token_prefix` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text,
	`expires_at` text,
	`revoked_at` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `jira_workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_name` text NOT NULL,
	`jira_base_url` text NOT NULL,
	`jira_username` text NOT NULL,
	`jira_api_token_ciphertext` text NOT NULL,
	`jira_api_token_iv` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_used_at` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`created_at` text NOT NULL
);

// Re-export better-auth generated schema
export {
  auth_users,
  auth_sessions,
  auth_accounts,
  auth_verifications,
  auth_usersRelations,
  auth_sessionsRelations,
  auth_accountsRelations,
} from "../runtimes/worker/auth/schema.generated";

import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: text("created_at").notNull(),
});

export const apiTokensTable = sqliteTable("api_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: text("workspace_id"),
  defaultProjectKey: text("default_project_key"),
  allowedTools: text("allowed_tools"),
  tokenName: text("token_name").notNull(),
  tokenPrefix: text("token_prefix").notNull(),
  tokenHash: text("token_hash").notNull(),
  createdAt: text("created_at").notNull(),
  lastUsedAt: text("last_used_at"),
  expiresAt: text("expires_at"),
  revokedAt: text("revoked_at"),
});

export const jiraWorkspacesTable = sqliteTable("jira_workspaces", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceName: text("workspace_name").notNull(),
  jiraBaseUrl: text("jira_base_url").notNull(),
  jiraUsername: text("jira_username").notNull(),
  jiraApiTokenCiphertext: text("jira_api_token_ciphertext").notNull(),
  jiraApiTokenIv: text("jira_api_token_iv").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  lastUsedAt: text("last_used_at"),
});

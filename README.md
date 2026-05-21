# Jira + Confluence MCP Server

[![CodeQL Advanced](https://github.com/Creax-AI/jira-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/Creax-AI/jira-mcp/actions/workflows/codeql.yml)

A Model Context Protocol (MCP) server that integrates Jira and Confluence, allowing LLMs to interact with both Atlassian products through a single API. Built for Cloudflare Workers + Durable Objects.

## Features

**Jira:**

- Fetch issues, epics, sprints, boards, projects
- Search issues with arbitrary JQL
- Create issues, epics, sprints
- Add/remove labels, comments, transitions
- Link issues (blocks, duplicates, relates)
- Assign issues, search users
- Per-token tool allowlisting

**Confluence:**

- Search pages by title, space, or CQL
- Read page content with body (storage format)
- Navigate page hierarchy (ancestors, children)
- Create and update pages (accepts `spaceKey` or `spaceId`)
- Delete/trash pages
- Map Jira project keys to Confluence spaces
- Link Confluence pages to Jira issues

## Setup

### Prerequisites

- [Bun](https://bun.sh) 1.x
- An Atlassian Cloud account with Jira + Confluence access
- An [Atlassian API token](https://id.atlassian.com/manage-profile/security/api-tokens)

### Installation

```bash
git clone https://github.com/Creax-AI/jira-mcp.git
cd jira-mcp
bun install
```

### Running Locally (Worker + Auth UI)

1. Create a local dev file:

```bash
cat > .dev.vars <<'EOF'
MCP_INTERNAL_SIGNING_SECRET=change-me-with-32-plus-characters
EOF
```

2. Start the worker and auth UI:

```bash
bun run dev
```

This starts:

- Worker on `http://localhost:8787`
- Auth UI on `http://localhost:5173`

3. Open `http://localhost:5173/auth` to register and create a token.

## Deploy

```bash
bun run deploy:worker:with-ui
```

Preview deploy:

```bash
bun run deploy:worker:preview:with-ui
```

Set secrets before deploying:

```bash
bunx wrangler secret put MCP_INTERNAL_SIGNING_SECRET
```

## Usage

### Authentication

1. Open the auth UI at `/auth`
2. Register with email + password
3. Create a workspace (Atlassian base URL, email, API token)
4. Generate an `mcp_...` token (optionally restrict to specific tools)

### MCP Client Configuration

Use the `mcp_...` token as a Bearer token:

```json
{
  "mcpServers": {
    "jira-confluence": {
      "url": "https://your-worker.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer mcp_..."
      }
    }
  }
}
```

## Available Tools

### Jira - Issues

| Tool                          | Description                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `get_issue`                   | Get detailed information about a Jira issue                |
| `search_issues`               | Search issues with raw JQL (supports ORDER BY, pagination) |
| `get_assigned_issues`         | Get issues assigned to the current user                    |
| `get_pending_assigned_issues` | Get non-done issues assigned to the current user           |
| `get_issues_by_type`          | Get issues of a specific type (Bug, Story, Epic, etc.)     |
| `add_comment`                 | Add a comment to an issue                                  |
| `add_issue_labels`            | Add labels to an issue                                     |
| `remove_issue_labels`         | Remove labels from an issue                                |
| `transition_issue`            | Move issue to a different status                           |
| `get_issue_transitions`       | List available workflow transitions                        |
| `update_issue_description`    | Replace an issue's description                             |
| `assign_issue`                | Assign issue to a workspace member                         |
| `link_issues`                 | Link two issues (blocks, duplicates, relates)              |
| `get_link_types`              | List available issue link types                            |
| `search_users`                | Search workspace users                                     |

### Jira - Epics

| Tool                       | Description                                 |
| -------------------------- | ------------------------------------------- |
| `get_epics`                | Get epics from a project                    |
| `get_epic_children`        | Get child issues of an epic                 |
| `create_epic`              | Create a new epic                           |
| `create_issue_with_parent` | Create an issue linked to a parent epic     |
| `set_parent_issue`         | Link an issue to a parent (epic or subtask) |

### Jira - Sprints & Boards

| Tool                        | Description                             |
| --------------------------- | --------------------------------------- |
| `get_projects`              | List available Jira projects            |
| `get_issue_types`           | List available issue types              |
| `get_board_issues`          | Get all issues from a board             |
| `get_board_sprints`         | Get sprints from a board                |
| `get_board_details`         | Get board configuration and metadata    |
| `get_board_backlog`         | Get backlog issues                      |
| `get_project_sprints`       | Get sprints for all boards in a project |
| `get_sprint`                | Get sprint details                      |
| `get_project_sprint`        | Validate sprint belongs to a project    |
| `get_sprint_issues`         | Get issues in a sprint                  |
| `create_sprint`             | Create a new sprint                     |
| `start_sprint`              | Start a sprint (set to active)          |
| `complete_sprint`           | Complete a sprint (set to closed)       |
| `add_issues_to_sprint`      | Add issues to a sprint                  |
| `remove_issues_from_sprint` | Move issues back to backlog             |
| `move_issues_to_board`      | Rank issues on a board                  |

### Confluence - Discovery

| Tool                                   | Description                                      |
| -------------------------------------- | ------------------------------------------------ |
| `get_confluence_spaces`                | List Confluence spaces by key or type            |
| `map_jira_project_to_confluence_space` | Match a Jira project key to its Confluence space |
| `search_confluence_pages`              | Search pages by title, space, or status          |
| `search_confluence_pages_cql`          | Advanced search with Confluence CQL              |
| `get_confluence_page`                  | Get page details with body content               |
| `get_confluence_page_ancestors`        | Get page hierarchy                               |
| `get_confluence_page_children`         | Get direct child pages                           |
| `find_confluence_pages_for_issue`      | Find pages mentioning a Jira issue key           |

### Confluence - Content Management

| Tool                                 | Description                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `create_confluence_page`             | Create a new page (by `spaceId` or `spaceKey`)                              |
| `update_confluence_page`             | Update an existing page                                                     |
| `delete_confluence_page`             | Move a page to trash                                                        |
| `link_confluence_page_to_jira_issue` | Generate a Confluence URL for pasting into Jira                             |
| `link_confluence_page_to_issue`      | Link a Confluence page to a Jira issue (appears in Linked work items panel) |

## Tool Annotations

Destructive tools (`delete_*`, `remove_*`, `complete_*`) are annotated with `destructiveHint: true`. Read-only tools (`get_*`, `search_*`, `find_*`, `map_*`) are annotated with `readOnlyHint: true`. This helps LLMs understand which operations modify state.

## Permissions

Tokens can be restricted to a subset of tools via `allowedTools`. Confluence tools and Jira tools share the same auth model -- workspace credentials are reused for both products.

## Development

```bash
# Type-check
bun run type-check

# Lint
bun run lint

# Build
bun run build

# Dev (worker + auth UI)
bun run dev
```

### Project Structure

```
src/
  services/
    jira.ts            -- Jira REST API service
    confluence.ts      -- Confluence Cloud v2 API service
  types/
    jira.ts            -- Jira type definitions
    confluence.ts      -- Confluence type definitions
  server.ts            -- MCP server with tool registration
  index.ts             -- CLI entry point
  cli.ts               -- CLI mode
  runtimes/
    worker/
      entry.ts         -- Cloudflare Worker entry point
      session-do.ts    -- Durable Object session handler
      auth/            -- Better Auth integration with D1

auth-ui/               -- React/Vite auth console
docs/                  -- Architecture and integration docs
```

## License

MIT

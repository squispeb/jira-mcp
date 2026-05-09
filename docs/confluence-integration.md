# Confluence Integration Plan

## Goal
Add Confluence support to the MCP server so users can search, read, create, update, and link Confluence pages alongside Jira workflows.

## Why
Jira issues often reference docs, decisions, and runbooks that live in Confluence. Keeping page lookup and linking inside the MCP server reduces context switching and makes Jira+Confluence workflows usable from a single agent.

## Current State
- The server is Jira-only today.
- Authentication already stores a Jira workspace with Atlassian email/API token credentials.
- The worker already proxies authenticated requests into the MCP session.
- Tool access is filtered per token via `allowedTools`.

## Integration Strategy
Use the same Atlassian workspace credentials for both products.

### Base assumptions
- Jira and Confluence usually share the same Atlassian Cloud account/email + API token pair.
- Jira uses `/rest/api/3/...`.
- Confluence Cloud v2 uses `/wiki/api/v2/...`.
- Confluence tools should be registered in the same MCP server, but separated logically from Jira tools.

## Recommended Architecture

### 1. Add a Confluence service
Create `src/services/confluence.ts` mirroring the Jira service pattern.

Responsibilities:
- Wrap Confluence REST calls.
- Provide a typed request helper with Basic auth.
- Expose methods for page search, read, create, update, ancestors, and children.

### 2. Add Confluence types
Create `src/types/confluence.ts` for page, search, and body types.

### 3. Register Confluence tools in `src/server.ts`
Add tool definitions alongside Jira tools and keep them behind the existing `allowedTools` filter.

### 4. Reuse workspace auth
Keep a single workspace credential model unless a separate Confluence login is required later.

## Proposed First Tool Set
Start with these tools:

### Search / discovery
- `search_confluence_pages`
- `get_confluence_page`
- `get_confluence_page_ancestors`
- `get_confluence_page_children`

### Content management
- `create_confluence_page`
- `update_confluence_page`

### Jira linkage helpers
- `link_confluence_page_to_jira_issue`
- `find_confluence_pages_for_issue`

## Suggested API Endpoints
Based on Confluence Cloud v2:

- `GET /wiki/api/v2/pages`
- `GET /wiki/api/v2/pages/{id}`
- `POST /wiki/api/v2/pages`
- `PUT /wiki/api/v2/pages/{id}`
- `GET /wiki/api/v2/pages/{id}/ancestors`
- `GET /wiki/api/v2/pages/{id}/direct-children`
- `GET /wiki/api/v2/custom-content`

## Tool Design Notes

### Search
Search should return:
- page id
- title
- space id
- current status
- web UI link

### Read page
Should support:
- page metadata
- body in storage or view format
- labels/properties if needed later

### Create / update page
Should support:
- title
- body content
- optional parent page
- space id

### Linking
Prefer lightweight linking first:
- return a page URL users can paste into Jira
- optionally add page metadata or properties later

## Auth / Permissions

### Current model
- One workspace = one Atlassian credential set.
- `allowedTools` determines which MCP tools a token can call.

### Confluence impact
- No new auth system needed initially.
- Confluence tools should use the same workspace credentials and be independently gated by `allowedTools`.

### Future option
If product-specific credentials are needed later, introduce:
- `workspaceType` or `productType`
- separate Jira/Confluence credential fields

## Data Model Considerations

### Likely no schema change required for phase 1
If Jira and Confluence share the same Atlassian login, we can keep the current workspace schema.

### If we need product-specific config later
Potential future fields:
- `confluenceBaseUrl`
- `confluenceSiteId`
- `productType`

## Worker / Session Flow
No major changes required for the session pipeline.

Current flow already supports:
- auth token validation
- workspace credential lookup
- MCP session routing
- tool allowlisting

The only server change is adding Confluence tool registrations and a service class.

## Implementation Phases

### Phase 1
- Add `ConfluenceService`
- Add Confluence types
- Register search/read tools
- Add page ancestor/children tools

### Phase 2
- Add create/update page tools
- Add Jira linking helpers
- Add UI test page or docs page for Confluence operations

### Phase 3
- Add page properties/custom content support
- Add richer Jira-to-Confluence linking workflows
- Consider product-specific workspace credentials if needed

## Acceptance Criteria
- The MCP server can search and read Confluence pages.
- The MCP server can create and update pages.
- The same token-based tool permissions apply to Confluence tools.
- Jira functionality remains unchanged.

## Open Questions
- Should the first version support only Confluence Cloud v2?
- Do we need page creation/editing in the first release, or only read/search/linking?
- Should page linking be a dedicated tool or just a returned Confluence URL?

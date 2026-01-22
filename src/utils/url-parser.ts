/**
 * Extracts a Jira issue key from a URL
 * Example URLs:
 * - https://your-domain.atlassian.net/browse/PROJECT-123
 * - https://your-domain.atlassian.net/jira/software/projects/PROJECT/issues/PROJECT-123
 *
 * @param url The Jira issue URL
 * @returns The extracted issue key or null if not found
 */
export function extractIssueKeyFromUrl(url: string): string | null {
  // First, try the standard pattern for browse URLs
  const browseRegex = /\/browse\/([A-Z0-9]+-[0-9]+)/;
  const browseMatch = url.match(browseRegex);
  if (browseMatch && browseMatch[1]) {
    return browseMatch[1];
  }

  // Try the pattern for the new Jira interface
  const issuesRegex = /\/issues\/([A-Z0-9]+-[0-9]+)/;
  const issuesMatch = url.match(issuesRegex);
  if (issuesMatch && issuesMatch[1]) {
    return issuesMatch[1];
  }

  // If nothing matches, try to find any pattern that looks like a Jira key
  const generalRegex = /([A-Z0-9]+-[0-9]+)/;
  const generalMatch = url.match(generalRegex);
  if (generalMatch && generalMatch[1]) {
    return generalMatch[1];
  }

  return null;
}

/**
 * Extracts a project key from a Jira URL
 * Example URLs:
 * - https://your-domain.atlassian.net/browse/PROJECT-123
 * - https://your-domain.atlassian.net/jira/software/projects/PROJECT/issues
 *
 * @param url The Jira URL
 * @returns The extracted project key or null if not found
 */
export function extractProjectKeyFromUrl(url: string): string | null {
  // Try to match project from the projects URL path
  const projectsRegex = /\/projects\/([A-Z0-9]+)/;
  const projectsMatch = url.match(projectsRegex);
  if (projectsMatch && projectsMatch[1]) {
    return projectsMatch[1];
  }

  // Try to extract from an issue key if present
  const issueKey = extractIssueKeyFromUrl(url);
  if (issueKey) {
    const parts = issueKey.split("-");
    if (parts.length > 0) {
      return parts[0];
    }
  }

  return null;
}

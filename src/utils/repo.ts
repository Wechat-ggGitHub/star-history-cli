const GITHUB_URL_PATTERN = /github\.com\/([^/]+\/[^/\s]+)/;
const REPO_PATTERN = /^([^/\s]+\/[^/\s]+)$/;

export function parseRepo(input: string): string | null {
  const trimmed = input.trim();

  // Full GitHub URL: https://github.com/owner/repo
  const urlMatch = trimmed.match(GITHUB_URL_PATTERN);
  if (urlMatch) {
    return urlMatch[1].replace(/\.git$/, "");
  }

  // owner/repo format
  if (REPO_PATTERN.test(trimmed)) {
    return trimmed;
  }

  // Single word - can't resolve without API, return null
  return null;
}

export function parseRepos(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseRepo(s))
    .filter((s): s is string => s !== null);
}

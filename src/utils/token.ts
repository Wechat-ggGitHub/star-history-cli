export function getToken(cliToken?: string): string | undefined {
  if (cliToken) return cliToken;
  return process.env.GITHUB_TOKEN || undefined;
}

export function createAuthHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.star+json",
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }
  return headers;
}

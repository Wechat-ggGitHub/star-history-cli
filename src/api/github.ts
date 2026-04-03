import { createAuthHeaders, getToken } from "../utils/token.js";
import type { StarRecord, RepoData } from "../types.js";

const API_BASE = "https://api.github.com";
const API_PER_PAGE = 100;
const MAX_REQUEST_AMOUNT = 15;

class GitHubAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "GitHubAPIError";
  }
}

async function fetchGitHub(
  path: string,
  token?: string,
): Promise<{ data: any; headers: Record<string, string> }> {
  const headers: Record<string, string> = {
    ...createAuthHeaders(token),
  };
  // Override Accept for non-stargazers endpoints
  if (!path.includes("/stargazers")) {
    headers.Accept = "application/vnd.github.v3+json";
  }

  const res = await fetch(`${API_BASE}${path}`, { headers });
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 404) {
      throw new GitHubAPIError(`Repository not found: ${path}`, 404);
    }
    if (res.status === 403) {
      throw new GitHubAPIError(
        "GitHub API rate limit exceeded. Set GITHUB_TOKEN environment variable or use --token option.",
        403,
      );
    }
    if (res.status === 401) {
      throw new GitHubAPIError("Invalid GitHub token.", 401);
    }
    throw new GitHubAPIError(
      data.message || `GitHub API error: ${res.status}`,
      res.status,
    );
  }

  const rawHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    rawHeaders[k] = v;
  });
  return { data, headers: rawHeaders };
}

function parsePageCount(linkHeader: string | undefined): number {
  if (!linkHeader) return 1;
  const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
  return lastMatch ? parseInt(lastMatch[1], 10) : 1;
}

export async function getRepoStarRecords(
  owner: string,
  repo: string,
  token?: string,
): Promise<StarRecord[]> {
  const effectiveToken = getToken(token);

  // First request to get total page count
  const { headers } = await fetchGitHub(
    `/repos/${owner}/${repo}/stargazers?per_page=${API_PER_PAGE}&page=1`,
    effectiveToken,
  );
  const pageCount = parsePageCount(headers.link);

  // Determine which pages to fetch
  const pagesToFetch: number[] = [];
  if (pageCount <= MAX_REQUEST_AMOUNT) {
    for (let i = 1; i <= pageCount; i++) pagesToFetch.push(i);
  } else {
    // Uniform sampling
    const interval = Math.floor(pageCount / MAX_REQUEST_AMOUNT);
    for (let i = 0; i < MAX_REQUEST_AMOUNT; i++) {
      pagesToFetch.push(1 + i * interval);
    }
  }

  // Fetch sampled pages
  const allRecords: StarRecord[] = [];
  for (const page of pagesToFetch) {
    const { data } = await fetchGitHub(
      `/repos/${owner}/${repo}/stargazers?per_page=${API_PER_PAGE}&page=${page}`,
      effectiveToken,
    );

    if (!Array.isArray(data) || data.length === 0) continue;

    if (pageCount <= MAX_REQUEST_AMOUNT) {
      // Full data - add all records
      for (const item of data) {
        allRecords.push({
          date: item.starred_at,
          count: 0, // will be computed
        });
      }
    } else {
      // Sampled - use first record of each page as representative point
      allRecords.push({
        date: data[0].starred_at,
        count: API_PER_PAGE * (page - 1),
      });
    }
  }

  // If we got full data, compute cumulative counts
  if (pageCount <= MAX_REQUEST_AMOUNT) {
    const lastPage = await fetchGitHub(
      `/repos/${owner}/${repo}/stargazers?per_page=${API_PER_PAGE}&page=${pageCount}`,
      effectiveToken,
    );
    const totalFromRecords = (pageCount - 1) * API_PER_PAGE + (lastPage.data as any[]).length;

    let cumCount = 0;
    for (const record of allRecords) {
      cumCount++;
      record.count = cumCount;
    }

    // Add current total as latest point
    const repoInfo = await fetchGitHub(
      `/repos/${owner}/${repo}`,
      effectiveToken,
    );
    const totalStars = repoInfo.data.stargazers_count as number;
    if (totalStars > cumCount) {
      allRecords.push({
        date: new Date().toISOString(),
        count: totalStars,
      });
    }
  } else {
    // For sampled data, get current total and add as last point
    const repoInfo = await fetchGitHub(
      `/repos/${owner}/${repo}`,
      effectiveToken,
    );
    const totalStars = repoInfo.data.stargazers_count as number;
    allRecords.push({
      date: new Date().toISOString(),
      count: totalStars,
    });
  }

  return allRecords;
}

export async function getRepoStargazersCount(
  owner: string,
  repo: string,
  token?: string,
): Promise<number> {
  const effectiveToken = getToken(token);
  const { data } = await fetchGitHub(`/repos/${owner}/${repo}`, effectiveToken);
  return data.stargazers_count as number;
}

export async function getRepoLogoUrl(
  owner: string,
  token?: string,
): Promise<string | undefined> {
  const effectiveToken = getToken(token);
  try {
    const { data } = await fetchGitHub(`/users/${owner}`, effectiveToken);
    return data.avatar_url;
  } catch {
    return undefined;
  }
}

export async function getRepoData(
  repoFull: string,
  token?: string,
): Promise<RepoData> {
  const [owner, repo] = repoFull.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repository format: ${repoFull}. Expected "owner/repo".`);
  }

  const [starRecords, totalStars, logoUrl] = await Promise.all([
    getRepoStarRecords(owner, repo, token),
    getRepoStargazersCount(owner, repo, token),
    getRepoLogoUrl(owner, token),
  ]);

  return {
    repo: repoFull,
    starRecords,
    totalStars,
    logoUrl,
  };
}

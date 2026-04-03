import type { RepoData } from "../types.js";

export function exportJson(repoDataList: RepoData[]): string {
  const data = repoDataList.map((repoData) => ({
    repo: repoData.repo,
    totalStars: repoData.totalStars,
    starRecords: repoData.starRecords.map((r) => ({
      date: r.date,
      count: r.count,
    })),
  }));

  return JSON.stringify(data, null, 2);
}

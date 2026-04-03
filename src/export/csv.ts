import type { RepoData } from "../types.js";

export function exportCsv(repoDataList: RepoData[]): string {
  const lines: string[] = ["repo,date,count"];

  for (const repoData of repoDataList) {
    for (const record of repoData.starRecords) {
      lines.push(`${repoData.repo},${record.date},${record.count}`);
    }
  }

  return lines.join("\n");
}

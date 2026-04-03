export interface StarRecord {
  date: string;
  count: number;
}

export interface RepoData {
  repo: string;
  starRecords: StarRecord[];
  logoUrl?: string;
  totalStars: number;
}

export interface ChartPoint {
  x: Date;
  y: number;
}

export interface ChartSeries {
  repo: string;
  color: string;
  data: ChartPoint[];
  logoUrl?: string;
}

export interface ChartConfig {
  width: number;
  height: number;
  style: "xkcd" | "clean";
  theme: "light" | "dark";
  type: "Date" | "Timeline";
  legendPosition: "top-left" | "bottom-right";
}

export interface CLIOptions {
  style: "xkcd" | "clean";
  type: "Date" | "Timeline";
  format: "png" | "svg";
  theme: "light" | "dark";
  width: string;
  output?: string;
  export?: "csv" | "json";
  token?: string;
}

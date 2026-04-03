#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { writeFileSync } from "fs";
import { resolve, basename } from "path";
import { getRepoData } from "../src/api/github.js";
import { parseRepo, parseRepos } from "../src/utils/repo.js";
import { getToken } from "../src/utils/token.js";
import { renderChart, convertToChartData } from "../src/chart/renderer.js";
import { exportSvg } from "../src/export/svg.js";
import { exportPng } from "../src/export/png.js";
import { exportCsv } from "../src/export/csv.js";
import { exportJson } from "../src/export/json.js";
import type { CLIOptions } from "../src/types.js";

const program = new Command();

program
  .name("star-history")
  .description("Generate star history trend charts for GitHub open-source projects")
  .version("1.0.0")
  .argument("<repos>", "GitHub repositories (comma-separated, e.g. facebook/react,vuejs/vue)")
  .option("-s, --style <type>", "Chart style: xkcd | clean", "xkcd")
  .option("-t, --type <type>", "Chart mode: Date | Timeline", "Date")
  .option("-f, --format <type>", "Output format: png | svg", "png")
  .option("--theme <type>", "Theme: light | dark", "light")
  .option("--width <px>", "Image width in pixels", "800")
  .option("-o, --output <file>", "Output file path")
  .option("--export <type>", "Data export: csv | json")
  .option("--token <token>", "GitHub personal access token")
  .action(async (reposInput: string, options: CLIOptions) => {
    // Validate options
    if (!["xkcd", "clean"].includes(options.style)) {
      console.error(chalk.red(`Invalid style: ${options.style}. Use "xkcd" or "clean".`));
      process.exit(1);
    }
    if (!["Date", "Timeline"].includes(options.type)) {
      console.error(chalk.red(`Invalid type: ${options.type}. Use "Date" or "Timeline".`));
      process.exit(1);
    }
    if (!["png", "svg"].includes(options.format)) {
      console.error(chalk.red(`Invalid format: ${options.format}. Use "png" or "svg".`));
      process.exit(1);
    }
    if (!["light", "dark"].includes(options.theme)) {
      console.error(chalk.red(`Invalid theme: ${options.theme}. Use "light" or "dark".`));
      process.exit(1);
    }

    // Parse repo names
    const repoNames = parseRepos(reposInput);
    if (repoNames.length === 0) {
      console.error(chalk.red("No valid repositories found. Use format: owner/repo"));
      process.exit(1);
    }

    const token = getToken(options.token);
    const width = parseInt(options.width, 10);
    if (isNaN(width) || width < 300) {
      console.error(chalk.red("Width must be a number >= 300."));
      process.exit(1);
    }

    // Fetch data
    const spinner = ora("Fetching star data...").start();
    let repoDataList;

    try {
      repoDataList = await Promise.all(
        repoNames.map((repo) => getRepoData(repo, token)),
      );
      spinner.succeed("Star data fetched successfully");
    } catch (err: any) {
      spinner.fail("Failed to fetch star data");
      console.error(chalk.red(err.message));
      process.exit(1);
    }

    // Data export
    if (options.export) {
      const ext = options.export;
      let content: string;
      if (ext === "csv") {
        content = exportCsv(repoDataList);
      } else {
        content = exportJson(repoDataList);
      }

      const defaultName = repoNames.length === 1
        ? `${repoNames[0].replace("/", "_")}_stars.${ext}`
        : `star-history.${ext}`;
      const outputPath = options.output || defaultName;
      const fullPath = resolve(outputPath);

      writeFileSync(fullPath, content, "utf-8");
      console.log(chalk.green(`Data exported to ${fullPath}`));
      return;
    }

    // Generate chart
    const chartSpinner = ora("Generating chart...").start();
    try {
      const seriesList = convertToChartData(repoDataList, options.type);
      const svgString = renderChart(seriesList, {
        width,
        height: Math.round(width / (2 / 3)),
        style: options.style,
        theme: options.theme,
        type: options.type,
        legendPosition: repoNames.length > 1 ? "top-left" : "top-left",
      });

      const optimizedSvg = await exportSvg(svgString);

      // Determine output path
      const ext = options.format;
      const defaultName = repoNames.length === 1
        ? `${repoNames[0].replace("/", "_")}_stars.${ext}`
        : `star-history.${ext}`;
      const outputPath = options.output || defaultName;
      const fullPath = resolve(outputPath);

      if (ext === "svg") {
        writeFileSync(fullPath, optimizedSvg, "utf-8");
      } else {
        const pngBuffer = await exportPng(optimizedSvg, width);
        writeFileSync(fullPath, pngBuffer);
      }

      chartSpinner.succeed(`Chart saved to ${chalk.cyan(fullPath)}`);
    } catch (err: any) {
      chartSpinner.fail("Failed to generate chart");
      console.error(chalk.red(err.message));
      process.exit(1);
    }
  });

program.parse();

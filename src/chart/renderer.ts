import { JSDOM } from "jsdom";
import { select } from "d3-selection";
import { scaleTime, scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import { axisBottom, axisLeft } from "d3-axis";
import type { ChartSeries, ChartConfig } from "../types.js";
import { THEME } from "./colors.js";
import { addXkcdFilter, addXkcdFont } from "./xkcd.js";
import { addCleanFont } from "./clean.js";
import { drawWatermark } from "./watermark.js";

const MARGIN = { top: 55, right: 30, bottom: 50, left: 70 };
const MIN_CHART_WIDTH = 600;
const ASPECT_RATIO = 2 / 3; // width / height

export function renderChart(
  seriesList: ChartSeries[],
  config: ChartConfig,
): string {
  const width = Math.max(MIN_CHART_WIDTH, config.width);
  const height = Math.round(width / ASPECT_RATIO);
  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const themeColors = THEME[config.theme];

  // Create JSDOM
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body></body></html>`,
  );
  const document = dom.window.document;

  // Create SVG
  const svg = select(document.body)
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height);

  // Background
  svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", themeColors.background);

  // Style setup
  if (config.style === "xkcd") {
    addXkcdFilter(svg);
    addXkcdFont(svg);
  } else {
    addCleanFont(svg);
  }

  const filterAttr = config.style === "xkcd" ? "url(#xkcdify)" : "none";

  // Collect all data points for scale computation
  const allPoints = seriesList.flatMap((s) => s.data);
  if (allPoints.length === 0) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", themeColors.text)
      .text("No data available");
    return dom.window.document.body.innerHTML;
  }

  // Compute scales
  const xExtent = [
    new Date(Math.min(...allPoints.map((p) => p.x.getTime()))),
    new Date(Math.max(...allPoints.map((p) => p.x.getTime()))),
  ];
  const yMax = Math.max(...allPoints.map((p) => p.y));

  const xScale = scaleTime().domain(xExtent).range([0, innerWidth]);
  const yScale = scaleLinear()
    .domain([0, yMax * 1.05])
    .range([innerHeight, 0]);

  // Chart group
  const chartGroup = svg
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  // Grid lines (clean style only)
  if (config.style === "clean") {
    const yTicks = yScale.ticks(5);
    yTicks.forEach((tick) => {
      chartGroup
        .append("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", yScale(tick))
        .attr("y2", yScale(tick))
        .attr("stroke", themeColors.gridLine)
        .attr("stroke-width", 0.5);
    });
  }

  // X Axis
  const xAxis = axisBottom(xScale)
    .ticks(6)
    .tickSize(-innerHeight)
    .tickFormat((d: Date) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

  chartGroup
    .append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .attr("filter", filterAttr)
    .call(xAxis)
    .call((g) => {
      g.select(".domain").attr("stroke", themeColors.stroke);
      g.selectAll(".tick line").attr("stroke", themeColors.stroke).attr("opacity", 0.3);
      g.selectAll(".tick text").attr("fill", themeColors.text).attr("font-size", "11px");
    });

  // Y Axis
  const yAxis = axisLeft(yScale)
    .ticks(5)
    .tickSize(-innerWidth)
    .tickFormat((d: number) => {
      if (d >= 1000) return `${(d / 1000).toFixed(d >= 10000 ? 0 : 1)}k`;
      return String(d);
    });

  chartGroup
    .append("g")
    .attr("filter", filterAttr)
    .call(yAxis)
    .call((g) => {
      g.select(".domain").attr("stroke", themeColors.stroke);
      g.selectAll(".tick line").attr("stroke", themeColors.stroke).attr("opacity", 0.3);
      g.selectAll(".tick text").attr("fill", themeColors.text).attr("font-size", "11px");
    });

  // Draw series (lines)
  const lineGenerator = line<typeof seriesList[0]["data"][0]>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y))
    .curve(curveMonotoneX);

  for (const series of seriesList) {
    const g = chartGroup.append("g").attr("filter", filterAttr);

    // Line
    g.append("path")
      .datum(series.data)
      .attr("fill", "none")
      .attr("stroke", series.color)
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", lineGenerator);

    // Dots (only for clean style or small datasets)
    if (config.style === "clean" && series.data.length < 50) {
      g.selectAll("circle")
        .data(series.data)
        .join("circle")
        .attr("cx", (d) => xScale(d.x))
        .attr("cy", (d) => yScale(d.y))
        .attr("r", 2.5)
        .attr("fill", series.color);
    }
  }

  // Title
  svg
    .append("text")
    .attr("x", MARGIN.left)
    .attr("y", 25)
    .attr("font-size", "18px")
    .attr("font-weight", "bold")
    .attr("fill", themeColors.text)
    .attr("filter", filterAttr)
    .text("Star History");

  // Legend
  if (seriesList.length > 0) {
    const legendX = config.legendPosition === "top-left" ? MARGIN.left : width - MARGIN.right - 150;
    const legendY = config.legendPosition === "top-left" ? 35 : height - MARGIN.bottom - seriesList.length * 20 - 10;

    const legendGroup = svg
      .append("g")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    // Legend background
    legendGroup
      .append("rect")
      .attr("x", -10)
      .attr("y", -5)
      .attr("width", 160)
      .attr("height", seriesList.length * 20 + 10)
      .attr("rx", 4)
      .attr("fill", themeColors.background)
      .attr("fill-opacity", 0.85)
      .attr("stroke", themeColors.stroke)
      .attr("stroke-width", 0.5)
      .attr("filter", filterAttr);

    seriesList.forEach((series, i) => {
      const item = legendGroup
        .append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      item
        .append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 8)
        .attr("y2", 8)
        .attr("stroke", series.color)
        .attr("stroke-width", 2.5)
        .attr("filter", filterAttr);

      item
        .append("text")
        .attr("x", 28)
        .attr("y", 12)
        .attr("font-size", "12px")
        .attr("fill", themeColors.text)
        .text(series.repo);
    });
  }

  // Watermark
  drawWatermark(svg, width, height, config.theme);

  return dom.window.document.body.innerHTML;
}

export function convertToChartData(
  repoData: { repo: string; starRecords: { date: string; count: number }[] }[],
  chartType: "Date" | "Timeline",
): ChartSeries[] {
  const colors = THEME.light.colors;

  return repoData.map((repo, i) => {
    const color = colors[i % colors.length];
    const sortedRecords = [...repo.starRecords].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const data = sortedRecords.map((r) => {
      const date = new Date(r.date);
      if (chartType === "Timeline") {
        // Align all repos to start from the same relative point
        const startDate = new Date(sortedRecords[0].date);
        return {
          x: new Date(date.getTime() - startDate.getTime() + new Date("2020-01-01").getTime()),
          y: r.count,
        };
      }
      return { x: date, y: r.count };
    });

    // Insert zero point before the first record
    if (data.length > 0) {
      const firstDate = new Date(data[0].x.getTime());
      firstDate.setDate(firstDate.getDate() - 1);
      data.unshift({ x: firstDate, y: 0 });
    }

    return { repo: repo.repo, color, data };
  });
}

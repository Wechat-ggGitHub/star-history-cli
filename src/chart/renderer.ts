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

// Match star-history.com proportions: wider than tall
const MARGIN = { top: 75, right: 30, bottom: 45, left: 60 };
const MIN_CHART_WIDTH = 600;
const ASPECT_RATIO = 16 / 9; // width / height

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
  const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
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
    .domain([0, yMax * 1.08])
    .nice()
    .range([innerHeight, 0]);

  // Chart group
  const chartGroup = svg
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  // Grid lines
  if (config.style === "clean") {
    const yTicks = yScale.ticks(6);
    yTicks.forEach((tick) => {
      chartGroup
        .append("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", yScale(tick))
        .attr("y2", yScale(tick))
        .attr("stroke", themeColors.gridLine)
        .attr("stroke-width", 0.6)
        .attr("stroke-dasharray", "3,3");
    });
  }

  // X Axis - only show year labels
  const xAxis = axisBottom(xScale)
    .ticks(6)
    .tickSize(0)
    .tickPadding(8)
    .tickFormat((d: Date) => {
      const year = d.getFullYear();
      return String(year);
    });

  chartGroup
    .append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .attr("filter", filterAttr)
    .call(xAxis)
    .call((g) => {
      g.select(".domain").attr("stroke", themeColors.stroke).attr("stroke-width", 1.5);
      g.selectAll(".tick text")
        .attr("fill", themeColors.text)
        .attr("font-size", "12px")
        .attr("font-weight", "500");
    });

  // Y Axis
  const yAxis = axisLeft(yScale)
    .ticks(6)
    .tickSize(0)
    .tickPadding(8)
    .tickFormat((d: number) => {
      if (d >= 1000) return `${(d / 1000).toFixed(d >= 10000 ? 0 : 1)}k`;
      return String(d);
    });

  chartGroup
    .append("g")
    .attr("filter", filterAttr)
    .call(yAxis)
    .call((g) => {
      g.select(".domain").attr("stroke", themeColors.stroke).attr("stroke-width", 1.5);
      g.selectAll(".tick text")
        .attr("fill", themeColors.text)
        .attr("font-size", "12px")
        .attr("font-weight", "500");
    });

  // Draw series lines with area fill
  const lineGenerator = line<typeof seriesList[0]["data"][0]>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y))
    .curve(curveMonotoneX);

  for (const series of seriesList) {
    const g = chartGroup.append("g");

    // Area fill (subtle gradient)
    const areaPath = `M${series.data.map((d) => `${xScale(d.x)},${yScale(d.y)}`).join("L")}L${xScale(series.data[series.data.length - 1].x)},${innerHeight}L${xScale(series.data[0].x)},${innerHeight}Z`;
    g.append("path")
      .attr("d", areaPath)
      .attr("fill", series.color)
      .attr("fill-opacity", 0.08);

    // Line
    g.append("path")
      .datum(series.data)
      .attr("fill", "none")
      .attr("stroke", series.color)
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("filter", filterAttr)
      .attr("d", lineGenerator);

    // Endpoint dot
    if (series.data.length > 0) {
      const lastPoint = series.data[series.data.length - 1];
      g.append("circle")
        .attr("cx", xScale(lastPoint.x))
        .attr("cy", yScale(lastPoint.y))
        .attr("r", 3.5)
        .attr("fill", series.color)
        .attr("stroke", themeColors.background)
        .attr("stroke-width", 1.5)
        .attr("filter", filterAttr);
    }
  }

  // Title
  const titleText =
    seriesList.length === 1
      ? `Star History CLI - ${seriesList[0].repo}`
      : "Star History CLI";
  svg
    .append("text")
    .attr("x", MARGIN.left)
    .attr("y", 28)
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .attr("fill", themeColors.text)
    .attr("filter", filterAttr)
    .text(titleText);

  // Legend - positioned inside chart area, top-left
  if (seriesList.length > 0) {
    const legendPadding = 10;
    const legendLineHeight = 24;
    const legendWidth = Math.max(...seriesList.map((s) => s.repo.length * 7.5 + 45));
    const legendHeight = seriesList.length * legendLineHeight + legendPadding * 2;

    // Place legend inside the chart area at top-left
    const legendX = MARGIN.left + 8;
    const legendY = MARGIN.top + 8;

    const legendGroup = svg
      .append("g")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    // Legend background
    legendGroup
      .append("rect")
      .attr("x", -legendPadding)
      .attr("y", -legendPadding)
      .attr("width", legendWidth + legendPadding)
      .attr("height", legendHeight)
      .attr("rx", 6)
      .attr("fill", themeColors.background)
      .attr("fill-opacity", 0.92)
      .attr("stroke", themeColors.stroke)
      .attr("stroke-width", config.style === "xkcd" ? 1.2 : 0.5)
      .attr("filter", filterAttr);

    seriesList.forEach((series, i) => {
      const item = legendGroup
        .append("g")
        .attr("transform", `translate(0, ${i * legendLineHeight})`);

      // Colored line segment with dot
      item
        .append("line")
        .attr("x1", 0)
        .attr("x2", 16)
        .attr("y1", 7)
        .attr("y2", 7)
        .attr("stroke", series.color)
        .attr("stroke-width", 2.5)
        .attr("stroke-linecap", "round");

      item
        .append("circle")
        .attr("cx", 8)
        .attr("cy", 7)
        .attr("r", 2.5)
        .attr("fill", series.color);

      // Repo name
      item
        .append("text")
        .attr("x", 24)
        .attr("y", 11)
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
        const startDate = new Date(sortedRecords[0].date);
        return {
          x: new Date(
            date.getTime() -
              startDate.getTime() +
              new Date("2020-01-01").getTime(),
          ),
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

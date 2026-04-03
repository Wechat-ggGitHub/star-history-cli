import type * as d3 from "d3-selection";

export function addCleanFont(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
): void {
  const defs = svg.select("defs");
  defs
    .append("style")
    .text(
      `text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }`,
    );
}

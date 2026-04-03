import type * as d3 from "d3-selection";

export function addXkcdFilter(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>): void {
  const defs = svg.append("defs");

  const filter = defs.append("filter").attr("id", "xkcdify");
  filter
    .append("feTurbulence")
    .attr("type", "fractalNoise")
    .attr("baseFrequency", "0.05")
    .attr("result", "noise");
  filter
    .append("feDisplacementMap")
    .attr("scale", "5")
    .attr("xChannelSelector", "R")
    .attr("yChannelSelector", "G")
    .attr("in", "SourceGraphic")
    .attr("in2", "noise");
}

export function addXkcdFont(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
): void {
  // Use a system font stack that looks hand-drawn-ish
  // For a real xkcd font, you'd embed the .ttf base64 here
  const defs = svg.select("defs");
  defs
    .append("style")
    .text(
      `text { font-family: "Comic Sans MS", "Comic Sans", cursive, sans-serif; }`,
    );
}

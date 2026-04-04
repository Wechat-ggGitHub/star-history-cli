import { optimize } from "svgo";

export async function exportSvg(svgString: string): Promise<string> {
  const result = optimize(svgString, {
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            // Keep viewBox for proper scaling
            removeViewBox: false,
          },
        },
      },
      "removeDoctype",
      "removeComments",
      "cleanupAttrs",
      "minifyStyles",
      "removeUselessDefs",
      "cleanupNumericValues",
      "convertColors",
      "removeUnknownsAndDefaults",
      "removeNonInheritableGroupAttrs",
      "removeUselessStrokeAndFill",
      "removeHiddenElems",
      "removeEmptyAttrs",
      "removeEmptyContainers",
      "removeUnusedNS",
      "sortAttrs",
    ],
  });
  return result.data;
}

import sharp from "sharp";

export async function exportPng(svgString: string, width: number): Promise<Buffer> {
  // Ensure width is a number
  const w = typeof width === "number" ? width : parseInt(String(width), 10);

  return sharp(Buffer.from(svgString))
    .resize(w)
    .png()
    .toBuffer();
}

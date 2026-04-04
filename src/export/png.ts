import sharp from "sharp";

const SCALE_FACTOR = 2;

export async function exportPng(svgString: string, width: number): Promise<Buffer> {
  const w = typeof width === "number" ? width : parseInt(String(width), 10);

  // Render SVG at 2x resolution for crisp output
  // viewBox is preserved so sharp scales vector content properly
  return sharp(Buffer.from(svgString))
    .resize(w * SCALE_FACTOR)
    .png({ compressionLevel: 6 })
    .toBuffer();
}

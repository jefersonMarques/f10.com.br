import { qrcodegen } from "./qrcodegen";

export function renderPixQrCode(code: string): string {
  const qrCode = qrcodegen.QrCode.encodeText(code, qrcodegen.QrCode.Ecc.MEDIUM);
  const size = qrCode.size + 8;
  const modules: string[] = [];

  for (let row = 0; row < qrCode.size; row += 1) {
    for (let column = 0; column < qrCode.size; column += 1) {
      if (!qrCode.getModule(column, row)) continue;
      modules.push(`M${column + 4} ${row + 4}h1v1h-1z`);
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"`,
    ' role="img" aria-label="QR Code PIX" shape-rendering="crispEdges">',
    `<rect width="${size}" height="${size}" fill="#fff"/>`,
    `<path fill="#161F37" d="${modules.join(" ")}"/>`,
    "</svg>",
  ].join("");
}

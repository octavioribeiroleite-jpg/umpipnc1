import type jsPDF from 'jspdf';

/** Keep the transparent, green brand legible without stretching it. */
export function drawPdfBrandLogo(doc: jsPDF, image: string, x: number, y: number, size: number) {
  const { width, height } = doc.getImageProperties(image);
  const padding = 1;
  const innerSize = size - padding * 2;
  const scale = Math.min(innerSize / width, innerSize / height);
  const imageWidth = width * scale;
  const imageHeight = height * scale;

  doc.saveGraphicsState();
  try {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, size, size, 2, 2, 'F');
    // PNG compression is lossless, keeping the original pixels and transparency.
    doc.addImage(image, 'PNG', x + (size - imageWidth) / 2, y + (size - imageHeight) / 2, imageWidth, imageHeight, undefined, 'FAST');
  } finally {
    doc.restoreGraphicsState();
  }
}

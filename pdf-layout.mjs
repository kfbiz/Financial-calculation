// Layout helper for jsPDF tables. The returned widths always fit inside the
// printable area, leaving a symmetric safety inset on the left and right.
export function fitPdfTableColumns(widths, contentWidth, safeInset = 8) {
  if (!Array.isArray(widths) || widths.length === 0) {
    throw new TypeError('PDF table widths must be a non-empty array.');
  }
  if (!Number.isFinite(contentWidth) || contentWidth <= 0) {
    throw new RangeError('PDF content width must be a positive number.');
  }
  if (!Number.isFinite(safeInset) || safeInset < 0 || safeInset >= contentWidth) {
    throw new RangeError('PDF table safety inset must be non-negative and smaller than the content width.');
  }
  if (widths.some((width) => !Number.isFinite(width) || width <= 0)) {
    throw new RangeError('Each PDF table column width must be a positive number.');
  }

  const requestedWidth = widths.reduce((sum, width) => sum + width, 0);
  const maxTableWidth = contentWidth - safeInset;
  const scale = Math.min(1, maxTableWidth / requestedWidth);
  const columnWidths = widths.map((width) => width * scale);
  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const leftInset = (contentWidth - tableWidth) / 2;

  return {
    columnWidths,
    tableWidth,
    leftInset,
    rightInset: leftInset,
    scale
  };
}

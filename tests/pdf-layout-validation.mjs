import assert from 'node:assert/strict';
import { fitPdfTableColumns } from '../pdf-layout.mjs';

function checkLayout(name, requestedWidths) {
  const contentWidth = 180; // A4 portrait width 210 mm less 15 mm margins
  const safeInset = 8; // leave 4 mm on each side
  const layout = fitPdfTableColumns(requestedWidths, contentWidth, safeInset);
  const rightEdge = 15 + layout.leftInset + layout.tableWidth;
  const maxRightEdge = 195 - safeInset / 2;

  assert.ok(layout.tableWidth <= contentWidth - safeInset + 1e-9, name + ': table must fit printable width');
  assert.ok(layout.leftInset >= safeInset / 2 - 1e-9, name + ': left safety inset must be preserved');
  assert.ok(layout.rightInset >= safeInset / 2 - 1e-9, name + ': right safety inset must be preserved');
  assert.ok(rightEdge <= maxRightEdge + 1e-9, name + ': right edge must stay inside the safe page area');
  assert.equal(layout.columnWidths.length, requestedWidths.length, name + ': all columns must remain present');
  assert.ok(layout.columnWidths.every((width) => width > 0), name + ': no column may collapse');
  return layout;
}

// Historical layouts that caused the uploaded PDF to clip at the right page edge.
checkLayout('revenue streams historical width', [55, 29, 27, 34, 40]);
checkLayout('monthly amount historical width', [116, 69]);
checkLayout('three-year forecast historical width', [67, 42.5, 42.5, 43]);

// Current layout definitions are also kept inside the safe page area.
checkLayout('revenue streams current width', [52, 28, 26, 33, 41]);
checkLayout('two-column current width', [112, 68]);
checkLayout('three-year forecast current width', [60, 40, 40, 40]);

assert.throws(() => fitPdfTableColumns([], 180), /non-empty array/);
assert.throws(() => fitPdfTableColumns([20, 0], 180), /positive number/);
assert.throws(() => fitPdfTableColumns([20, 30], 0), /positive number/);
assert.throws(() => fitPdfTableColumns([20, 30], 180, 180), /safety inset/);

console.log('PASS: PDF table layout validation');

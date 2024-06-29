function plotLineLow(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  plotFunction: (x: number, y: number) => void
): void {
  let dx = x1 - x0;
  let dy = y1 - y0;
  let yi = 1;
  if (dy < 0) {
    yi = -1;
    dy = -dy;
  }
  let D = 2 * dy - dx;
  let y = y0;

  for (let x = x0; x <= x1; x++) {
    plotFunction(x, y);
    if (D > 0) {
      y += yi;
      D += 2 * (dy - dx);
    } else {
      D += 2 * dy;
    }
  }
}

function plotLineHigh(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  plotFunction: (x: number, y: number) => void
): void {
  let dx = x1 - x0;
  let dy = y1 - y0;
  let xi = 1;
  if (dx < 0) {
    xi = -1;
    dx = -dx;
  }
  let D = 2 * dx - dy;
  let x = x0;

  for (let y = y0; y <= y1; y++) {
    plotFunction(x, y);
    if (D > 0) {
      x += xi;
      D += 2 * (dx - dy);
    } else {
      D += 2 * dx;
    }
  }
}

export function bresenhamPlotLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  plotFunction: (x: number, y: number) => void
): void {
  if (Math.abs(y1 - y0) < Math.abs(x1 - x0)) {
    if (x0 > x1) {
      plotLineLow(x1, y1, x0, y0, plotFunction);
    } else {
      plotLineLow(x0, y0, x1, y1, plotFunction);
    }
  } else {
    if (y0 > y1) {
      plotLineHigh(x1, y1, x0, y0, plotFunction);
    } else {
      plotLineHigh(x0, y0, x1, y1, plotFunction);
    }
  }
}

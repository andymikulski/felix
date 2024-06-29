// Define the Rect type
export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Point = {
  x: number;
  y: number;
};

export function rectToRectIntersection(r1: Rect, r2: Rect): boolean {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
}

export function rectEnvelopesRect(r1: Rect, r2: Rect): boolean {
  return (
    r1.x <= r2.x &&
    r1.y <= r2.y &&
    r1.x + r1.width >= r2.x + r2.width &&
    r1.y + r1.height >= r2.y + r2.height
  );
}

export function inflateRect(rect: Rect, amount: number): Rect {
  // Calculate the center of the rectangle
  const centerX = rect.x + rect.width * 0.5;
  const centerY = rect.y + rect.height * 0.5;

  // Inflate/deflate the width and height
  const newWidth = rect.width + 2 * amount;
  const newHeight = rect.height + 2 * amount;

  // Calculate the new x and y such that the rectangle remains centered
  const newX = centerX - newWidth * 0.5;
  const newY = centerY - newHeight * 0.5;

  return {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  };
}

export function getCenter(rect: Rect) {
  return {
    x: rect.x + rect.width * 0.5,
    y: rect.y + rect.height * 0.5,
  };
}

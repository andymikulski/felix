import { Vector2Like } from '../springs/Vector2Spring';
import { Ray, checkRayIntersectsRect } from './Ray';
import { Rect, intersects } from './Rect';

const EPS = 1e-4;

function distance(point1: Vector2Like, point2: Vector2Like) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function inflateRect(rect: Rect, amount: number): Rect {
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

export default class QuadTree<T extends Rect> {
  private MAX_ITEMS = 8; // Adjust this as needed.
  private MAX_LEVEL = 8;

  private level: number;
  private bounds: Rect;
  private objects: T[] = [];
  private nodes: QuadTree<T>[] = [];

  constructor(level: number, bounds: Rect) {
    this.level = level;
    this.bounds = bounds;
  }

  public getAllObjects = () => {
    const output: T[] = [];

    Array.prototype.push.apply(output, this.objects);

    this.nodes.forEach((x) => {
      Array.prototype.push.apply(output, x.getAllObjects());
    });
    return output;
  };

  // Clear the quadtree.
  public clear = (): void => {
    this.objects = [];
    for (const node of this.nodes) {
      if (node) {
        node.clear();
      }
    }
    this.nodes = [];
  };

  // Split the node into 4 subnodes.
  private split = (): void => {
    if (this.level >= this.MAX_LEVEL) {
      return;
    }

    const subWidth = this.bounds.width / 2;
    const subHeight = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;

    this.nodes[0] = new QuadTree(this.level + 1, {
      x: x + subWidth,
      y: y,
      width: subWidth,
      height: subHeight,
    });
    this.nodes[1] = new QuadTree(this.level + 1, {
      x: x,
      y: y,
      width: subWidth,
      height: subHeight,
    });
    this.nodes[2] = new QuadTree(this.level + 1, {
      x: x,
      y: y + subHeight,
      width: subWidth,
      height: subHeight,
    });
    this.nodes[3] = new QuadTree(this.level + 1, {
      x: x + subWidth,
      y: y + subHeight,
      width: subWidth,
      height: subHeight,
    });

    // re-insert the objects into the split nodes
    for (const obj of this.objects) {
      for (const node of this.nodes) {
        node.insert(obj);
      }
    }

    this.objects = [];
  };

  public insert(obj: T): void {
    // If the rect doesn't belong in this quadrant of the QuadTree, return.
    if (!intersects(this.bounds, obj)) {
      return;
    }

    if (this.nodes[0]) {
      for (const node of this.nodes) {
        node.insert(obj);
      }
      return;
    }

    // If below the capacity and not subdivided yet, insert into this QuadTree node.
    this.objects.push(obj);
    if (this.objects.length >= this.MAX_ITEMS) {
      this.split();
    }
  }

  public getAt(point: Vector2Like): T[] {
    return this.query({
      x: point.x,
      y: point.y,
      width: EPS,
      height: EPS,
    });
  }

  public query(rangeRect: Rect): T[] {
    const itemsInRange: T[] = [];

    // If range doesn't overlap this Quad, return empty array.
    if (!intersects(this.bounds, rangeRect)) {
      return itemsInRange;
    }

    // Check objects in this QuadTree node.
    for (const rect of this.objects) {
      if (intersects(rect, rangeRect)) {
        itemsInRange.push(rect);
      }
    }

    // If leaf node, stop here.
    if (!this.nodes[0]) {
      return itemsInRange;
    }

    // Otherwise, traverse child nodes.
    for (const node of this.nodes) {
      itemsInRange.push(...node.query(rangeRect));
    }

    return itemsInRange;
  }

  public intersect(searchRect: Rect): boolean {
    // If the search rect doesn't overlap this Quad, return false.
    if (!intersects(this.bounds, searchRect)) {
      return false;
    }

    // Check objects in this QuadTree node.
    for (const rect of this.objects) {
      if (intersects(rect, searchRect)) {
        return true; // Found an intersecting rect, return true immediately.
      }
    }

    // If this is a leaf node, return false.
    if (!this.nodes[0]) {
      return false;
    }

    // Otherwise, check the child nodes.
    for (const node of this.nodes) {
      if (node.intersect(searchRect)) {
        return true;
      }
    }

    // If we've checked everything and found no intersections, return false.
    return false;
  }

  public raycast(
    ray: Ray,
    maxDistance: number = Infinity
  ): {
    point: Vector2Like;
    hit: Rect;
  } | null {
    // If the ray doesn't intersect the quadtree's bounds, return null.
    if (!checkRayIntersectsRect(ray, this.bounds)) {
      return null;
    }

    let closestObj: Rect | null = null;
    let closestHit: Vector2Like | null = null;
    let minDistance = Infinity;

    // If this is not a leaf node, check the child nodes first.
    if (this.nodes[0]) {
      for (const node of this.nodes) {
        const intersectedRect = node.raycast(ray);
        if (intersectedRect) {
          const d = distance(ray.origin, intersectedRect.point);
          if (d >= maxDistance) {
            continue;
          }
          if (d < minDistance) {
            closestObj = intersectedRect.hit;
            closestHit = intersectedRect.point;
            minDistance = d;
          }
        }
      }
    }

    const inflation = 0.22;

    // Check objects in this QuadTree node.
    for (const rect of this.objects) {
      const info = checkRayIntersectsRect(ray, inflateRect(rect, inflation));
      if (info) {
        const d = distance(ray.origin, info);
        if (d >= maxDistance) {
          continue;
        }
        if (d < minDistance) {
          closestObj = rect;
          closestHit = info;
          minDistance = d;
        }
      }
    }

    return closestObj
      ? {
          point: closestHit!,
          hit: closestObj,
        }
      : null;
  }
}

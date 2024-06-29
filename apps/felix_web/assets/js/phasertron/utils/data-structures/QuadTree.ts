import { Vector2Like } from '../springs/Vector2Spring';
import { EPS, Ray, intersectRayRectangle, distance } from './Ray';
import { Rect, rectEnvelopesRect, rectToRectIntersection } from './Rect';

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

export interface IQuadTree<T extends Rect> {
  getAllObjects(): T[];
  clear(): void;
  insert(rect: T): void;
  getAt(point: Vector2Like): T[];
  query(rangeRect: Rect): T[];
  intersect(searchRect: Rect): boolean;
  getHeight(): number;
  getWidth(): number;
}

export default class QuadTree<T extends Rect> implements IQuadTree<T> {
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

  public getHeight = () => this.bounds.height;
  public getWidth = () => this.bounds.width;

  public getAllObjects = () => {
    return this.query(this.bounds);
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

  public insert(rect: T): void {
    // If the rect doesn't belong in this quadrant of the QuadTree, return.
    if (!rectToRectIntersection(this.bounds, rect)) {
      return;
    }

    if (this.nodes[0]) {
      for (const node of this.nodes) {
        node.insert(rect);
      }
      return;
    }

    // If below the capacity and not subdivided yet, insert into this QuadTree node.
    this.objects.push(rect);
    if (this.objects.length >= this.MAX_ITEMS) {
      this.split();
    }
  }

  public getAt(point: Vector2Like): T[] {
    return this.query({ x: point.x, y: point.y, width: EPS, height: EPS });
  }

  public query(rangeRect: Rect): T[] {
    return Array.from(this.internal_query(rangeRect));
  }

  private internal_query(rangeRect: Rect): Set<T> {
    const itemsInRange: Set<T> = new Set();

    // If range doesn't overlap this Quad, return empty array.
    if (!rectToRectIntersection(this.bounds, rangeRect)) {
      return itemsInRange;
    }

    // Check objects in this QuadTree node.
    for (const rect of this.objects) {
      if (rectToRectIntersection(rect, rangeRect)) {
        itemsInRange.add(rect);
      }
    }

    // If leaf node, stop here.
    if (!this.nodes[0]) {
      return itemsInRange;
    }

    // Otherwise, traverse child nodes.
    for (const node of this.nodes) {
      for (const rect of node.internal_query(rangeRect)) {
        itemsInRange.add(rect);
      }
    }

    return itemsInRange;
  }

  public intersect(searchRect: Rect): boolean {
    // If the search rect doesn't overlap this Quad, return false.
    if (!rectToRectIntersection(this.bounds, searchRect)) {
      return false;
    }

    // Check objects in this QuadTree node.
    for (const rect of this.objects) {
      if (rectToRectIntersection(rect, searchRect)) {
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

  public envelopes(rect: Rect): boolean {
    for (const node of this.nodes) {
      if (node.envelopes(rect)) {
        return true;
      }
    }

    for (const obj of this.objects) {
      if (rectEnvelopesRect(obj, rect)) {
        return true;
      }
    }

    return false;

    // for (const obj of this.objects) {
    //   if (obj === rect) {
    //     return true;
    //   }
    // }

    // if (!this.nodes[0]) {
    //   return false;
    // }

    // return false;
  }

  public raycast(
    ray: Ray,
    maxDistance: number = Infinity
  ): { point: Vector2Like; hit: Rect } | null {
    // If the ray doesn't intersect the quadtree's bounds, return null.
    if (!intersectRayRectangle(ray, this.bounds)) {
      return null;
    }

    let closestRect: Rect | null = null;
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
            closestRect = intersectedRect.hit;
            closestHit = intersectedRect.point;
            minDistance = d;
          }
        }
      }
    }

    const inflation = 0; // 0.22;

    // Check objects in this QuadTree node.
    for (const rect of this.objects) {
      const info = intersectRayRectangle(ray, inflateRect(rect, inflation));
      if (info) {
        const d = distance(ray.origin, info);
        if (d >= maxDistance) {
          continue;
        }
        if (d < minDistance) {
          closestRect = rect;
          closestHit = info;
          minDistance = d;
        }
      }
    }

    return closestRect ? { point: closestHit!, hit: closestRect } : null;
  }
}

// function calculateExitPoint(voxel: Rect, direction: Vector2Like): Vector2Like {
//   const edges = {
//     top: voxel.y,
//     right: voxel.x + voxel.width,
//     bottom: voxel.y + voxel.height,
//     left: voxel.x,
//   };

//   // Calculate intersection points with each edge
//   const tRight = (edges.right - voxel.x) / direction.x;
//   const tLeft = (edges.left - voxel.x) / direction.x;
//   const tTop = (edges.top - voxel.y) / direction.y;
//   const tBottom = (edges.bottom - voxel.y) / direction.y;

//   // Determine which intersection is the exit point
//   let exitT = Number.MAX_VALUE;
//   let exitPoint: Vector2Like = { x: voxel.x, y: voxel.y };

//   if (direction.x > 0 && tRight < exitT) {
//     exitT = tRight;
//     exitPoint = { x: edges.right, y: voxel.y + direction.y * tRight };
//   }
//   if (direction.x < 0 && tLeft < exitT) {
//     exitT = tLeft;
//     exitPoint = { x: edges.left, y: voxel.y + direction.y * tLeft };
//   }
//   if (direction.y > 0 && tBottom < exitT) {
//     exitT = tBottom;
//     exitPoint = { x: voxel.x + direction.x * tBottom, y: edges.bottom };
//   }
//   if (direction.y < 0 && tTop < exitT) {
//     exitT = tTop;
//     exitPoint = { x: voxel.x + direction.x * tTop, y: edges.top };
//   }

//   return exitPoint;
// }

// export function throughcastQuadtree<T extends Rect>(
//   quadTree: IQuadTree<T>,
//   start: Vector2Like,
//   end: Vector2Like
// ): { passed: boolean; boundary: Vector2Like | null } {
//   let currentPoint = { ...start };
//   const direction = { x: end.x - start.x, y: end.y - start.y };
//   const length = Math.sqrt(direction.x ** 2 + direction.y ** 2);
//   direction.x /= length; // Normalize
//   direction.y /= length;

//   while (true) {
//     const voxelsAtCurrentPoint = quadTree.getAt(currentPoint);
//     if (voxelsAtCurrentPoint.length === 0) {
//       return { passed: false, boundary: currentPoint };
//     }

//     let farthestDistance = 0;
//     let nextStepPoint: Vector2Like | null = null;
//     for (const voxel of voxelsAtCurrentPoint) {
//       const exitPoint = calculateExitPoint(voxel, direction);
//       const distance = Math.sqrt(
//         (exitPoint.x - currentPoint.x) ** 2 +
//           (exitPoint.y - currentPoint.y) ** 2
//       );
//       if (distance > farthestDistance) {
//         farthestDistance = distance;
//         nextStepPoint = exitPoint;
//       }
//     }

//     if (!nextStepPoint) {
//       return { passed: false, boundary: null }; // Safety check, should not happen
//     }

//     // Move slightly forward in the direction of the ray from the farthest exit point
//     currentPoint = {
//       x: nextStepPoint.x + direction.x * 0.01,
//       y: nextStepPoint.y + direction.y * 0.01,
//     };

//     // Check if we have gone past the end point
//     if (
//       (direction.x > 0 && currentPoint.x >= end.x) ||
//       (direction.x < 0 && currentPoint.x <= end.x) ||
//       (direction.y > 0 && currentPoint.y >= end.y) ||
//       (direction.y < 0 && currentPoint.y <= end.y)
//     ) {
//       break; // Reached or passed the end point
//     }
//   }

//   // If the loop exits, it means we have successfully traversed to the end without finding a gap
//   return { passed: true, boundary: null };
// }

export function throughcastQuadtree<T extends Rect>(
  quadTree: IQuadTree<T>,
  start: Vector2Like,
  end: Vector2Like
): { passed: boolean; boundary: Vector2Like | null } {
  let currentPoint = { ...start };
  const direction = {
    x: end.x - start.x,
    y: end.y - start.y,
  };
  const rayLength = Math.sqrt(direction.x ** 2 + direction.y ** 2);
  direction.x /= rayLength; // Normalize
  direction.y /= rayLength;

  const ray: Ray = {
    origin: currentPoint,
    direction,
  };

  while (true) {
    const voxels = quadTree.getAt(currentPoint);
    if (voxels.length === 0) {
      // If no voxel is found, the ray is 'exposed'
      return { passed: false, boundary: currentPoint };
    }

    let closestIntersection = null;
    let closestVoxel: Rect | null = null;
    for (const voxel of voxels) {
      const intersection = intersectRayRectangle(ray, inflateRect(voxel, 1.1));
      if (intersection) {
        const distance = Math.sqrt(
          (intersection.x - currentPoint.x) ** 2 +
            (intersection.y - currentPoint.y) ** 2
        );
        if (!closestIntersection || distance < closestIntersection.distance) {
          closestIntersection = { point: intersection, distance };
          closestVoxel = voxel;
        }
      }
    }

    if (!closestIntersection) {
      // This case should theoretically not happen, but it's a safety check
      return { passed: false, boundary: null };
    }

    // Move slightly forward in the direction of the ray from the closest intersection point
    currentPoint = {
      x: closestIntersection.point.x + direction.x * 0.01,
      y: closestIntersection.point.y + direction.y * 0.01,
    };
    ray.origin = currentPoint; // Update ray origin for the next iteration

    // Check if we have moved past the end point
    if (
      (direction.x > 0 && currentPoint.x >= end.x) ||
      (direction.x < 0 && currentPoint.x <= end.x) ||
      (direction.y > 0 && currentPoint.y >= end.y) ||
      (direction.y < 0 && currentPoint.y <= end.y)
    ) {
      // Check if the last voxel before moving past was the target
      if (closestVoxel && pointInsideRect(end, closestVoxel)) {
        return { passed: true, boundary: null }; // End point is inside the last voxel
      }
      return { passed: true, boundary: currentPoint }; // Successfully reached the end or beyond without gaps
    }
  }

  // Helper function to check if a point is inside a rectangle
  function pointInsideRect(point: Vector2Like, rect: Rect): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }
}

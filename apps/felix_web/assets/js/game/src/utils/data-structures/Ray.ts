import { Vector2Like } from '../springs/Vector2Spring';
import { Rect } from './Rect';

export type RayIntersectionResult = {
  rect?: Rect;
  point: Vector2Like;
};

type Segment2D = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const EPS = 1e-4;

function sqrdDistance(point1: Vector2Like, point2: Vector2Like) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;

  return dx * dx + dy * dy;
}

export type Ray = {
  origin: Vector2Like;
  direction: Vector2Like;
};

const sides = [
  {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  },
  {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  },
  {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  },
  {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  },
];
export function checkRayIntersectsRect(
  ray: Ray,
  rect: Rect
): Vector2Like | null {
  sides[0].x1 = rect.x;
  sides[0].y1 = rect.y;
  sides[0].x2 = rect.x + rect.width;
  sides[0].y2 = rect.y;
  // top side

  sides[1].x1 = rect.x;
  sides[1].y1 = rect.y + rect.height;
  sides[1].x2 = rect.x + rect.width;
  sides[1].y2 = rect.y + rect.height;
  // bottom side

  sides[2].x1 = rect.x;
  sides[2].y1 = rect.y;
  sides[2].x2 = rect.x;
  sides[2].y2 = rect.y + rect.height;
  // left side

  sides[3].x1 = rect.x + rect.width;
  sides[3].y1 = rect.y;
  sides[3].x2 = rect.x + rect.width;
  sides[3].y2 = rect.y + rect.height;
  // right side

  let dist = Infinity;
  let closest = null;
  for (const side of sides) {
    const intersection = checkRayIntersectsLineSegment(ray, side);
    if (intersection) {
      var d = sqrdDistance(ray.origin, intersection);
      if (d < dist) {
        dist = d;
        closest = intersection;
      }
    }
  }

  return closest;
}

let det;
let ua;
let ub;
function checkRayIntersectsLineSegment(
  ray: Ray,
  segment: Segment2D
): Vector2Like | null {
  det =
    ray.direction.x * (segment.y2 - segment.y1) -
    ray.direction.y * (segment.x2 - segment.x1);
  if (det === 0) return null; // lines are parallel

  ua =
    ((segment.x2 - segment.x1) * (ray.origin.y - segment.y1) -
      (segment.y2 - segment.y1) * (ray.origin.x - segment.x1)) /
    (det + EPS);
  ub =
    (ray.direction.x * (ray.origin.y - segment.y1) -
      ray.direction.y * (ray.origin.x - segment.x1)) /
    (det + EPS);

  if (ua >= 0 && ub >= 0 && ub <= 1) {
    return {
      x: ray.origin.x + ua * ray.direction.x,
      y: ray.origin.y + ua * ray.direction.y,
    };
  }

  return null;
}

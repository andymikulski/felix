import { IVoxel } from './Voxelizer';
import { Vector2Like } from '../../springs/Vector2Spring';
import { vec2normalize } from './NavMeshAgent';

export function getPortalForTwoVoxels(
  voxelA: IVoxel,
  voxelB: IVoxel
): [Vector2Like, Vector2Like] | null {
  const overlappingEdge = findOverlappingEdges(voxelA, voxelB, false);
  return overlappingEdge ?? null;
}

export function getPortals(voxelPath: IVoxel[]): [Vector2Like, Vector2Like][] {
  const portals: [Vector2Like, Vector2Like][] = [];

  for (let i = 0; i < voxelPath.length; i++) {
    if (i === 0) {
      continue;
    }
    const currentVoxel = voxelPath[i];
    const prevVoxel = voxelPath[i - 1];
    if (currentVoxel.isVirtual || prevVoxel.isVirtual) {
      // jump points
      portals.push([currentVoxel, prevVoxel] as [Vector2Like, Vector2Like]);
      continue;
    }
    const overlappingEdge = findOverlappingEdges(currentVoxel, prevVoxel);
    if (overlappingEdge && overlappingEdge[0].x !== Number.NEGATIVE_INFINITY) {
      portals.push(overlappingEdge);
    }
  }

  const rayPos = { x: 0, y: 0 };
  let rayDir = { x: 0, y: 0 };

  return portals.map((portal, idx) => {
    // Update rayPos and rayDir to reflect the center of the previous portal
    const lastPortalCenter = {
      x: voxelPath[idx].x + voxelPath[idx].width / 2,
      y: voxelPath[idx].y + voxelPath[idx].height / 2,
    };
    const thisPortalCenter = {
      x: (portal[0].x + portal[1].x) / 2,
      y: (portal[0].y + portal[1].y) / 2,
    };
    rayPos.x = lastPortalCenter.x;
    rayPos.y = lastPortalCenter.y;
    rayDir.x = thisPortalCenter.x - lastPortalCenter.x;
    rayDir.y = thisPortalCenter.y - lastPortalCenter.y;
    rayDir = vec2normalize(rayDir);

    // Normalize the rayDir vector
    portal = sortSegmentVertices(rayPos, rayDir, portal);
    return portal;
  });
}

type Vector2 = { x: number; y: number };

const isPointLeftOfRay = (
  rayOrigin: Vector2Like,
  rayDirection: Vector2Like,
  point: Vector2
): boolean => {
  // Calculate vector from ray origin to point
  let vectorToPoint = { x: point.x - rayOrigin.x, y: point.y - rayOrigin.y };
  // Use the "left-hand rule" by taking the cross product of the ray direction and vector to point
  // The z-component of the cross product (since vectors are in 2D, we treat them as 3D vectors with z=0)
  // gives the relative position: positive if left, negative if right, 0 if collinear
  const crossProductZ =
    rayDirection.x * vectorToPoint.y - rayDirection.y * vectorToPoint.x;
  return crossProductZ > 0;
};

function sortSegmentVertices(
  rayOrigin: Vector2,
  rayDirection: Vector2,
  segment: [Vector2, Vector2]
): [Vector2, Vector2] {
  const [pointA, pointB] = segment;
  // Determine which point is to the left and which is to the right of the ray
  if (isPointLeftOfRay(rayOrigin, rayDirection, pointA)) {
    return segment; // pointA is already to the left of pointB relative to the ray
  } else {
    return [pointB, pointA]; // Swap to ensure pointA (now pointB) is to the left
  }
}

function getEdges(voxel: IVoxel) {
  return [
    [
      { x: voxel.x, y: voxel.y },
      { x: voxel.x + voxel.width, y: voxel.y },
    ], // Top edge
    [
      { x: voxel.x, y: voxel.y },
      { x: voxel.x, y: voxel.y + voxel.height },
    ], // Left edge
    [
      { x: voxel.x + voxel.width, y: voxel.y },
      { x: voxel.x + voxel.width, y: voxel.y + voxel.height },
    ], // Right edge
    [
      { x: voxel.x, y: voxel.y + voxel.height },
      { x: voxel.x + voxel.width, y: voxel.y + voxel.height },
    ], // Bottom edge
  ];
}

function approx(a: number, b: number) {
  return Math.abs(a - b) < 0.1;
}

function overlap(
  min1: number,
  max1: number,
  min2: number,
  max2: number
): boolean {
  return Math.max(min1, min2) < Math.min(max1, max2);
}

function findOverlappingEdges(
  voxelA: IVoxel,
  voxelB: IVoxel,
  throwIfNone = true
): [Vector2Like, Vector2Like] | null {
  const edgesA = getEdges(voxelA);
  const edgesB = getEdges(voxelB);

  for (const edgeA of edgesA) {
    for (const edgeB of edgesB) {
      if (
        approx(edgeA[0].x, edgeB[0].x) &&
        approx(edgeA[1].x, edgeB[1].x) &&
        overlap(edgeA[0].y, edgeA[1].y, edgeB[0].y, edgeB[1].y)
      ) {
        // Vertical overlap
        const minY = Math.max(edgeA[0].y, edgeB[0].y);
        const maxY = Math.min(edgeA[1].y, edgeB[1].y);
        return [
          { x: edgeA[0].x, y: minY },
          { x: edgeA[0].x, y: maxY },
        ];
      } else if (
        approx(edgeA[0].y, edgeB[0].y) &&
        approx(edgeA[1].y, edgeB[1].y) &&
        overlap(edgeA[0].x, edgeA[1].x, edgeB[0].x, edgeB[1].x)
      ) {
        // Horizontal overlap
        const minX = Math.max(edgeA[0].x, edgeB[0].x);
        const maxX = Math.min(edgeA[1].x, edgeB[1].x);
        return [
          { x: minX, y: edgeA[0].y },
          { x: maxX, y: edgeA[0].y },
        ];
      }
    }
  }

  // If there is no overlapping edge, return an invalid portal to indicate the absence of an overlap
  if (throwIfNone) {
    throw new Error('No overlapping edge found');
  }

  return null;
}

export class Funnel {
  private portalApexIndex: number;
  private portalLeftIndex: number;
  private portalRightIndex: number;
  private apex: Vector2Like;
  private left: Vector2Like;
  private right: Vector2Like;
  private path: Vector2Like[];

  constructor() {
    this.portalApexIndex = 0;
    this.portalLeftIndex = 0;
    this.portalRightIndex = 0;
    this.apex = { x: 0, y: 0 };
    this.left = { x: 0, y: 0 };
    this.right = { x: 0, y: 0 };
    this.path = [];
  }

  private static triarea2(
    a: Vector2Like,
    b: Vector2Like,
    c: Vector2Like
  ): number {
    const ax = b.x - a.x;
    const ay = b.y - a.y;
    const bx = c.x - a.x;
    const by = c.y - a.y;
    return bx * ay - ax * by;
  }

  private static vequal(a: Vector2Like, b: Vector2Like): boolean {
    return approx(a.x, b.x) && approx(a.y, b.y);
  }

  public stringPull(portals: [Vector2Like, Vector2Like][]): Vector2Like[] {
    // Init scan state
    this.apex = portals[0][0];
    this.left = portals[0][0];
    this.right = portals[0][1];
    this.portalApexIndex = 0;
    this.portalLeftIndex = 0;
    this.portalRightIndex = 0;
    this.path.push(this.apex);

    for (let i = 1; i < portals.length; i++) {
      const left = portals[i][0];
      const right = portals[i][1];

      // Update right vertex.
      if (Funnel.triarea2(this.apex, this.right, right) <= 0.0) {
        if (
          Funnel.vequal(this.apex, this.right) ||
          Funnel.triarea2(this.apex, this.left, right) > 0.0
        ) {
          // Tighten the funnel.
          this.right = right;
          this.portalRightIndex = i;
        } else {
          // Right over left, insert left to path and restart scan from portal left point.
          this.path.push(this.left);
          // Make current left the new apex.
          this.apex = this.left;
          this.portalApexIndex = this.portalLeftIndex;
          // Reset portal
          this.left = this.apex;
          this.right = this.apex;
          this.portalLeftIndex = this.portalApexIndex;
          this.portalRightIndex = this.portalApexIndex;
          // Restart scan
          i = this.portalApexIndex;
          continue;
        }
      }

      // Update left vertex.
      if (Funnel.triarea2(this.apex, this.left, left) >= 0.0) {
        if (
          Funnel.vequal(this.apex, this.left) ||
          Funnel.triarea2(this.apex, this.right, left) < 0.0
        ) {
          // Tighten the funnel.
          this.left = left;
          this.portalLeftIndex = i;
        } else {
          // Left over right, insert right to path and restart scan from portal right point.
          this.path.push(this.right);
          // Make current right the new apex.
          this.apex = this.right;
          this.portalApexIndex = this.portalRightIndex;
          // Reset portal
          this.left = this.apex;
          this.right = this.apex;
          this.portalLeftIndex = this.portalApexIndex;
          this.portalRightIndex = this.portalApexIndex;
          // Restart scan
          i = this.portalApexIndex;
          continue;
        }
      }
    }
    if (
      !Funnel.vequal(
        this.path[this.path.length - 1],
        portals[portals.length - 1][1]
      )
    ) {
      // Append last point to path.
      this.path.push(portals[portals.length - 1][1]);
    }
    return this.path;
  }
}

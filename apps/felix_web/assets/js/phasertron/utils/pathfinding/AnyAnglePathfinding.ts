import { Vector2Like } from '../springs/Vector2Spring';

/**
 * Optimizes a given path by removing unnecessary points.
 * This is achieved by checking if there is a direct line of sight
 * between points using binary search. It tries to find the farthest
 * point in the path that can be reached without hitting any obstacles.
 *
 * @param path - Initial array of Vector2Like points to be optimized
 * @param checkLineOfSight - Function to check if there's a direct line of sight between two points
 */
export function applyAnyAnglePathingInPlace(
  path: Vector2Like[],
  checkLineOfSight: (pt1: Vector2Like, pt2: Vector2Like) => boolean
): void {
  // If the path has 2 or fewer points, return as is
  if (path.length <= 2) {
    return;
  }

  // Set the current index to the first point in the path
  let currentIdx = 0;
  let current: Vector2Like;
  let optimizedIdx = 0; // Index in the path array where the last significant point was placed

  let lo = 0;
  let mid = 0;
  let hi = 0;
  let nextIdx = 0;
  let hasLineOfSight = false;

  // Loop until we've processed all points in the path
  while (currentIdx < path.length - 1) {
    // Set the origin of the ray to the current point in the path
    current = path[currentIdx];

    // Initialize binary search boundaries
    lo = currentIdx + 1;
    hi = path.length - 1;
    nextIdx = -1;

    // Perform binary search to find the furthest point that can be reached
    while (lo <= hi) {
      mid = ((lo + hi) / 2) | 0;
      hasLineOfSight = checkLineOfSight(current, path[mid]);

      // If there's no obstacle, update the next index and move the lower bound
      if (hasLineOfSight) {
        nextIdx = mid;
        lo = mid + 1;
      } else {
        // If there's an obstacle, move the upper bound
        hi = mid - 1;
      }
    }

    // If no direct line of sight is found, move to the next point in the path
    if (nextIdx == -1) {
      nextIdx = currentIdx + 1;
    }

    // Swap the identified point in the path array
    optimizedIdx++;
    path[optimizedIdx] = path[nextIdx];

    // Update the current index to the identified point
    currentIdx = nextIdx;
  }

  // Trim the path array to remove unnecessary points
  path.length = optimizedIdx + 1;
}

/**
 * Optimizes a given path by removing unnecessary points.
 * This is achieved by checking if there is a direct line of sight
 * between points using binary search. It tries to find the farthest
 * point in the path that can be reached without hitting any obstacles.
 *
 * @param path - Initial array of Vector2 points to be optimized
 * @returns - Optimized array of Vector2 points after applying the any-angle pathing
 */
export default function applyAnyAnglePathing(
  path: Vector2Like[],
  checkLineOfSight: (pt1: Vector2Like, pt2: Vector2Like) => boolean
): Vector2Like[] {
  // If the path has 2 or fewer points, return as is
  if (path.length <= 2) {
    return path;
  }

  const newPath: Vector2Like[] = [];

  // Set the current index to the first point in the path
  let currentIdx = 0;
  let current: Vector2Like;
  newPath.push(path[0]);

  // Loop until we've processed all points in the path
  while (currentIdx < path.length - 1) {
    // Set the origin of the ray to the current point in the path
    current = path[currentIdx];

    // Initialize binary search boundaries
    let lo = currentIdx + 1;
    let hi = path.length - 1;
    let nextIdx = -1;

    // Perform binary search to find the furthest point that can be reached
    while (lo <= hi) {
      let mid = Math.floor((lo + hi) / 2);
      const hasLineOfSight = checkLineOfSight(current, path[mid]);

      // If there's no obstacle, that means we can effectively, update the next index and move the lower bound
      if (hasLineOfSight) {
        nextIdx = mid;
        lo = mid + 1;
      } else {
        // If there's an obstacle, move the upper bound
        hi = mid - 1;
      }
    }

    // If no direct line of sight is found, move to the next point in the path
    if (nextIdx == -1) {
      nextIdx = currentIdx + 1;
    }

    // Add the identified point to the new path
    newPath.push(path[nextIdx]);

    // Update the current index to the identified point
    currentIdx = nextIdx;
  }

  // Return the optimized path
  return newPath;
}

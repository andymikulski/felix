import DoublyLinkedList from '../../data-structures/DoublyLinkedList';
import QuadTree, { throughcastQuadtree } from '../../data-structures/QuadTree';
import { distSquared, distance } from '../../data-structures/Ray';
import { Point } from '../../data-structures/Rect';
import { applyAnyAnglePathingInPlace } from '../../pathfinding/AnyAnglePathfinding';
import { Funnel, getPortals } from './PathFunnel';
import { Vector2Like } from '../../springs/Vector2Spring';
import { IVoxel } from './Voxelizer';
import ServiceContainer from '../../../services/ServiceContainer';
import { INavMeshCongestionService } from './NavMeshCongestionService';
import { CastToNavMeshCongestionService } from './NavMeshCongestionService.gen';
import { CastToSceneService } from '../../../services/SceneService.gen';

// Draw debug lines/circles to see the portals found along a path
const DEBUG_DRAW_PORTALS = false;

/**
 * Caches the found paths between voxels
 */
const CACHE_PATHS = false;

/**
 * Controls use of the 'Simple Stupid Funnel Algorithm' to find the shortest path
 * When disabled, the path will just navigate between the centers of the voxels
 */
const USE_FUNNEL = true;

/**
 * Applies any-angle pathfinding through the use of line-of-sight checks.
 */
const USE_ANY_ANGLE = true;

type VoxelPath = {
  steps: IVoxel[];
  travelledDistance: number;
};

export class VoxelPathFinder {
  private _congestionManager: INavMeshCongestionService;
  private get congestionManager(): INavMeshCongestionService {
    this._congestionManager ??= ServiceContainer.getService(
      CastToNavMeshCongestionService
    );
    return this._congestionManager;
  }

  private cachedPaths: Map<IVoxel, Map<IVoxel, Vector2Like[]>> = new Map();

  public getPath(
    voxels: QuadTree<IVoxel>,
    startPt: Point,
    endPt: Point
  ): Point[] {
    startPt = { x: startPt.x, y: startPt.y };
    const startingVoxel = voxels.getAt(startPt)[0];
    const endingVoxel = voxels.getAt(endPt)[0];

    if (!startingVoxel) {
      console.error('No voxel found at start point');
      return [];
    }
    if (!endingVoxel) {
      console.error('No voxel found at end point', endPt);
      return [];
    }

    const savePath = (start: IVoxel, end: IVoxel, path: Vector2Like[]) => {
      if (!CACHE_PATHS) {
        return;
      }
      if (!this.cachedPaths.has(start)) {
        this.cachedPaths.set(start, new Map());
      }
      this.cachedPaths.get(start)!.set(end, path);
    };

    if (this.cachedPaths.has(startingVoxel)) {
      const cached = this.cachedPaths.get(startingVoxel);
      if (cached!.has(endingVoxel)) {
        return cached!.get(endingVoxel)!;
      }
    }

    // console.log('startingVoxel', startingVoxel, 'endingVoxel', endingVoxel);

    if (startingVoxel === endingVoxel) {
      return this.getFinePathFromCoarse(voxels, {
        steps: [
          {
            x: startPt.x,
            y: startPt.y,
            width: 0,
            height: 0,
            neighbors: new Set(),
          },
          {
            x: endPt.x,
            y: endPt.y,
            width: 0,
            height: 0,
            neighbors: new Set(),
          },
        ],
        travelledDistance: 0,
      });
    }

    // use basic BFS to find the shortest path
    const queue = new DoublyLinkedList<VoxelPath>();
    queue.insertFirst({ steps: [startingVoxel], travelledDistance: 0 });

    let current: VoxelPath;

    var seen = new Set<IVoxel>();

    while ((current = queue.removeFirst()!)) {
      const lastVoxel = current.steps[current.steps.length - 1];

      for (const [neighbor, _portal] of lastVoxel.neighbors) {
        // Found the end point! Return the fine path.
        if (neighbor === endingVoxel) {
          if (USE_FUNNEL) {
            current.steps.push(neighbor);

            const portals = getPortals(current.steps);
            portals.unshift([startPt, startPt]);
            portals.push([endPt, endPt]);

            if (DEBUG_DRAW_PORTALS) {
              // debug draw the portals using lines
              const scene =
                ServiceContainer.getService(CastToSceneService).getScene();

              for (const pair of portals) {
                scene.add
                  .line(
                    0,
                    0,
                    pair[0].x,
                    pair[0].y,
                    pair[1].x,
                    pair[1].y,
                    0xff00
                  )
                  .setOrigin(0, 0)
                  .setDepth(100000);

                // red circle on first, blue circle on second
                scene.add
                  .circle(pair[0].x, pair[0].y, 5, 0xff0000)
                  .setDepth(100000);
                scene.add
                  .circle(pair[1].x, pair[1].y, 5, 0x0000ff)
                  .setDepth(100000);
              }
            }

            const funnel = new Funnel();
            const path = funnel.stringPull(portals);
            // path.unshift(startPt);
            // path.push(endPt);

            if (USE_ANY_ANGLE) {
              // console.log('applying any angle pathfinding');
              // use line of sight checks to remove unnecessary points
              applyAnyAnglePathingInPlace(path, (pt1, pt2) => {
                // Perform a raycast to see if the ray hits any obstacles
                const hit = throughcastQuadtree(voxels, pt1, pt2);
                // We need to return `true` if this does NOT have any obstructions between pt1 and pt2
                return hit.passed;
              });
            }

            savePath(startingVoxel, endingVoxel, path);
            return path;
          } else {
            const path = this.getFinePathFromCoarse(voxels, current); // , startPt, endPt);
            savePath(startingVoxel, endingVoxel, path);

            return path;
          }
        }

        // If we've already seen this neighbor that means something else reached it first
        // and is therefor a guaranteed shorter path. We can skip it.
        if (seen.has(neighbor)) {
          continue;
        }
        seen.add(neighbor);

        const nextPath = {
          steps: [...current.steps, neighbor],
          travelledDistance:
            current.travelledDistance +
            // compare against the vertices of the voxel
            // use the closest distance since that's probably what we'll path through
            // (using distSquared to save some computations)
            Math.min(
              distSquared(
                {
                  x: lastVoxel.x,
                  y: lastVoxel.y,
                },
                neighbor
              ),
              distSquared(
                {
                  x: lastVoxel.x + lastVoxel.width,
                  y: lastVoxel.y + lastVoxel.height,
                },
                neighbor
              ),
              distSquared(
                {
                  x: lastVoxel.x + lastVoxel.width,
                  y: lastVoxel.y,
                },
                neighbor
              ),
              distSquared(
                {
                  x: lastVoxel.x,
                  y: lastVoxel.y + lastVoxel.height,
                },
                neighbor
              )
            ),
        };
        const nextScore = this.getScore(nextPath, endPt);
        const currentBest =
          queue.count > 0 ? this.getScore(queue.head!.data, endPt) : Infinity;

        if (nextScore > currentBest) {
          queue.insertLast(nextPath);
        } else {
          queue.insertFirst(nextPath);
        }
      }
    }

    throw new Error('No path found');
  }

  private getFinePathFromCoarse(
    voxels: QuadTree<IVoxel>,
    found: VoxelPath
  ): Vector2Like[] {
    var pts = found.steps.map((voxel) => ({
      x: voxel.x + voxel.width / 2,
      y: voxel.y + voxel.height / 2,
    }));

    if (USE_ANY_ANGLE) {
      // console.log('applying any angle pathfinding');
      // use line of sight checks to remove unnecessary points
      applyAnyAnglePathingInPlace(pts, (pt1, pt2) => {
        // Perform a raycast to see if the ray hits any obstacles
        const hit = throughcastQuadtree(voxels, pt1, pt2);
        // We need to return `true` if this does NOT have any obstructions between pt1 and pt2
        return hit.passed;
      });
    }

    return pts;
  }

  // higher score is worse
  private getScore(path: VoxelPath, endPoint: Point) {
    if (path.steps.length === 0) {
      return 1;
    }

    const lastStep = path.steps[path.steps.length - 1];
    const lastPoint = {
      x: lastStep.x + lastStep.width / 2,
      y: lastStep.y + lastStep.height / 2,
    };
    const voxelArea = path.steps.reduce((acc, voxel) => {
      return acc + voxel.width * voxel.height;
    }, 0);

    const congestion = this.congestionManager.sampleCongestionAlongLine(
      lastPoint.x,
      lastPoint.y,
      endPoint.x,
      endPoint.y
    );

    var maxSide = Math.max(lastStep.width, lastStep.height);

    return (
      path.travelledDistance * 1_000 + // path travelled so far
      path.steps.length * 1_000 + // number of steps that we've taken to get this far
      distance(lastPoint, endPoint) + // distance to the goal
      congestion * 1_000 + // congestion along this particular leg to the goal
      voxelArea * 1_000 + // penalize paths that go through larger voxels
      maxSide * 2_000
    );
  }
}

import { CastToSceneService } from '../../../services/SceneService.gen';
import ServiceContainer from '../../../services/ServiceContainer';
import PriorityQueue from '../../data-structures/PriorityQueue';
import QuadTree from '../../data-structures/QuadTree';
import normalize from '../../data-structures/Ray';
import { getCenter } from '../../data-structures/Rect';
import { Vector2Like } from '../../springs/Vector2Spring';
import { INavMeshCongestionService } from './NavMeshCongestionService';
import { CastToNavMeshCongestionService } from './NavMeshCongestionService.gen';
import { IVoxel } from './Voxelizer';

const DRAW_DEBUG_FLOW_LINES = false;

// If true, calling rebakes on the flowfield will only traverse the voxels that have changed. (this is buggy)
// If false, a rebake will traverse the entire voxel grid. (this is basically a full rebake)
const USE_PARTIAL_REBAKES = false;

class FlowFieldCell {
  private voxel: IVoxel;
  private portal: [Vector2Like, Vector2Like];

  constructor(voxel: IVoxel, portal: [Vector2Like, Vector2Like]) {
    this.voxel = voxel;
    this.portal = portal;
  }

  public equals = (other: FlowFieldCell): boolean => {
    return (
      this.voxel.x === other.voxel.x &&
      this.voxel.y === other.voxel.y &&
      this.voxel.width === other.voxel.width &&
      this.voxel.height === other.voxel.height &&
      this.portal[0].x === other.portal[0].x &&
      this.portal[0].y === other.portal[0].y &&
      this.portal[1].x === other.portal[1].x &&
      this.portal[1].y === other.portal[1].y
    );
  };

  private vectorDot(v1: Vector2Like, v2: Vector2Like): number {
    return v1.x * v2.x + v1.y * v2.y;
  }

  private _tmpLine = { x: 0, y: 0 };

  /**
   * This particular function can be called a LOT - once per frame for every active flow field agent.
   * Most of the math logic has been inlined to avoid function call overhead, at the cost of readability.
   */
  private closestPointOnLineSegment(
    lineStart: Vector2Like,
    lineEnd: Vector2Like,
    point: Vector2Like
  ): Vector2Like {
    this._tmpLine.x = lineEnd.x - lineStart.x;
    this._tmpLine.y = lineEnd.y - lineStart.y;

    // Clamp t between 0-1 to get nearest point on the segment.
    const t = Math.max(
      0,
      Math.min(
        1,
        this.vectorDot(
          // (point - lineStart) * (lineEnd - lineStart)
          { x: point.x - lineStart.x, y: point.y - lineStart.y }, // point - lineStart
          this._tmpLine // lineEnd - lineStart
        ) /
          (this._tmpLine.x * this._tmpLine.x +
            this._tmpLine.y * this._tmpLine.y) // Length of the line segment
      )
    );

    // We are certain this object is not going to be overwritten by another call,
    // so we can just return it here and trust that it can be safely modified in the future.
    // (If this is called from anywhere other than `getDirectionToPortal`, this will become a bug.)
    this._tmpLine.x = lineStart.x + t * this._tmpLine.x;
    this._tmpLine.y = lineStart.y + t * this._tmpLine.y;
    return this._tmpLine;
  }

  public getDirectionToPortal = (position: Vector2Like): number => {
    const dest = this.closestPointOnLineSegment(
      this.portal[0],
      this.portal[1],
      position
    );
    return Math.atan2(dest.y - position.y, dest.x - position.x);
  };
}

export class VoxelizedFlowField {
  private $voxels: QuadTree<IVoxel>;
  private flowMap: Map<IVoxel, FlowFieldCell> = new Map();
  private origin: { x: number; y: number };
  private congestionService: INavMeshCongestionService;

  constructor(voxels: QuadTree<IVoxel>) {
    this.$voxels = voxels;
    this.origin = { x: NaN, y: NaN };

    this.congestionService = ServiceContainer.getService(
      CastToNavMeshCongestionService
    );
  }

  public getOrigin = () => {
    return this.origin;
  };

  public calculateField = (origin: Vector2Like, freshBake = false) => {
    console.time('flow field');
    const originVoxel = this.$voxels.getAt(origin);
    this.origin.x = origin.x;
    this.origin.y = origin.y;

    if (!originVoxel.length) {
      throw new Error('Flow Field origin is not inside any voxel!');
    }

    const queue: IVoxel[] = [originVoxel[0]];
    const flowMap: Map<IVoxel, FlowFieldCell> = freshBake
      ? new Map()
      : this.flowMap;
    const seen = new Set<IVoxel>();

    // seed the first voxel as seen
    seen.add(originVoxel[0]);
    flowMap.set(
      originVoxel[0],
      new FlowFieldCell(originVoxel[0], [
        origin,
        { x: origin.x + 0.1, y: origin.y + 0.1 },
      ])
    );

    const addQueue = new PriorityQueue<IVoxel>();
    while (queue.length > 0) {
      const currentVoxel = queue.shift()! as IVoxel;
      for (const [neighbor, portal] of currentVoxel.neighbors) {
        if (seen.has(neighbor)) {
          continue;
        }
        seen.add(neighbor);

        const flowCell = new FlowFieldCell(neighbor, portal);
        const size = neighbor.width * neighbor.height;
        const numNeighbors = neighbor.neighbors.size;

        if (USE_PARTIAL_REBAKES) {
          if (!freshBake && this.flowMap.get(neighbor)?.equals(flowCell)) {
            continue;
          } else {
            flowMap.set(neighbor, flowCell);
          }
        } else {
          flowMap.set(neighbor, flowCell);
        }

        addQueue.push(neighbor, -numNeighbors * 10 - size);
      }

      while (!addQueue.isEmpty()) {
        queue.push(addQueue.pop()!);
      }
    }

    this.flowMap = flowMap;

    console.timeEnd('flow field');

    if (DRAW_DEBUG_FLOW_LINES) {
      this.debugDrawField();
    }
  };

  public getFlowAt = (
    position: Vector2Like,
    throwIfInvalid: boolean = true
  ): number | null => {
    const voxel = this.$voxels.getAt(position);
    if (!voxel.length) {
      if (throwIfInvalid) {
        throw new Error('Position is not inside any voxel!');
      }
      return null;
    }
    return this.flowMap.get(voxel[0])?.getDirectionToPortal(position) ?? null;
  };

  private debugContainer?: Phaser.GameObjects.Container;

  private debugDrawField = () => {
    const scene = ServiceContainer.getService(CastToSceneService).getScene();
    this.debugContainer ??= scene.add.container(0, 0);

    this.debugContainer.getAll().forEach((child) => child.destroy());

    for (const [voxel, flowCell] of this.flowMap.entries()) {
      const center = getCenter(voxel);
      const dir = flowCell.getDirectionToPortal(center);

      const dirX = Math.cos(dir);
      const dirY = Math.sin(dir);

      const line = scene.add
        .line(
          0,
          0,
          center.x,
          center.y,
          center.x + dirX * 15,
          center.y + dirY * 15,
          0xff0000
        )
        .setOrigin(0, 0)
        .setLineWidth(0.1, 1);

      const circle = scene.add.circle(
        center.x + dirX * 15,
        center.y + dirY * 15,
        2,
        0xff0000
      );

      this.debugContainer.add([line, circle]);
    }
  };
}

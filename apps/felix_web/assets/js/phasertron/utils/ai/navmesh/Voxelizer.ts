import QuadTree from '../../data-structures/QuadTree';
import { Rect, inflateRect } from '../../data-structures/Rect';
import { Vector2Like } from '../../springs/Vector2Spring';
import { getPortalForTwoVoxels } from './PathFunnel';
import { Ref } from './Ref';
import {
  SerializedVoxelization,
  RectSerializer,
  UnicodeRectSerializer,
  USE_UNICODE_SERIALIZATION,
} from './VoxelSerializer';

// Simplifies the voxel set so that one rect covers a larger area of smaller consecutive rects
const USE_SIMPLIFIER = true;

export type Portal = [Vector2Like, Vector2Like];

export interface IVoxel extends Rect {
  isVirtual?: 'jump' | 'portal';
  neighbors: Set<[Ref<IVoxel>, Portal]>;
}

const makeEmptyQuadTree = () =>
  new QuadTree<IVoxel>(0, {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

export default class Voxelizer {
  voxels: IVoxel[] = [];
  private voxQuad: QuadTree<IVoxel> = makeEmptyQuadTree();

  constructor(
    public minVoxelSize: number = 1,
    public agentRadius: number = 4
  ) {}

  public voxelize(
    area: Rect,
    volumes: Rect[],
    obstacles: Rect[],
    obstaclePadding: number = 1
  ) {
    const obstacleTree = new QuadTree(0, area);
    for (const obstacle of obstacles) {
      obstacleTree.insert(inflateRect(obstacle, obstaclePadding));
    }

    const volumeTree = new QuadTree(0, area);
    for (const volume of volumes) {
      volumeTree.insert(volume);
    }

    this.voxQuad = new QuadTree(0, area);
    const out = this.voxelizeInternal(area, volumeTree, obstacleTree);

    this.voxQuad.clear();
    const simped = this.simplify(out);

    for (const simp of simped) {
      this.voxQuad.insert({
        ...simp,
        neighbors: new Set<[Ref<IVoxel>, Portal]>(),
      });
    }

    return this.calculateVoxelNeighbors();
  }

  private voxelizeInternal(
    area: Rect,
    volumes: Ref<QuadTree<Rect>>,
    obstacles: Ref<QuadTree<Rect>>,
    output: Ref<Rect[]> = []
  ): Rect[] {
    if (volumes.envelopes(area) && !obstacles.intersect(area)) {
      output.push(area);
    } else if (volumes.intersect(area)) {
      const halfWidth = area.width / 2;
      const halfHeight = area.height / 2;
      if (halfWidth >= this.minVoxelSize && halfHeight >= this.minVoxelSize) {
        this.voxelizeInternal(
          { x: area.x, y: area.y, width: halfWidth, height: halfHeight },
          volumes,
          obstacles,
          output
        );
        this.voxelizeInternal(
          {
            x: area.x + halfWidth,
            y: area.y,
            width: halfWidth,
            height: halfHeight,
          },
          volumes,
          obstacles,
          output
        );
        this.voxelizeInternal(
          {
            x: area.x,
            y: area.y + halfHeight,
            width: halfWidth,
            height: halfHeight,
          },
          volumes,
          obstacles,
          output
        );
        this.voxelizeInternal(
          {
            x: area.x + halfWidth,
            y: area.y + halfHeight,
            width: halfWidth,
            height: halfHeight,
          },
          volumes,
          obstacles,
          output
        );
      }
    }

    return output;
  }

  private calculateVoxelNeighbors() {
    const voxelList = this.voxQuad.getAllObjects();

    if (USE_SIMPLIFIER) {
      for (const voxel of voxelList) {
        // check just a little bit outside the N/S/E/W boundaries of the voxel
        // this will ensure that no diagonal neighbors are included
        const neighbs = this.voxQuad.query(inflateRect(voxel, 0.1));
        for (const n of neighbs) {
          if (n === voxel) {
            continue;
          }

          // Ensure there is actually a valid portal between these two voxels
          const portal = getPortalForTwoVoxels(voxel, n);
          if (portal) {
            voxel.neighbors.add([n, portal]);
          }
        }
      }
    } else {
      for (const voxel of voxelList) {
        const midX = voxel.x + voxel.width / 2;
        const midY = voxel.y + voxel.height / 2;
        // check just a little bit outside the N/S/E/W boundaries of the voxel
        // this will ensure that no diagonal neighbors are included
        const north = this.voxQuad.getAt({ x: midX, y: voxel.y - 0.1 });
        const south = this.voxQuad.getAt({
          x: midX,
          y: voxel.y + voxel.height + 0.1,
        });
        const east = this.voxQuad.getAt({
          x: voxel.x + voxel.width + 0.1,
          y: midY,
        });
        const west = this.voxQuad.getAt({ x: voxel.x - 0.1, y: midY });
        for (const n of north) {
          if (n === voxel) {
            continue;
          }

          const portal = getPortalForTwoVoxels(voxel, n);
          if (portal) {
            voxel.neighbors.add([n, portal]);
          }
        }
        for (const e of east) {
          if (e === voxel) {
            continue;
          }
          const portal = getPortalForTwoVoxels(voxel, e);
          if (portal) {
            voxel.neighbors.add([e, portal]);
          }
        }

        for (const s of south) {
          if (s === voxel) {
            continue;
          }
          const portal = getPortalForTwoVoxels(voxel, s);
          if (portal) {
            voxel.neighbors.add([s, portal]);
          }
        }
        for (const w of west) {
          if (w === voxel) {
            continue;
          }
          const portal = getPortalForTwoVoxels(voxel, w);
          if (portal) {
            voxel.neighbors.add([w, portal]);
          }
        }
      }
    }

    this.voxels = voxelList;

    // We've updated all references inside this list, so we don't need to `getAllObjects` again
    return voxelList;
  }

  private simplify(voxels: Rect[]) {
    if (!USE_SIMPLIFIER || voxels.length <= 1) {
      return voxels;
    }

    const simp = new VoxelSimplifier();
    console.log(voxels.length, 'before');
    console.time('simp');
    const after = simp.simplify(voxels);
    console.timeEnd('simp');
    console.log(after.length, 'after');
    return after;
  }

  public getAllVoxels = () => {
    return this.voxels;
  };

  public getVoxelTree = () => {
    return this.voxQuad;
  };

  public serialize = () => {
    const outgoing: SerializedVoxelization = {
      height: this.voxQuad.getHeight(),
      width: this.voxQuad.getWidth(),
      voxels: {},
    };

    // Make a map of voxel -> id
    const map: Map<IVoxel, string> = new Map();
    for (let idx = 0; idx < this.voxels.length; idx++) {
      const id = idx.toString();
      const voxel = this.voxels[idx];

      outgoing.voxels[id] = {
        x: voxel.x,
        y: voxel.y,
        width: voxel.width,
        height: voxel.height,
        neighbors: [],
      };
      map.set(voxel, id);
    }

    // Convert voxel references to IDs
    for (const voxel of this.voxels) {
      const id = map.get(voxel)!;
      for (const [neighbor, portal] of voxel.neighbors) {
        const neighborId = map.get(neighbor)!;
        outgoing.voxels[id].neighbors!.push([neighborId, portal[0], portal[1]]);
      }
    }

    const fancySerialize = (
      USE_UNICODE_SERIALIZATION ? UnicodeRectSerializer : RectSerializer
    ).serialize(Object.values(outgoing.voxels));

    // Add width and height to the beginning of the array
    const full = JSON.stringify([
      outgoing.width,
      outgoing.height,
      fancySerialize,
    ]);
    console.log('serialized', this.voxels.length, 'voxels');
    return full;
  };

  public deserialize = (data: string) => {
    const [width, height, incoming] = JSON.parse(data);
    console.log('width', width, 'height', height);

    const rects = (
      USE_UNICODE_SERIALIZATION ? UnicodeRectSerializer : RectSerializer
    ).deserialize(incoming) as any[];

    // convert neighbors to actual references
    for (const rect of rects) {
      rect.neighbors = rect.neighbors.map(
        ([id, pos1, pos2]: [string, Vector2Like, Vector2Like]) => {
          return [rects[parseInt(id, 10)], pos1, pos2];
        }
      );
    }

    var constructedVoxList = [];

    for (const rect of rects) {
      const newVoxel: IVoxel = {
        height: rect.height,
        width: rect.width,
        x: rect.x,
        y: rect.y,
        neighbors: new Set<[Ref<IVoxel>, Portal]>(),
      };
      constructedVoxList.push(newVoxel);
    }

    // Convert IDs to actual references
    for (let i = 0; i < rects.length; i++) {
      const voxel = constructedVoxList[i];
      for (const [neighbor, portal1, portal2] of rects[i].neighbors || []) {
        const neighborVoxel = constructedVoxList[rects.indexOf(neighbor)];
        voxel.neighbors.add([neighborVoxel, [portal1, portal2]]);
      }
    }

    this.voxels = constructedVoxList;
    this.voxQuad = new QuadTree(0, { x: 0, y: 0, width, height });
    for (const vx of constructedVoxList) {
      this.voxQuad.insert(vx);
    }
  };
}

class VoxelSimplifier {
  // Utility function to merge two rectangles
  private merge = (a: Rect, b: Rect): Rect => {
    if (a.y === b.y) {
      // Merge horizontally
      const x = Math.min(a.x, b.x);
      const width = a.width + b.width;
      return { x, y: a.y, width, height: a.height }; // Neighbors are recalculated later
    } else {
      // Merge vertically
      const y = Math.min(a.y, b.y);
      const height = a.height + b.height;
      return { x: a.x, y, width: a.width, height }; // Neighbors are recalculated later
    }
  };

  canMerge = (a: Rect, b: Rect): boolean => {
    // Check if they are on the same line and touching/overlapping
    const areHorizontallyMergeable =
      a.y === b.y &&
      a.height === b.height &&
      (a.x + a.width === b.x || b.x + b.width === a.x);
    const areVerticallyMergeable =
      a.x === b.x &&
      a.width === b.width &&
      (a.y + a.height === b.y || b.y + b.height === a.y);
    return areHorizontallyMergeable || areVerticallyMergeable;
  };

  public simplify(rects: Ref<Rect[]>): Rect[] {
    // Utility function to check if two rectangles can be merged

    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          if (this.canMerge(rects[i], rects[j])) {
            const newRect = this.merge(rects[i], rects[j]);
            rects.push(newRect); // Add the new rectangle
            rects.splice(j, 1); // Remove the merged rectangles
            rects.splice(i, 1);
            merged = true;
            break; // Restart the process as the array has been modified
          }
        }
        if (merged) break; // If merged, restart to check for new merge possibilities
      }
    }

    return rects;
  }
}

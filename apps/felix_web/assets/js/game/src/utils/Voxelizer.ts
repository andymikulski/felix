import QuadTree from './data-structures/QuadTree';
import { Rect, inflateRect } from './data-structures/Rect';

export interface IVoxel extends Rect {
  neighbors: Set<IVoxel>;
}

export default class Voxelizer {
  voxels: IVoxel[];

  constructor(public minVoxelSize: number = 1) {}

  public voxelize(area: Rect, obstacles: Rect[]) {
    console.log('Voxelizing', area, obstacles);
    const obstacleTree = new QuadTree(0, area);
    for (const obstacle of obstacles) {
      obstacleTree.insert(obstacle);
    }

    const out = this.voxelizeInternal(area, obstacleTree);
    return this.findAllNeighbors(out, area.width, area.height);
  }

  private voxelizeInternal(
    area: Rect,
    obstacles: QuadTree<Rect>,
    output: Rect[] = []
  ): Rect[] {
    if (!obstacles.intersect(area)) {
      output.push(area);
    } else {
      const halfWidth = area.width / 2;
      const halfHeight = area.height / 2;
      if (halfWidth >= this.minVoxelSize && halfHeight >= this.minVoxelSize) {
        this.voxelizeInternal(
          { x: area.x, y: area.y, width: halfWidth, height: halfHeight },
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
          obstacles,
          output
        );
      }
    }

    return output;
  }

  private findAllNeighbors(
    voxelRects: Rect[],
    areaWidth: number,
    areaHeight: number
  ) {
    const voxQuad = new QuadTree<IVoxel>(0, {
      x: 0,
      y: 0,
      width: areaWidth,
      height: areaHeight,
    });

    // Prepare the quadtree entries
    for (const rect of voxelRects) {
      const vx: IVoxel = { ...rect, neighbors: new Set<IVoxel>() };
      voxQuad.insert(vx);
    }

    // Find all neighbors for each voxel using the basic quadtree query
    const voxelList = voxQuad.getAllObjects();
    for (const voxel of voxelList) {
      // Inflate the voxel size a little bit so we get all the voxels bordering this one
      const potentialNeighbors = voxQuad.query(voxel);
      for (const n of potentialNeighbors) {
        if (n === voxel) {
          continue;
        }
        voxel.neighbors.add(n);
      }
      console.log('Voxel has neighbors', voxel.neighbors.size);
    }

    this.voxels = voxelList;

    // We've updated all references inside this list, so we don't need to `getAllObjects` again
    return voxelList;
  }

  public getAllVoxels = () => {
    return this.voxels;
  };
}

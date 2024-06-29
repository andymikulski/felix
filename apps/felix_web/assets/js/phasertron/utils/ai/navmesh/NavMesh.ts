import ServiceContainer, { IService } from '../../../services/ServiceContainer';
import QuadTree, { throughcastQuadtree } from '../../data-structures/QuadTree';
import { Rect } from '../../data-structures/Rect';
import { IRVOService, RVOService } from '../../rvo/RVOService';
import { CastToRVOService } from '../../rvo/RVOService.gen';
import { Vector2Like } from '../../springs/Vector2Spring';
import NavMeshCongestionService from './NavMeshCongestionService';
import NavMeshCongestionController, {
  USE_CONGESTION_SERVICE,
  INavMeshCongestionService,
  MockNavMeshCongestionService,
} from './NavMeshCongestionService';
import { CastToNavMeshCongestionService } from './NavMeshCongestionService.gen';
import { VoxelPathFinder } from './VoxelPathFinder';
import {
  RectSerializer,
  USE_UNICODE_SERIALIZATION,
  UnicodeRectSerializer,
} from './VoxelSerializer';
import Voxelizer, { IVoxel, Portal } from './Voxelizer';

export interface INavMesh {
  bake(
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    padding?: number
  ): void;
  serialize(): string;
  import(serialized: string): void;

  getPath(start: Vector2Like, end: Vector2Like): Vector2Like[];
  raycast(
    origin: Vector2Like,
    direction: Vector2Like,
    maxDistance?: number
  ): { hit: boolean; point: Vector2Like };
  validatePoint(point: Vector2Like): boolean;
  getNearestPoint(point: Vector2Like, range: number): Vector2Like | null;

  setMinVoxelSize(size: number): void;
  setAgentSize(size: number): void;
  setObstacles(obstacles: Rect[]): void;
  addObstacle(obstacles: Rect): void;
  setVolumes(volumes: Rect[]): void;
  addVolume(volume: Rect): void;
  setDimensions(width: number, height: number): void;
  getVoxels(): IVoxel[];
  getVoxelQuadTree(): QuadTree<IVoxel>;
  addJumpPoint(x: number, y: number, destX: number, destY: number): void;

  setBakeMode(mode: NavMeshAreaMode): void;
  getBakeMode(): NavMeshAreaMode;
}

export enum NavMeshAreaMode {
  Volume,
  IncludeAll,
}

// This is the "collection" of volumes used if the navmesh is in "IncludeAll" mode.
// This is basically a humungous volume passed into the voxelizer to consider all areas as bakeable.
const INCLUDE_ALL_VOLUME: Rect[] = [
  { x: -50_000, y: -50_000, width: 100_000, height: 100_000 },
];

export class NavMesh implements INavMesh {
  private minVoxelSize = 5;
  private obstacles: Rect[] = [];
  private volumes: Rect[] = [];
  private vox: Voxelizer;
  private pathfinder: VoxelPathFinder;

  private rvo?: IRVOService;

  private congestionManager: INavMeshCongestionService;

  private bakeMode: NavMeshAreaMode = NavMeshAreaMode.IncludeAll;

  constructor(
    private width: number,
    private height: number
  ) {
    this.vox = new Voxelizer(this.minVoxelSize);
    this.pathfinder = new VoxelPathFinder();
    this.congestionManager = ServiceContainer.getService(
      CastToNavMeshCongestionService
    );
  }
  setBakeMode(mode: NavMeshAreaMode): void {
    this.bakeMode = mode;
  }
  getBakeMode(): NavMeshAreaMode {
    return this.bakeMode;
  }

  addVolume(volume: Rect): void {
    if (this.bakeMode !== NavMeshAreaMode.Volume) {
      console.warn('Adding volume to navmesh that is not in volume mode!');
    }
    this.volumes.push(volume);
  }
  addObstacle(obstacle: Rect): void {
    this.obstacles.push(obstacle);

    this.rvo ??= ServiceContainer.getService(CastToRVOService);
    this.rvo?.registerObstacle(obstacle);
  }
  setVolumes(volumes: Rect[]): void {
    if (this.bakeMode !== NavMeshAreaMode.Volume) {
      console.warn('Setting volumes on navmesh that is not in volume mode!');
    }
    this.volumes = ([] as Rect[]).concat(volumes);
  }
  validatePoint(point: Vector2Like): boolean {
    return this.vox.getVoxelTree().getAt(point).length > 0;
  }

  getNearestPoint(point: Vector2Like, range: number): Vector2Like | null {
    console.time('getNearestPoint');
    // Check if the point is already valid
    if (this.validatePoint(point)) {
      console.timeEnd('getNearestPoint');
      return point;
    }

    // If not, check the surrounding area using raycasting
    const numRays = 8;
    const angleStep = (Math.PI * 2) / numRays;

    let closestDist = Infinity;
    let closestPoint: Vector2Like | null = null;
    for (let i = 0; i < numRays; i++) {
      const angle = angleStep * i;
      const direction = {
        x: Math.cos(angle),
        y: Math.sin(angle),
      };

      const ray = this.antiRaycast(point, direction, range);
      if (ray.hit) {
        // There may be multiple hits nearby - find the closest
        const dist = Math.hypot(ray.point.x - point.x, ray.point.y - point.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestPoint = ray.point;
        }
      }
    }
    console.timeEnd('getNearestPoint');

    return closestPoint;
  }

  addJumpPoint = (x: number, y: number, destX: number, destY: number): void => {
    const tree = this.vox.getVoxelTree();
    // create a new IVoxel marked as virtual with 'jump'
    const startVoxel = tree.getAt({ x, y })[0];
    const destVoxel = tree.getAt({ x: destX, y: destY })[0];

    if (!startVoxel || !destVoxel) {
      console.error(
        `Invalid jump point - voxel not found (${!!startVoxel}, ${!!destVoxel})`
      );
      return;
    }

    const jumpVoxel: IVoxel = {
      x,
      y,
      width: 20,
      height: 20,
      isVirtual: 'jump',
      neighbors: new Set<[IVoxel, Portal]>(),
    };
    jumpVoxel.neighbors.add([
      startVoxel,
      [
        { x, y },
        { x, y },
      ],
    ]);
    jumpVoxel.neighbors.add([
      destVoxel,
      [
        { x, y },
        { x, y },
      ],
    ]);
    startVoxel.neighbors.add([
      jumpVoxel,
      [
        { x, y },
        { x, y },
      ],
    ]);
    destVoxel.neighbors.add([
      jumpVoxel,
      [
        { x, y },
        { x, y },
      ],
    ]);

    tree.insert(jumpVoxel);
  };

  raycast = (
    origin: Vector2Like,
    direction: Vector2Like,
    maxDistance: number = 1000
  ): { hit: boolean; point: Vector2Like } => {
    const end = {
      x: origin.x + direction.x * maxDistance,
      y: origin.y + direction.y * maxDistance,
    };
    const cast = throughcastQuadtree(this.vox.getVoxelTree(), origin, end);
    return {
      hit: !!cast.boundary,
      point: cast.boundary ?? end,
    };
  };

  antiRaycast = (
    origin: Vector2Like,
    direction: Vector2Like,
    maxDistance: number = 1000
  ): { hit: boolean; point: Vector2Like } => {
    const end = {
      x: origin.x + direction.x * maxDistance,
      y: origin.y + direction.y * maxDistance,
    };
    const cast = this.vox
      .getVoxelTree()
      .raycast({ origin, direction }, maxDistance);

    return {
      hit: !!cast?.hit,
      point: cast?.point ?? end,
    };
  };

  setAgentSize = (size: number): void => {
    this.vox.agentRadius = size;
  };
  serialize = (): string => {
    return JSON.stringify({
      minVoxelSize: this.minVoxelSize,
      obstacles: (USE_UNICODE_SERIALIZATION
        ? UnicodeRectSerializer
        : RectSerializer
      ).serialize(this.obstacles),
      volumes: (USE_UNICODE_SERIALIZATION
        ? UnicodeRectSerializer
        : RectSerializer
      ).serialize(this.volumes),
      mode: this.bakeMode,
      voxelizer: this.vox.serialize(),
    });
  };
  import = (serialized: string): void => {
    const data = JSON.parse(serialized) as {
      minVoxelSize: number;
      obstacles: string | number[];
      volumes: number[];
      voxelizer: string;
      mode: number;
    };
    this.minVoxelSize = data.minVoxelSize;

    const obs = (
      USE_UNICODE_SERIALIZATION ? UnicodeRectSerializer : RectSerializer
    ).deserialize(data.obstacles as any);
    for (const ob of obs) {
      this.addObstacle(ob);
    }

    const vols = (
      USE_UNICODE_SERIALIZATION ? UnicodeRectSerializer : RectSerializer
    ).deserialize(data.volumes as any);
    for (const v of vols) {
      this.addVolume(v);
    }

    this.vox.deserialize(data.voxelizer);
  };

  getVoxelQuadTree = (): QuadTree<IVoxel> => {
    return this.vox.getVoxelTree();
  };
  getVoxels = (): IVoxel[] => {
    return this.vox.getAllVoxels();
  };

  public setDimensions = (width: number, height: number) => {
    this.width = width;
    this.height = height;
  };

  public setMinVoxelSize = (size: number) => {
    this.minVoxelSize = size;
    this.vox.minVoxelSize = size;
  };

  public setObstacles = (obstacles: Rect[]) => {
    this.obstacles = ([] as Rect[]).concat(obstacles);
  };

  bake = (
    x: number = 0,
    y: number = 0,
    width: number = this.width,
    height: number = this.height,
    padding: number = 0
  ): void => {
    this.rvo ??= ServiceContainer.getService(CastToRVOService);
    this.rvo?.clearObstacles(); // also covers obstacles..
    this.rvo?.registerVolumeList(this.volumes);
    this.rvo?.registerObstacles(this.obstacles);
    console.log('uh', this.obstacles.length);

    console.time('navmesh bake');
    this.vox.voxelize(
      {
        x,
        y,
        width,
        height,
      },
      this.bakeMode === NavMeshAreaMode.IncludeAll
        ? INCLUDE_ALL_VOLUME
        : this.volumes,
      this.obstacles,
      padding
    );
    console.timeEnd('navmesh bake');
  };

  getPath = (start: Vector2Like, end: Vector2Like): Vector2Like[] => {
    const tree = this.vox.getVoxelTree();
    console.time('getpath');
    const path = this.pathfinder.getPath(tree, start, end);
    console.timeEnd('getpath');
    return path;
  };
}

export interface INavMeshService {
  getNavMesh(key?: string, throwIfMissing?: boolean): INavMesh;
}
export class NavMeshService implements IService, INavMeshService {
  private directory: { [key: string]: INavMesh } = {};

  initializeService = async () => {
    const congestionService = USE_CONGESTION_SERVICE
      ? new NavMeshCongestionService()
      : new MockNavMeshCongestionService();

    await ServiceContainer.register(congestionService);
  };
  onServicesReady(): void | Promise<void> {}

  getNavMesh = (
    key: string = 'default',
    throwIfMissing?: boolean
  ): INavMesh => {
    if (this.directory[key]) {
      return this.directory[key];
    }

    if (throwIfMissing) {
      throw new Error(`NavMesh with key ${key} not found`);
    }

    const nvm = new NavMesh(0, 0);
    this.directory[key] = nvm;
    return nvm;
  };
}

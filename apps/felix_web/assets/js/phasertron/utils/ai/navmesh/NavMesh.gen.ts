// This is an autogenerated file, DO NOT EDIT.
// This file was generated from `NavMesh.ts` by executing the `codegen.ts` file.
import type { INavMesh, INavMeshService } from '../navmesh/NavMesh';

export function CastToNavMesh(obj: any): INavMesh | null {
  return obj !== null &&
    obj !== undefined &&
    typeof obj.bake === 'function' &&
    typeof obj.serialize === 'function' &&
    typeof obj.import === 'function' &&
    typeof obj.getPath === 'function' &&
    typeof obj.raycast === 'function' &&
    typeof obj.validatePoint === 'function' &&
    typeof obj.getNearestPoint === 'function' &&
    typeof obj.setMinVoxelSize === 'function' &&
    typeof obj.setAgentSize === 'function' &&
    typeof obj.setObstacles === 'function' &&
    typeof obj.addObstacle === 'function' &&
    typeof obj.setVolumes === 'function' &&
    typeof obj.addVolume === 'function' &&
    typeof obj.setDimensions === 'function' &&
    typeof obj.getVoxels === 'function' &&
    typeof obj.getVoxelQuadTree === 'function' &&
    typeof obj.addJumpPoint === 'function' &&
    typeof obj.setBakeMode === 'function' &&
    typeof obj.getBakeMode === 'function'
    ? obj
    : null;
}

export function CastToNavMeshService(obj: any): INavMeshService | null {
  return obj !== null &&
    obj !== undefined &&
    typeof obj.getNavMesh === 'function'
    ? obj
    : null;
}

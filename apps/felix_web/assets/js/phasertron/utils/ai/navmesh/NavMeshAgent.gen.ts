// This is an autogenerated file, DO NOT EDIT.
// This file was generated from `NavMeshAgent.ts` by executing the `codegen.ts` file.
import type { INavMeshAgent } from '../navmesh/NavMeshAgent';

export function CastToNavMeshAgent(obj: any): INavMeshAgent | null {
  return obj !== null &&
    obj !== undefined &&
    typeof obj.setDestination === 'function' &&
    typeof obj.clearDestination === 'function' &&
    typeof obj.getPosition === 'function' &&
    typeof obj.hasReachedDestination === 'function' &&
    typeof obj.onReachDestination === 'function'
    ? obj
    : null;
}
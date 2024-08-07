// This is an autogenerated file, DO NOT EDIT.
// This file was generated from `RVOService.ts` by executing the `codegen.ts` file.
import type { IRVOService, IRVOAgent } from '../rvo/RVOService';

export function CastToRVOService(obj: any): IRVOService | null {
  return obj !== null &&
    obj !== undefined &&
    typeof obj.initializeService === 'function' &&
    typeof obj.onServicesReady === 'function' &&
    typeof obj.registerAgent === 'function' &&
    typeof obj.clearObstacles === 'function' &&
    typeof obj.registerSingleObstacle === 'function' &&
    typeof obj.registerObstacles === 'function' &&
    typeof obj.registerObstacle === 'function' &&
    typeof obj.registerVolume === 'function' &&
    typeof obj.registerVolumeList === 'function' &&
    typeof obj.registerBoundary === 'function' &&
    typeof obj.moveObstacle === 'function' &&
    typeof obj.getObstacle === 'function' &&
    typeof obj.getAllObstacles === 'function' &&
    typeof obj.getSimulation === 'function' &&
    typeof obj.setAgentPosition === 'function' &&
    typeof obj.update === 'function'
    ? obj
    : null;
}

export function CastToRVOAgent(obj: any): IRVOAgent | null {
  return obj !== null &&
    obj !== undefined &&
    typeof obj.onRegister === 'function' &&
    typeof obj.onUnregister === 'function' &&
    typeof obj.update === 'function' &&
    typeof obj.getPreferredVelocity === 'function' &&
    typeof obj.x === 'number' &&
    typeof obj.y === 'number'
    ? obj
    : null;
}

// This is an autogenerated file, DO NOT EDIT.
// This file was generated from `CameraService.ts` by executing the `codegen.ts` file.
import type { ICameraService } from '../services/CameraService';

export function CastToCameraService(obj: any): ICameraService | null {
  return obj !== null &&
    obj !== undefined &&
    typeof obj.getCamera === 'function' &&
    typeof obj.stepCameraZoom === 'function' &&
    typeof obj.setCameraZoom === 'function' &&
    typeof obj.setTarget === 'function'
    ? obj
    : null;
}

// This is an autogenerated file, DO NOT EDIT.
// This file was generated from `PhaserGameService.ts` by executing the `codegen.ts` file.
import type { IPhaserGameService } from '../services/PhaserGameService';

export function CastToPhaserGameService(obj: any): IPhaserGameService | null {
  return obj !== null && obj !== undefined && typeof obj.getGame === 'function'
    ? obj
    : null;
}
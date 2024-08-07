// This is an autogenerated file, DO NOT EDIT.
// This file was generated from `Heatmap.ts` by executing the `codegen.ts` file.
import type { IHeatMap, IHeatSource } from '../utils/Heatmap';

export function CastToHeatMap(obj: any): IHeatMap | null {
  return obj !== null &&
    obj !== undefined &&
    typeof obj.getMaxObservedValue === 'function' &&
    typeof obj.getMinObservedValue === 'function' &&
    typeof obj.getWidth === 'function' &&
    typeof obj.getHeight === 'function' &&
    typeof obj.getMaxValue === 'function' &&
    typeof obj.getMinValue === 'function' &&
    typeof obj.setValueAt === 'function' &&
    typeof obj.addValueAt === 'function' &&
    typeof obj.getValueAt === 'function' &&
    typeof obj.fixedUpdate === 'function' &&
    typeof obj.getPixels === 'function' &&
    typeof obj.createHeatSource === 'function' &&
    typeof obj.removeHeatSource === 'function'
    ? obj
    : null;
}

export function CastToHeatSource(obj: any): IHeatSource | null {
  return obj !== null &&
    obj !== undefined &&
    typeof obj.getPosition === 'function' &&
    typeof obj.getIntensity === 'function' &&
    typeof obj.getRadius === 'function'
    ? obj
    : null;
}

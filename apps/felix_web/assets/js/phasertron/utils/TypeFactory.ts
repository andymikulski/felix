import { Vector2Like } from './springs/Vector2Spring';

export const Create = {
  vec2: (x?: number, y?: number): Vector2Like => ({ x: x ?? 0, y: y ?? 0 }),
};

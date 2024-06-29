import { Rect } from '../../data-structures/Rect';
import { Vector2Like } from '../../springs/Vector2Spring';

/**
 * Use unicode string characters when serializing data
 * In basic tests, this reduced the serialized output size by 55% (53.8kb to 24kb for ~300 rects)
 * It's also slightly faster on the CPU to deserialize (42ms to 35ms for ~300 rects)
 */
export const USE_UNICODE_SERIALIZATION = true;

// Type used to simplify serialization
type ExtendedRect = Rect & {
  neighbors?: [string, Vector2Like, Vector2Like][];
};
export type SerializedVoxelization = {
  width: number;
  height: number;
  voxels: {
    [id: string]: ExtendedRect;
  };
};

export class RectSerializer {
  static serialize(rects: ExtendedRect[]) {
    let result: number[] = [];
    for (const rect of rects) {
      result.push(
        +rect.x.toFixed(2),
        +rect.y.toFixed(2),
        +rect.width.toFixed(2),
        +rect.height.toFixed(2)
      );
      if (rect.neighbors) {
        result.push(rect.neighbors.length); // Number of neighbors
        for (const [id, pos1, pos2] of rect.neighbors) {
          // Assuming ID is always a single digit for serialization simplicity
          const idNum = parseInt(id, 36); // Converting ID to a single number for compactness
          result.push(
            idNum,
            +pos1.x.toFixed(2),
            +pos1.y.toFixed(2),
            +pos2.x.toFixed(2),
            +pos2.y.toFixed(2)
          );
        }
      } else {
        result.push(0); // No neighbors
      }
    }

    return result;
  }

  static deserialize(data: number[]): ExtendedRect[] {
    const rects: ExtendedRect[] = [];
    for (let i = 0; i < data.length; ) {
      const rect: ExtendedRect = {
        x: data[i++],
        y: data[i++],
        width: data[i++],
        height: data[i++],
      };
      const neighborCount = data[i++];
      if (neighborCount > 0) {
        rect.neighbors = [];
        for (let n = 0; n < neighborCount; n++) {
          const idNum = data[i++];
          const id = idNum.toString(36); // Convert back to string ID
          const pos1: Vector2Like = { x: data[i++], y: data[i++] };
          const pos2: Vector2Like = { x: data[i++], y: data[i++] };
          rect.neighbors.push([id, pos1, pos2]);
        }
      }
      rects.push(rect);
    }
    return rects;
  }
}

export class UnicodeRectSerializer {
  private static serializeToUnicode(values: number[]): string {
    return String.fromCharCode.apply(null, values);
  }

  private static deserializeFromUnicode(data: string): number[] {
    return data.split('').map((x) => x.charCodeAt(0));
  }

  public static serialize(rects: ExtendedRect[]): string {
    const result = RectSerializer.serialize(rects);
    return UnicodeRectSerializer.serializeToUnicode(result);
  }

  public static deserialize(serialized: string): ExtendedRect[] {
    const serializedNums =
      UnicodeRectSerializer.deserializeFromUnicode(serialized);
    return RectSerializer.deserialize(serializedNums);
  }
}

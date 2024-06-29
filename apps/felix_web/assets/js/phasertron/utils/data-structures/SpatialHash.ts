type SpatialDataPoint<T> = {
  x: number;
  y: number;
  width: number;
  height: number;
  data: T;
  cellKeys: number[];
};

export default class SpatialHash<T> {
  private entries: Map<T, SpatialDataPoint<T>> = new Map();
  private grid: Set<SpatialDataPoint<T>>[];
  private cellWidth: number;
  private cellHeight: number;

  constructor(cellWidth: number, cellHeight: number) {
    this.grid = [];
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
  }

  private getGridKey(x: number, y: number): number {
    const cellX = Math.floor(x / this.cellWidth);
    const cellY = Math.floor(y / this.cellHeight);
    return ((cellX + cellY) * (cellX + cellY + 1)) / 2 + cellY;
  }

  public insert(
    entity: T,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Calculate the start and end indices for rows and columns
    const startColumn = Math.max(0, Math.floor(x / this.cellWidth));
    const endColumn = Math.floor((x + width) / this.cellWidth);
    const startRow = Math.max(0, Math.floor(y / this.cellHeight));
    const endRow = Math.floor((y + height) / this.cellHeight);

    let keys: number[] = [];

    // Iterate over the rows and columns that the rect intersects
    for (let col = startColumn; col <= endColumn; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = this.getGridKey(
          col * this.cellWidth,
          row * this.cellHeight
        );
        keys.push(key);
      }
    }

    const dataPoint = { x, y, width, height, data: entity, cellKeys: keys };
    this.entries.set(entity, dataPoint);

    // add to each cell
    for (const k of keys) {
      this.grid[k] ??= new Set();
      this.grid[k].add(dataPoint);
    }
  }

  public update(
    entity: T,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    this.remove(entity);
    this.insert(entity, x, y, width, height);
  }

  public remove(entity: T): void {
    const dataPoint = this.entries.get(entity);
    if (!dataPoint) return;
    for (const k of dataPoint.cellKeys) {
      this.grid[k]?.delete(dataPoint);
      if (this.grid[k]?.size === 0) {
        delete this.grid[k];
      }
    }
    this.entries.delete(entity);
  }

  public query(x: number, y: number, width: number, height: number): T[] {
    const results: Set<T> = new Set();

    // Calculate the start and end indices for rows and columns
    const startColumn = Math.max(0, Math.floor(x / this.cellWidth));
    const endColumn = Math.floor((x + width) / this.cellWidth);
    const startRow = Math.max(0, Math.floor(y / this.cellHeight));
    const endRow = Math.floor((y + height) / this.cellHeight);

    // Calculate the query bounds
    const queryLeft = x;
    const queryRight = x + width;
    const queryTop = y;
    const queryBottom = y + height;

    // Iterate over the rows and columns that the rect intersects
    for (let col = startColumn; col <= endColumn; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = this.getGridKey(
          col * this.cellWidth,
          row * this.cellHeight
        );

        // add all entities that fit within the query bounds to the `results` array
        const candidates = this.grid[key];
        if (!candidates) {
          continue;
        }
        for (const c of candidates) {
          // Calculate the bounds of the candidate entity
          const candidateLeft = c.x;
          const candidateRight = c.x + c.width;
          const candidateTop = c.y;
          const candidateBottom = c.y + c.height;

          // Check for intersection between the query bounds and the candidate bounds
          if (
            candidateLeft <= queryRight &&
            candidateRight >= queryLeft &&
            candidateTop <= queryBottom &&
            candidateBottom >= queryTop
          ) {
            results.add(c.data);
          }
        }
      }
    }

    return Array.from(results.values());
  }

  public getAll(): T[] {
    return Array.from(this.entries.keys());
  }
}

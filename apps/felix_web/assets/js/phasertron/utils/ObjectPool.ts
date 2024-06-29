export interface IObjectPool<T> {
  seed(amount: number, ...args: any[]): void;
  get(...args: any[]): T;
  put(object: T): void;
}

export type ObjectPoolSettings<T> = {
  create: (...args: any[]) => T;
  get: (item: T, ...args: any[]) => T;
  put: (item: T) => T;
};

/**
 * Simple object pool, which allows creating new objects and refurbishing old ones.
 *
 * Usage example:
```
  const pool = new ObjectPool<Thing>({
    // Constructor function for this pool's objects
    create: (x: number, y: number) => {
      const myThing = new Thing(x, y);
      return myThing;
    },
    // Handler fired when an object is removed from the pool (and has already been created)
    get: (thing, x, y) => {
      thing.active = true;

      thing.x = x;
      thing.y = y;

      return thing;
    },
    // Handler fired when an object is placed into the pool
    put: (thing) => {
      thing.active = false;
      return thing;
    },
  });

  // if you want to pre-emptively initialize the pool, use `seed`
  // this line will create 250 pooled instances ready for borrowing!
  pool.seed(250);

  // .. elsewhere in code ..

  const aThing = pool.get(1, 2); // this is using the sahpe of `create` for arguments
  aThing.x === 1;
  aThing.y === 2;
  // when finished with this object, put it back in the pool:
  pool.put(aThing);
```
 */
export default class ObjectPool<T> implements IObjectPool<T> {
  private pool: T[] = [];
  private factory: ObjectPoolSettings<T>;

  public readonly stats = {
    total: 0,
    active: 0,
    stored: 0,
  };

  constructor(options: ObjectPoolSettings<T>) {
    this.factory = options;
  }

  seed = (amount: number, ...args: any[]): void => {
    for (let i = 0; i < amount; i++) {
      this.stats.stored += 1;
      this.stats.total += 1;
      const created = this.factory.create(...args);
      const released = this.factory.put(created);
      this.pool.push(released);
    }
  };

  get = (...args: any[]): T => {
    this.stats.active += 1;
    const next = this.pool.pop() as T | undefined;
    if (!next) {
      this.stats.total += 1;
      return this.factory.create(...args);
    }

    this.stats.stored -= 1;
    this.factory.get(next, ...args);
    return next;
  };

  put = (obj: T): T => {
    this.stats.active -= 1;
    this.stats.stored += 1;

    this.factory.put(obj);
    this.pool.push(obj);
    return obj;
  };
}

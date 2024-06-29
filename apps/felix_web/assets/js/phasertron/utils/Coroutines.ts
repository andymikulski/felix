import { IService } from '../services/ServiceContainer';

export enum CoroutineType {
  RequestIdleCallback,
  RequestAnimationFrame,
  SetTimeout,
}

export interface ICoroutine<T> {
  run(): void;
  reset(): void;
  stop(): void;
  promise: Promise<ICoroutine<T>>;
  value?: T;
  stopped: boolean;
  complete: boolean;
}

export default class Coroutine<T> implements ICoroutine<T> {
  private generator: IterableIterator<T>;
  private lastValue?: T;
  public stopped: boolean = false;
  public complete: boolean = false;
  private resolve: (coroutine: this) => void;
  private reject: (result: { error: Error; coroutine: Coroutine<T> }) => void;
  private promise_: Promise<Coroutine<T>>;

  public timeRunning: number = 0;

  public get promise() {
    return this.promise_;
  }
  public get value() {
    return this.lastValue;
  }

  constructor(private fn: () => IterableIterator<any>) {
    this.generator = fn();
    this.stopped = true;
    this.promise_ = new Promise<this>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    CoroutineManager.Instance.add(this);
  }

  public run = () => {
    if (this.complete) {
      return;
    }
    this.stopped = false;
    const start = Date.now();

    let result;
    try {
      result = this.generator.next();
    } catch (err) {
      this.reject({
        error: err,
        coroutine: this,
      });
    }

    this.lastValue =
      result?.value === undefined ? this.lastValue : result.value;

    if (result?.done) {
      this.complete = true;
      this.resolve(this);
    }

    this.timeRunning += Date.now() - start;
  };

  public reset = () => {
    this.generator = this.fn();
    this.lastValue = undefined;
    this.stopped = false;
    this.complete = false;
    this.promise_ = new Promise<this>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    return this;
  };

  public stop = () => {
    this.stopped = true;
    return this;
  };
}

export interface ICoroutineService {
  start(): void;
  stop(): void;
  add(coroutine: Coroutine<any>): this;
  remove(coroutine: Coroutine<any>): this;
  make<T>(fn: () => IterableIterator<T>, autoStart: boolean): Coroutine<T>;
}

export class CoroutineManager implements IService, ICoroutineService {
  public static Instance: CoroutineManager;
  private readonly rICOptionsObj = {
    timeout: 1000 / 24,
  };

  private coroutines: Coroutine<any>[] = [];
  private maxRunning: number = 5;

  public get count(): number {
    return this.coroutines.length;
  }

  public type: CoroutineType = CoroutineType.RequestIdleCallback;
  private running = true;

  // this should be at MOST 1000 / 60.
  // anything > 60 will look smooth, but will take long.
  // 90 here is arbitrary and found after some testing
  public frameBudgetMs = 1000 / 90;

  initializeService() {
    CoroutineManager.Instance = this;
    this.start();
  }
  onServicesReady(): void {
    // nothing to do
  }

  make<T>(fn: () => IterableIterator<T>, autoStart: boolean): Coroutine<T> {
    var co = new Coroutine<T>(fn);
    this.add(co);
    if (autoStart) {
      co.run();
    }
    return co;
  }

  public start = () => {
    this.running = true;
    this.update();
  };

  public stop = () => {
    this.running = false;
  };

  public add = (coroutine: Coroutine<any>) => {
    this.coroutines.push(coroutine);
    return this;
  };

  public remove = (co: Coroutine<any>) => {
    this.coroutines = this.coroutines.filter((x) => x !== co);
    return this;
  };

  private update = () => {
    if (!this.running) {
      return;
    }

    const start = Date.now();
    let runningCount = 0;
    for (const coroutine of this.coroutines) {
      if (!coroutine.complete && !coroutine.stopped) {
        runningCount++;
        if (runningCount > this.maxRunning) {
          break;
        }
        coroutine.run();

        const cost = Date.now() - start;
        if (cost > this.frameBudgetMs) {
          console.warn(
            `Coroutines exceeded frame budget! (${cost} / ${this.frameBudgetMs})`
          );
          // we have exceeded our time budget; stop updating coroutines
          break;
        }
      }
    }

    // Prune complete coroutines
    this.coroutines = this.coroutines.filter((x) => !x.complete);

    // Queue next update based on the type of coroutine
    switch (this.type) {
      case CoroutineType.RequestIdleCallback:
        requestIdleCallback(this.update, this.rICOptionsObj);
        break;
      case CoroutineType.RequestAnimationFrame:
        requestAnimationFrame(this.update);
        break;
      case CoroutineType.SetTimeout:
        setTimeout(this.update, 1);
        break;
      default:
        throw new Error(`Invalid coroutine type provided: "${this.type}"`);
    }
  };
}

export enum BehaviorStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  ERROR = 'ERROR',
  TERMINATED = 'TERMINATED',
}

export abstract class Behavior {
  public status: BehaviorStatus = BehaviorStatus.PENDING;

  private _isTerminated: boolean = false;
  public get isTerminated(): boolean {
    return this._isTerminated;
  }
  protected set isTerminated(v: boolean) {
    this._isTerminated = v;
  }

  private _isRunning: boolean = false;
  public get isRunning(): boolean {
    return this._isRunning;
  }
  protected set isRunning(v: boolean) {
    this._isRunning = v;
  }

  public onInitialize() {
    this.isTerminated = false;
    this.isRunning = true;
    this.shouldAbort = false;
    this.status = BehaviorStatus.RUNNING;
  }
  // Called _once_ each time the BT is updated.
  public update(): BehaviorStatus {
    if (this.shouldAbort) {
      if (this.status === BehaviorStatus.RUNNING) {
        this.onTerminate();
      }
      return BehaviorStatus.FAILURE;
    }
    return this.status;
  }

  protected shouldAbort: boolean = false;
  public abort() {
    this.shouldAbort = true;
    this.onTerminate();
  }

  // Called immediately after previous `update` which signalled the behavior is done processing
  public onTerminate() {
    this.isRunning = false;
    this.isTerminated = true;
    this.shouldAbort = false;
  }

  public tick() {
    if (this.shouldAbort) {
      if (this.status === BehaviorStatus.RUNNING) {
        this.onTerminate();
      }
      this.status = BehaviorStatus.FAILURE;
      return this.status;
    }

    // Enter handler
    if (this.status !== BehaviorStatus.RUNNING) {
      this.onInitialize();
    }

    // Task update/process
    this.status = this.update();

    // Exit handler
    if (this.status !== BehaviorStatus.RUNNING) {
      this.onTerminate();
    }
    return this.status;
  }
}

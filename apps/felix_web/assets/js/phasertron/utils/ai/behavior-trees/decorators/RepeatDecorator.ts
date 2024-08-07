import { Decorator } from '../base/Decorator';
import { Behavior, BehaviorStatus } from '../base/BehaviorStatus';

// Example decorator (pg 78)
// Repeats a given behavior N times or until first failure

export class RepeatDecorator extends Decorator {
  private repeatCount: number = 0;

  constructor(
    private repeatLimit: number,
    protected child: Behavior
  ) {
    super(child);
  }

  onTerminate = () => {
    super.onTerminate();
    this.repeatCount = 0;
    this.status = BehaviorStatus.TERMINATED;
    if (this.child.status === BehaviorStatus.RUNNING) {
      this.child.abort();
      this.child.onTerminate();
    }
  };

  update = () => {
    const status = this.child.tick();
    if (status === BehaviorStatus.FAILURE) {
      return BehaviorStatus.FAILURE;
    }
    this.repeatCount += 1;
    return this.repeatCount >= this.repeatLimit
      ? BehaviorStatus.SUCCESS
      : BehaviorStatus.RUNNING;
  };
}

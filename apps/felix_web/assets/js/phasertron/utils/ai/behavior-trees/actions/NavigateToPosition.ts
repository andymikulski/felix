import Phaser from 'phaser';
import { Action } from '../base/Action';
import { BehaviorStatus } from '../base/BehaviorStatus';
import NavMeshAgent from '../../navmesh/NavMeshAgent';

export class NavigateToPosition extends Action {
  private targetX: number;
  private targetY: number;
  private didReachTarget = false;

  constructor(
    private self: NavMeshAgent,
    private target: { x: number; y: number } | (() => { x: number; y: number })
  ) {
    super();

    this.calcTargetXY();
  }

  private calcTargetXY() {
    let targetX, targetY;

    if (typeof this.target === 'function') {
      const res = this.target();
      if (!res) {
        targetX = NaN;
        targetY = NaN;
      } else {
        targetX = res.x;
        targetY = res.y;
      }
    } else {
      targetX = this.target.x;
      targetY = this.target.y;
    }

    this.targetX = targetX;
    this.targetY = targetY;
  }

  onInitialize() {
    super.onInitialize();
    this.calcTargetXY();

    console.log('navigate to position - on initialize');

    const dist = Phaser.Math.Distance.Between(
      this.self.x,
      this.self.y,
      this.targetX,
      this.targetY
    );

    if (dist < 5) {
      this.didReachTarget = true;
      return;
    }

    this.self.onReachDestination(() => {
      this.didReachTarget = true;
    });
    this.self.setDestination(this.targetX, this.targetY);
  }

  update() {
    if (this.didReachTarget) {
      return BehaviorStatus.SUCCESS;
    }
    return BehaviorStatus.RUNNING;
  }

  public abort(): void {
    console.log('navigate abort');
    this.self.clearDestination();
    this.didReachTarget = false;
    this.status = BehaviorStatus.FAILURE;
  }

  onTerminate = () => {
    console.log('on terminate...', this);
    super.onTerminate();
    this.self.clearDestination();
    this.didReachTarget = false;
    this.status = BehaviorStatus.TERMINATED;
  };
}

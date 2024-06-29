import { Behavior, BehaviorStatus } from './base/BehaviorStatus';

export class BehaviorTree {
  public enabled: boolean = true;

  constructor(private rootNode: Behavior) {}
  tick() {
    if (!this.enabled) {
      return BehaviorStatus.FAILURE;
    }
    return this.rootNode.tick();
  }
  abort() {
    return this.rootNode.abort?.();
  }

  reset() {
    this.rootNode.abort?.();
    this.rootNode.status = BehaviorStatus.PENDING;
  }

  setRootNode(node: Behavior) {
    this.rootNode?.abort?.();
    this.rootNode = node;
  }
}

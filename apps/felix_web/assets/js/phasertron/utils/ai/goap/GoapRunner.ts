import { BehaviorTree } from '../behavior-trees/BehaviorTree';
import { BehaviorStatus } from '../behavior-trees/base/BehaviorStatus';
import { GoapPlanner } from './GOAP';
import { GoapAction } from './GoapTypes';

export default class GoapRunner {
  private currentAi?: BehaviorTree;
  private currentStepIndex = 0;

  constructor(
    private planner: GoapPlanner,
    private plan: GoapAction[]
  ) {
    this.currentAi = plan[0]?.behaviorTree;
  }

  public setPlan(plan: GoapAction[]) {
    this.plan = plan;
    this.currentStepIndex = 0;
    this.currentAi = plan[0]?.behaviorTree;
  }

  public update() {
    if (!this.currentAi) {
      return;
    }
    console.log('goap runner tick..');
    const res = this.currentAi.tick();
    if (res === BehaviorStatus.SUCCESS) {
      this.currentStepIndex += 1;
      if (this.currentStepIndex >= this.plan.length) {
        console.log('Plan complete!');
        // plan is done!!
        return;
      }

      // reset the currentAi before stepping to the next one for ticking
      this.currentAi?.reset();
      this.currentAi = this.plan[this.currentStepIndex]?.behaviorTree;
      console.log(
        'Moving to next step in plan: ' + this.plan[this.currentStepIndex]?.name
      );
    } else if (res === BehaviorStatus.FAILURE) {
      // plan failed, alert planner that we need a new plan
      console.log('Plan failed! We need a new one!!!');
      this.currentAi?.abort();
      return;
    }
  }

  public abort() {
    this.currentAi?.abort();
    this.currentAi = undefined;
  }
}

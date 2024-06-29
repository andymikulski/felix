import { BehaviorTree } from '../behavior-trees/BehaviorTree';

export type GoapAction = {
  preconditions: { [id: string]: number };
  effects: { [id: string]: number };
  cost: number;
  name: string;
  behaviorTree: BehaviorTree;
};

export type GoapState = { [id: string]: number };

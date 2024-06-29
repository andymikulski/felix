import { GoapAction, GoapState } from './GoapTypes';
import GoapValidator from './GoapActionValidator';
import DoublyLinkedList from '../../data-structures/DoublyLinkedList';
import { BehaviorTree } from '../behavior-trees/BehaviorTree';
import { Selector } from '../behavior-trees/base/Selector';
import GoapRunner from './GoapRunner';
import { AlwaysSucceed } from '../behavior-trees/decorators/AlwaysSucceed';

class GoapUtils {
  public static statesEqual = (a: GoapState, b: GoapState): boolean => {
    for (const key in a) {
      if (a[key] !== b[key]) {
        return false;
      }
    }
    for (const key in b) {
      if (a[key] !== b[key]) {
        return false;
      }
    }
    return true;
  };

  public static calculateEffectsDistance = (
    action: GoapAction,
    state: GoapState
  ): number => {
    let dist = 0;

    // Increase score for extraneous effects not needed by the state
    for (const effectKey in action.effects) {
      const fxVal = action.effects[effectKey];
      if (!(effectKey in state)) {
        dist += Math.abs(fxVal);
      } else {
        if (fxVal < state[effectKey]) {
          dist += Math.abs(fxVal - state[effectKey]);
        }
      }
    }

    // Increase score for missing effects that are needed by the state but not provided by the action
    for (const stateKey in state) {
      if (!(stateKey in action.effects)) {
        dist += Math.abs(state[stateKey]);
      }
    }

    return dist;
  };

  public static actionCanContribute = (
    action: GoapAction,
    state: GoapState
  ): boolean => {
    // an action can contribute to a state if the action's `effects` can contribute to the state
    // this means a positive effect can only contribute if the state has >= the effect's value already
    // and a negative effect can only contribute if the state has <= the effect's value
    for (const key in state) {
      const fxValue = action.effects[key] ?? 0;
      const stateValue = state[key] ?? 0;

      if (fxValue > 0 || fxValue >= stateValue) {
        return true;
      }
      if (fxValue < 0 && stateValue <= fxValue) {
        return true;
      }
    }
    return false;
  };

  public static getBadnessScore = (thread: GoapThread): number => {
    let score = thread.totalCost;
    const numActions = thread.plan.length;

    // prefer plans that are shorter
    score += numActions;

    // prefer plans that perform multiple actions sequentially versus ping-ponging between others
    // i.e. [goFish, goFish, sellFish] is better than [goFish, sellFish, goFish, sellFish]
    for (let i = 0; i < numActions - 1; i++) {
      if (thread.plan[i].name === thread.plan[i + 1].name) {
        score -= 10;
      }
    }

    return score;
  };
}

type GoapThread = {
  plan: GoapAction[];
  state: GoapState;
  totalCost: number;
};

export class GoapPlanner {
  public plan = (
    actions: GoapAction[],
    startState: GoapState,
    goalState: GoapState
  ): GoapAction[] => {
    const queue = new DoublyLinkedList<GoapThread>();
    queue.insertFirst({
      plan: [],
      state: goalState,
      totalCost: 0,
    });

    console.log('startState', startState);
    console.log('goalState', goalState);

    let considerCount = 0;
    let current;
    while ((current = queue.removeFirst())) {
      considerCount++;

      for (const action of actions) {
        // if current state has all of the *effects* for this action, then we can add it to the plan
        if (GoapUtils.actionCanContribute(action, current.state)) {
          const newState = { ...current.state };

          // then we'll add its *preconditions* to the current state and add it to the queue
          for (const key in action.effects) {
            newState[key] ??= 0;
            newState[key] -= action.effects[key];
            newState[key] = Math.max(0, newState[key]);
            if (newState[key] === 0) {
              delete newState[key];
            }
          }
          for (const key in action.preconditions) {
            newState[key] ??= 0;
            newState[key] = Math.max(newState[key], action.preconditions[key]);
            newState[key] = Math.max(0, newState[key]);
            if (newState[key] === 0) {
              delete newState[key];
            }
          }

          const dist = GoapUtils.calculateEffectsDistance(
            action,
            current.state
          );

          const nextThread = {
            plan: [...current.plan, action],
            state: newState,
            totalCost: current.totalCost + dist * 10 + action.cost * 100,
          };

          if (GoapUtils.statesEqual(newState, startState)) {
            console.log('Found plan after ' + considerCount + ' threads!');
            return nextThread.plan.reverse();
          }

          // heuristic
          const head = queue.head?.data;
          if (!head) {
            queue.insertLast(nextThread);
          } else {
            const headScore = GoapUtils.getBadnessScore(head);
            const nextScore = GoapUtils.getBadnessScore(nextThread);

            if (headScore <= nextScore) {
              queue.insertLast(nextThread);
            } else {
              queue.insertFirst(nextThread);
            }
          }
        }
      }
    }

    return [];
  };
}

let actions: GoapAction[] = [
  // collect sticks
  {
    preconditions: {},
    effects: { hasSticks: 1 },
    cost: 1,
    name: 'collectSticks',
    behaviorTree: new BehaviorTree(new AlwaysSucceed(new Selector())),
  },
  // collect rocks
  {
    preconditions: {},
    effects: { hasRocks: 1 },
    cost: 1,
    name: 'collectRocks',
    behaviorTree: new BehaviorTree(new AlwaysSucceed(new Selector())),
  },
  // make an axe from sticks + rocks
  {
    preconditions: { hasSticks: 1, hasRocks: 1 },
    effects: { hasSticks: -1, hasRocks: -1, hasAxe: 1 },
    cost: 1,
    name: 'makeAxe',
    behaviorTree: new BehaviorTree(new AlwaysSucceed(new Selector())),
  },
  // chop wood
  {
    preconditions: { hasAxe: 1 },
    effects: { hasWood: 1 },
    cost: 1,
    name: 'chopWood',
    behaviorTree: new BehaviorTree(new AlwaysSucceed(new Selector())),
  },
];
actions = actions.sort((a, b) => a.cost - b.cost);

const startState = {};
const goalState = { hasWood: 1 };
const planner = new GoapPlanner();
const plan = planner.plan(actions, startState, goalState);

// console.time('everything');

// console.time('create validator');
// const validator = new GoapValidator(actions);
// console.timeEnd('create validator');

// console.time('validateActions');
// validator.validateActions(true);
// console.timeEnd('validateActions');

// console.time('validateStates');
// validator.validateState(startState, true);
// validator.validateState(goalState, true);
// console.timeEnd('validateStates');

// console.time('planning');
// console.timeEnd('planning');
// console.timeEnd('everything');
// console.log('plan', plan);

// // "replay" the action on a new startstate to see if we actually meet the end goal
// const newState: { [id: string]: number } = { ...startState };
// console.log('\n\n\nInitial state', newState, '\tDesired state', goalState);
// for (const action of plan) {
//   for (const key in action.effects) {
//     newState[key] ??= 0;
//     newState[key] += action.effects[key];
//     if (newState[key] === 0) {
//       delete newState[key];
//     }
//   }
//   console.log('Next action: ' + action.name, newState);
// }
// console.log('Final result', newState);

const runner = new GoapRunner(planner, plan);
// console.log('running plan..');
// setInterval(() => {
//   runner.update();
// }, 1000);

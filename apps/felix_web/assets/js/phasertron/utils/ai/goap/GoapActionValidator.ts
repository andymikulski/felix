import { GoapAction, GoapState } from './GoapTypes';

export type ActionGraph = Map<string, Set<GoapAction>>;

export default class GoapValidator {
  graph: ActionGraph;
  keyList = new Set<string>();
  constructor(private actions: GoapAction[]) {
    this.graph = this.buildActionGraph(actions);

    this.generateKeyList(actions);
  }

  public validateState = (
    state: GoapState,
    throwIfInvalid?: boolean
  ): boolean => {
    let invalid: string[] = [];
    for (const key in state) {
      if (!this.keyList.has(key)) {
        invalid.push(key);
      }
    }

    if (throwIfInvalid && invalid.length > 0) {
      throw new Error(
        'Invalid state keys found (are they typed correctly?): \n' +
          invalid.join('\n\t')
      );
    }

    return invalid.length === 0;
  };

  public validateActions = (throwIfInvalid?: boolean): boolean => {
    const unattainableActions = this.findUnattainableActions(this.graph);

    if (throwIfInvalid && unattainableActions.length > 0) {
      throw new Error(
        'Unreachable actions found: \n' + unattainableActions.join('\n\t')
      );
    }

    return unattainableActions.length === 0;
  };

  private generateKeyList(actions: GoapAction[]) {
    const keys = new Set<string>();
    for (const action of actions) {
      for (const key in action.preconditions) {
        keys.add(key);
      }
      for (const key in action.effects) {
        keys.add(key);
      }
    }
    this.keyList = keys;
  }

  private buildActionGraph(actions: GoapAction[]): ActionGraph {
    const graph: ActionGraph = new Map();

    for (const action of actions) {
      const hasPreconditions = Object.keys(action.preconditions).length > 0;
      if (!hasPreconditions) {
        continue;
      }
      if (!graph.has(action.name)) {
        graph.set(action.name, new Set<GoapAction>());
      }
      const edges = graph.get(action.name)!;

      let allPreconditionsSatisfied = true;
      for (const preconditionKey in action.preconditions) {
        let preconditionSatisfied = false;
        for (const otherAction of actions) {
          if (otherAction === action) continue;

          if ((otherAction.effects[preconditionKey] ?? 0) > 0) {
            preconditionSatisfied = true;
            break;
          }
        }
        if (!preconditionSatisfied) {
          allPreconditionsSatisfied = false;
          break;
        }
      }

      if (allPreconditionsSatisfied) {
        for (const otherAction of actions) {
          if (otherAction === action) continue;

          const hasEffect = Object.keys(otherAction.effects).some(
            (effectKey) => action.preconditions[effectKey] > 0
          );
          if (hasEffect) {
            edges.add(otherAction);
          }
        }
      }
    }
    return graph;
  }

  private findUnattainableActions(graph: ActionGraph): string[] {
    // any nodes on the graph with `0` edges are unattainable
    const unattainableActions: string[] = [];

    for (const [action, edges] of graph.entries()) {
      if (edges.size === 0) {
        unattainableActions.push(action);
      }
    }

    return unattainableActions;
  }
}

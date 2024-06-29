import GOAP_Lua from '../../lua/GOAP.lua';
import GOAPValidator_Lua from '../../lua/GOAPValidator.lua';
import GOAPRunner_Lua from '../../lua/GOAPRunner.lua';
import Blackboard_Lua from '../../lua/Blackboard.lua';
import DoublyLinkedList_Lua from '../../lua/DoublyLinkedList.lua';
import BehaviorTrees_Lua from '../../lua/BehaviorTrees.lua';
import LuaVM from '../../lua/LuaVM';
import { throttle } from '../../throttle';
import { EnvironmentMapper } from '../../../scenes/EnvironmentMapper';
import { CastToSceneService } from '../../../services/SceneService.gen';
import ServiceContainer from '../../../services/ServiceContainer';
import { INavMeshAgent } from '../navmesh/NavMeshAgent';

/**
 *
 * 1. Seed Lua
 * 2. Seed local blackboard
 * 3. Setup goap trees (basically actions with preconditions, effects, and their corresponding behavior trees)
 * 4. `planner:plan` is called to determine a plan from the set of predefined actions
 * 5. `runner:update` is called in the update loop to actually execute the plan
 *
 *
 */

export class GOAPTreeAgent {
  vm: LuaVM;
  constructor(
    private entity: any,
    private env: EnvironmentMapper,
    private agent: INavMeshAgent
  ) {
    const vm = new LuaVM();
    this.vm = vm;
    this.seedLua();

    this.seedLocalBlackboard();
    this.seedGoapTrees();
    this.validateGoapTrees();

    // console.log(this.vm.execute<any[]>('return actions'

    this.getPlan();

    const scene = ServiceContainer.getService(CastToSceneService).getScene();
    scene.events.on('update', this.update);
  }

  private seedLua = () => {
    const { vm } = this;
    vm.execute(DoublyLinkedList_Lua);
    vm.execute(GOAP_Lua);
    vm.execute(GOAPValidator_Lua);
    vm.execute(BehaviorTrees_Lua);
    vm.execute(GOAPRunner_Lua);
    vm.execute(Blackboard_Lua);

    vm.registerHook('getWorldState', () => this.getWorldState());
    vm.execute(`
    planner = GoapPlanner:new()
    runner = GoapRunner:new(planner, {}, {})
`);
    vm.registerHook('getAgentComponent', this.getAgentComponentForLua);
  };

  private getAgentComponentForLua = () => {
    return {
      // todo: the first param is always undefined...? and we only send 2 params in, not 3
      setDestination: (_: unknown, x: number, y: number) => {
        return this.agent.setDestination(x, y);
      },
      clearDestination: this.agent.clearDestination,
      getPosition: this.agent.getPosition,
      hasReachedDestination: this.agent.hasReachedDestination,
    };
  };

  private seedLocalBlackboard = () => {
    const { env, vm } = this;
    vm.execute(`
      blackboard = Blackboard:new()
    `);

    const envTags = env.getAll();
    for (const [tag, list] of envTags) {
      for (const obj of list) {
        vm.execute(`
        blackboard:tagObject("${tag}", {
            x = ${obj.x},
            y = ${obj.y}
        })
      `);
      }
    }
  };

  private seedGoapTrees = () => {
    this.vm.execute(`
        actions = {
            {
                preconditions = {},
                effects = { hasSticks = 1 },
                cost = 1,
                name = 'collectSticks',
                behaviorTree = BehaviorTree:new(
                    Sequence:new(
                      LoggingAction:new("Looking for sticks.."),
                        BBFindClosestTagged:new(blackboard, "sticks", "pickup_sticks"),
                        NavigateToBBEntry:new(blackboard, "pickup_sticks"),
                        LoggingAction:new("Picking up sticks.."),
                        Wait:new(500),
                        LoggingAction:new("Sticks acquired!")
                    )
                )
              },
              {
                preconditions = {},
                effects = { hasRocks = 1 },
                cost = 1,
                name = 'collectRocks',
                behaviorTree = BehaviorTree:new(
                    Sequence:new(
                      LoggingAction:new("Looking for rock.."),
                        BBFindClosestTagged:new(blackboard, "rock", "pickup_rock"),
                        NavigateToBBEntry:new(blackboard, "pickup_rock"),
                        LoggingAction:new("Picking up rock.."),
                        Wait:new(500),
                        LoggingAction:new("Rock acquired!")
                    )
                )
              },
              {
                preconditions = { hasSticks = 1, hasRocks = 1 },
                effects = { hasSticks = -1, hasRocks = -1, hasAxe = 1 },
                cost = 1,
                name = 'makeAxe',
                behaviorTree = BehaviorTree:new(
                    Sequence:new(
                        LoggingAction:new("Combining rocks and sticks.."),
                        Wait:new(1000),
                        LoggingAction:new("Done! Made axe.")
                    )
                )
              },
              {
                preconditions = { hasAxe = 1 },
                effects = { hasWood = 1 },
                cost = 1,
                name = 'chopWood',
                behaviorTree = BehaviorTree:new(
                    Sequence:new(
                        BBFindClosestTagged:new(blackboard, "tree", "chopped_tree"),
                        NavigateToBBEntry:new(blackboard, "chopped_tree"),
                        LoggingAction:new("Chopping tree..."),
                        Wait:new(1500),
                        LoggingAction:new("Chopped!")
                    )
                )
              },
        }
    `);
  };

  private validateGoapTrees = () => {
    this.vm.execute(`
    local validator = GoapValidator:new(actions)
    validator:validateActions(true)
`);
  };

  private getWorldState = () => {
    return {};
  };

  private getPlan = () => {
    const { vm } = this;
    vm.execute(`
    startState = getWorldState()
    goalState = {hasWood = 1}
    plan = planner:plan(actions, startState, goalState)

    if plan then
        print('Plan found:')
        for i, action in ipairs(plan) do
            print(i .. ". " .. action.name)
        end
        runner:setPlan(plan)
        runner:setWorldState(startState)
    end
    `);
  };

  public update = throttle(() => {
    this.vm.execute('runner:update()');
  }, 1000 / 1); // This can be faster but for now it's fine
}

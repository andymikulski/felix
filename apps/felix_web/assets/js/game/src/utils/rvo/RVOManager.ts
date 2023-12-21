import { CastToPhaserGameService } from '../../services/PhaserGameService.gen';
import ServiceContainer, { IService } from '../../services/ServiceContainer';
import { Rect } from '../data-structures/Rect';
import { Vector2Like } from '../springs/Vector2Spring';
import { Obstacle } from './Obstacle';
import { RVOSimulation } from './RVOSimulator';
import { Vector2 } from './Vector2';

export interface IRVOService extends IService {
  registerAgent(
    agent: IRVOAgent,
    overrides?: {
      maxSpeed: number;
    }
  ): number;
  clearObstacles(): void;
  registerSingleObstacle(rect: Rect): number;
  registerObstacles(list: Rect[]): number[];
  moveObstacle(id: number, xAdjustment: number, yAdjust: number): void;
  getObstacle(id: number): Obstacle | null;

  getAllObstacles(): Obstacle[];
}

export interface IRVOAgent {
  update(pos: Vector2Like, time: number, deltaMs: number): void;
  getPreferredVelocity(): Vector2Like;
  x: number;
  y: number;
}

export class RVOService implements IRVOService {
  public agentList: {
    [id: number | string]: IRVOAgent;
  } = {};
  private agentCount: number = 0;
  private rvo = RVOSimulation.Instance;

  constructor() {
    this.rvo.setAgentDefaults(50, 12, 5, 3, 15, 125, Vector2.zero);
    ServiceContainer.register(this);
  }
  getAllObstacles(): Obstacle[] {
    return this.rvo.obstacles_;
  }
  registerSingleObstacle(rect: Rect): number {
    const id = this.rvo.addObstacle([
      new Vector2(rect.x, rect.y),
      new Vector2(rect.x + rect.width, rect.y),
      new Vector2(rect.x + rect.width, rect.y + rect.height),
      new Vector2(rect.x, rect.y + rect.height),
    ]);
    this.rvo.processObstacles();
    return id;
  }
  moveObstacle(id: number, xAdjustment: number, yAdjust: number): void {
    return this.rvo.moveObstacle(id, xAdjustment, yAdjust);
  }
  getObstacle(id: number): Obstacle | null {
    return this.rvo.getObstacle(id);
  }

  initializeService(): void | Promise<void> {}

  onServicesReady = () => {
    const game = ServiceContainer.getService(CastToPhaserGameService).getGame();
    game.events.on(Phaser.Core.Events.STEP, this.update);
  };

  public registerAgent = (
    agent: IRVOAgent,
    overrides?: {
      maxSpeed: number;
    }
  ): number => {
    const id = this.rvo.addAgent(new Vector2(agent.x, agent.y));
    if (id === -1) {
      throw new Error('Error adding agent to RVO.');
    }
    this.agentList[id] = agent;
    this.agentCount += 1;

    if (overrides?.maxSpeed) {
      this.rvo.setAgentMaxSpeed(id, overrides.maxSpeed);
    }

    // Update max leaf size
    this.rvo.kdTree_.MAX_LEAF_SIZE = this.agentCount;

    this.rvo.SetNumWorkers(1);
    return id;
  };

  public clearObstacles = () => {
    this.rvo.ClearObstacles();
  };

  public registerObstacles = (list: Rect[]): number[] => {
    const results = list.map((rect) => {
      return this.rvo.addObstacle([
        new Vector2(rect.x, rect.y),
        new Vector2(rect.x + rect.width, rect.y),
        new Vector2(rect.x + rect.width, rect.y + rect.height),
        new Vector2(rect.x, rect.y + rect.height),
      ]);
    });

    this.rvo.processObstacles();

    return results;
  };

  public update = (time: number, deltaMs: number) => {
    for (const strAgentId in this.agentList) {
      const id = parseFloat(strAgentId);
      const agent = this.agentList[id];
      const pos = this.rvo.getAgentPosition(id);

      // Step the agent - this updates its pathfinding
      agent.update(pos, time, deltaMs);

      // Update the simulator's agent
      const dir = agent.getPreferredVelocity();
      this.rvo.setAgentPrefVelocity(id, new Vector2(dir.x, dir.y));
    }

    this.rvo.setTimeStep(deltaMs / 1000);
    this.rvo.doStep();
  };
}

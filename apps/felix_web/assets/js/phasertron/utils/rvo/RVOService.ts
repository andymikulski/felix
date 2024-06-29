import { CastToPhaserGameService } from '../../services/PhaserGameService.gen';
import { CastToSceneService } from '../../services/SceneService.gen';
import ServiceContainer, { IService } from '../../services/ServiceContainer';
import { Create } from '../TypeFactory';
import { Rect } from '../data-structures/Rect';
import { Vector2Like } from '../springs/Vector2Spring';
import { Obstacle } from './Obstacle';
import { RVOSimulation } from './RVOSimulator';
import { Vector2 } from './Vector2';

/**
 * Toggles the automatic time horizon adjustments for agents based on their velocity.
 * This works great for a low number of agents, but for crowds it can cause traffic jams and general
 * unrealistic behavior.
 */
const USE_AUTOMATIC_HORIZON = false;

export interface IRVOService extends IService {
  registerAgent(
    agent: IRVOAgent,
    overrides?: {
      maxSpeed?: number;
      radius?: number;
    }
  ): number;
  clearObstacles(): void;

  registerSingleObstacle(rect: Rect): number;
  registerObstacles(list: Rect[]): number[];
  registerObstacle(obstacle: Rect): number;

  registerVolume(volume: Rect, forceProcess?: boolean): number;
  registerVolumeList(list: Rect[]): number[];

  registerBoundary(list: Vector2Like[]): number;
  moveObstacle(id: number, xAdjustment: number, yAdjust: number): void;
  getObstacle(id: number): Obstacle | null;

  getAllObstacles(): Obstacle[];

  getSimulation(): RVOSimulation;

  setAgentPosition(id: number, pos: Vector2Like): void;

  update(time: number, deltaMs: number): void;
}

export interface IRVOAgent {
  onRegister(id: number, rvo: RVOSimulation): void;
  onUnregister(id: number, rvo: RVOSimulation): void;
  updateFromRVO(pos: Vector2Like, time: number, deltaMs: number): void;
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

  // useManualUpdate toggles the 'update' event hook. this allows users
  // to call `update` themselves if they want to step the simulation manually.
  private _useManualUpdate = false;
  get useManualUpdate(): boolean {
    return this._useManualUpdate;
  }
  set useManualUpdate(value: boolean) {
    if (value === this._useManualUpdate) {
      return;
    }

    const game = ServiceContainer.getService(CastToPhaserGameService).getGame();

    if (value && !this._useManualUpdate) {
      game.events.off(Phaser.Core.Events.STEP, this.update);
    } else if (!value && this._useManualUpdate) {
      game.events.on(Phaser.Core.Events.STEP, this.update);
    }
    this._useManualUpdate = value;
  }

  constructor() {
    this.rvo.setAgentDefaults(128, 32, 1.5 /*4*/, 0.1, 16, 100, Vector2.zero);
    ServiceContainer.register(this);
  }
  getSimulation = (): RVOSimulation => {
    return this.rvo;
  };
  setAgentPosition(id: number, pos: Vector2Like): void {
    this.rvo.setAgentPosition(id, Create.vec2(pos.x, pos.y));
  }
  getAllObstacles(): Obstacle[] {
    return this.rvo.obstacles_;
  }
  registerSingleObstacle(rect: Rect): number {
    const id = this.rvo.addObstacle([
      Create.vec2(rect.x, rect.y),
      Create.vec2(rect.x + rect.width, rect.y),
      Create.vec2(rect.x + rect.width, rect.y + rect.height),
      Create.vec2(rect.x, rect.y + rect.height),
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
    if (this.useManualUpdate) {
      return;
    }
    const game = ServiceContainer.getService(CastToPhaserGameService).getGame();
    game.events.on(Phaser.Core.Events.STEP, this.update);
  };

  public registerAgent = (
    agent: IRVOAgent,
    overrides?: {
      maxSpeed?: number;
      radius?: number;
    }
  ): number => {
    const id = this.rvo.addAgent(Create.vec2(agent.x, agent.y), {
      radius_: 16 + (Math.random() > 0.5 ? -1 : 1) * Math.random(),
    });
    if (id === -1) {
      throw new Error('Error adding agent to RVO.');
    }
    this.agentList[id] = agent;
    this.agentCount += 1;

    if (overrides?.maxSpeed !== undefined) {
      this.rvo.setAgentMaxSpeed(id, overrides.maxSpeed);
    }
    if (overrides?.radius !== undefined) {
      this.rvo.setAgentRadius(id, overrides.radius);
    }

    // Update max leaf size
    this.rvo.kdTree_.MAX_LEAF_SIZE = this.agentCount;

    this.rvo.SetNumWorkers(1);

    agent.onRegister(id, this.rvo);

    return id;
  };

  public clearObstacles = () => {
    this.rvo.ClearObstacles();
  };

  public registerBoundary = (list: Vector2Like[]): number => {
    return this.rvo.addObstacle(list.map((v) => Create.vec2(v.x, v.y)));
  };

  public registerObstacles = (list: Rect[]): number[] => {
    const results = list.map((x) => this.registerObstacle(x, false));
    this.rvo.processObstacles();
    return results;
  };

  public registerObstacle = (
    obstacle: Rect,
    forceProcess: boolean = false
  ): number => {
    const id = this.rvo.addObstacle([
      Create.vec2(obstacle.x, obstacle.y),
      Create.vec2(obstacle.x + obstacle.width, obstacle.y),
      Create.vec2(obstacle.x + obstacle.width, obstacle.y + obstacle.height),
      Create.vec2(obstacle.x, obstacle.y + obstacle.height),
    ]);

    if (forceProcess) {
      this.rvo.processObstacles();
    }

    return id;
  };

  public registerVolumeList = (list: Rect[]): number[] => {
    const results = list.map((x) => this.registerVolume(x, false));
    this.rvo.processObstacles();
    return results;
  };

  public registerVolume = (
    obstacle: Rect,
    forceProcess: boolean = false
  ): number => {
    const id = this.rvo.addObstacle([
      Create.vec2(obstacle.x, obstacle.y),
      Create.vec2(obstacle.x, obstacle.y + obstacle.height),
      Create.vec2(obstacle.x + obstacle.width, obstacle.y + obstacle.height),
      Create.vec2(obstacle.x + obstacle.width, obstacle.y),
      Create.vec2(obstacle.x, obstacle.y),
    ]);

    if (forceProcess) {
      this.rvo.processObstacles();
    }

    return id;
  };

  public update = (time: number, deltaMs: number) => {
    for (const strAgentId in this.agentList) {
      const id = parseFloat(strAgentId);
      const agent = this.agentList[id];
      const pos = this.rvo.getAgentPosition(id);

      // Step the agent - this updates its pathfinding
      agent.updateFromRVO(pos, time, deltaMs);

      // Update the simulator's agent
      const dir = agent.getPreferredVelocity();
      const prefVel = Create.vec2(dir.x, dir.y);
      this.rvo.setAgentPrefVelocity(id, prefVel);

      if (USE_AUTOMATIC_HORIZON) {
        const actualVel = Vector2.magnitude(this.rvo.getAgentVelocity(id));
        const newTimeHorizon = (1 - 1 / actualVel) * 4;
        this.rvo.setAgentTimeHorizon(id, newTimeHorizon);
      }
    }

    this.rvo.setTimeStep(deltaMs / 1000);
    this.rvo.doStep();
  };
}

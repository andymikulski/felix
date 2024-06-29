import { CastToPhaserGameService } from '../../services/PhaserGameService.gen';
import ServiceContainer, { IService } from '../../services/ServiceContainer';
import { Vector2Like } from '../springs/Vector2Spring';
import { throttle } from '../throttle';
import { CastToTriggerService } from './Triggers.gen';

export interface ITriggerService extends IService {
  registerTrigger(trigger: ITrigger): void;
  update(time: number, deltaMs: number): void;
}

export class TriggerService implements ITriggerService {
  private activeTriggers: ITrigger[] = [];
  private overlappingTriggers: Map<ITrigger, Set<ITrigger>> = new Map();

  initializeService(): void {}

  onServicesReady = () => {
    const game = ServiceContainer.getService(CastToPhaserGameService).getGame();
    game.events.on(Phaser.Core.Events.STEP, this.update);
    this.activeTriggers = [];
  };

  public registerTrigger(trigger: ITrigger) {
    this.activeTriggers.push(trigger);
  }

  public update = throttle((time: number, deltaMs: number) => {
    this.checkOverlaps();
  }, 1000 / 20);

  private checkOverlaps = () => {
    const newOverlaps: Map<ITrigger, Set<ITrigger>> = new Map();

    const actives = this.activeTriggers;

    for (let i = 0; i < actives.length; i++) {
      const trigger = actives[i];
      const overlappingTriggers = new Set<ITrigger>();

      // TODO: quad tree query this.....
      const candidates = actives;

      // check for circular overlaps against all other triggers
      for (let j = 0; j < candidates.length; j++) {
        const other = candidates[j];
        if (other === trigger) continue;
        const distance = Phaser.Math.Distance.Between(
          trigger.getPosition().x,
          trigger.getPosition().y,
          other.getPosition().x,
          other.getPosition().y
        );
        if (distance <= trigger.getRadius() + other.getRadius()) {
          overlappingTriggers.add(other);
        }
      }
      newOverlaps.set(trigger, overlappingTriggers);
    }

    // check for new overlaps
    for (let i = 0; i < actives.length; i++) {
      const trigger = actives[i];
      const newOverlappingTriggers = newOverlaps.get(trigger) ?? new Set();
      const oldOverlappingTriggers = this.overlappingTriggers.get(trigger);
      if (oldOverlappingTriggers && !!trigger.handleTriggerExit) {
        for (const oldOverlappingTrigger of oldOverlappingTriggers) {
          if (!newOverlappingTriggers.has(oldOverlappingTrigger)) {
            trigger.handleTriggerExit(oldOverlappingTrigger);
          }
        }
      }
      if (!!trigger.handleTriggerEnter) {
        for (const newOverlappingTrigger of newOverlappingTriggers) {
          if (
            !oldOverlappingTriggers ||
            !oldOverlappingTriggers.has(newOverlappingTrigger)
          ) {
            trigger.handleTriggerEnter(newOverlappingTrigger);
          }
        }
      }
    }

    this.overlappingTriggers = newOverlaps;
  };
}

export interface ITrigger {
  getRadius(): number;
  getPosition(): Vector2Like;
  handleTriggerEnter?(other: ITrigger): void;
  handleTriggerExit?(other: ITrigger): void;
}

export type TriggerEventHandler = (other: ITrigger) => void;

export class CircleTrigger implements ITrigger {
  private id: string;
  private radius: number;
  private position: Vector2Like;

  constructor(
    radius: number,
    position: Vector2Like,
    private onEnterCallback?: TriggerEventHandler,
    private onExitCallback?: TriggerEventHandler
  ) {
    this.id = Math.random().toString(32).slice(2);
    this.radius = radius;
    this.position = position;

    const triggerService = ServiceContainer.getService(CastToTriggerService);
    triggerService.registerTrigger(this);
  }

  get x(): number {
    return this.position.x - this.radius;
  }
  get y(): number {
    return this.position.y - this.radius;
  }
  get width(): number {
    return this.radius * 2;
  }
  get height(): number {
    return this.radius * 2;
  }

  setRadius(val: number): void {
    this.radius = val;
  }
  setPosition(pos: Vector2Like): void {
    this.position = {
      x: pos.x,
      y: pos.y,
    };
  }
  handleTriggerEnter(other: ITrigger): void {
    this.onEnterCallback?.(other);
  }
  handleTriggerExit(other: ITrigger): void {
    this.onExitCallback?.(other);
  }

  getId(): string {
    return this.id;
  }

  getRadius(): number {
    return this.radius;
  }

  getPosition(): Vector2Like {
    return this.position;
  }
}

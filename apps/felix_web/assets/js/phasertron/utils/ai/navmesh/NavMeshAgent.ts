import ServiceContainer from '../../../services/ServiceContainer';
import { IHeatSource } from '../../Heatmap';
import { Create } from '../../TypeFactory';
import { IRVOAgent, IRVOService } from '../../rvo/RVOService';
import { CastToRVOService } from '../../rvo/RVOService.gen';
import { RVOSimulation } from '../../rvo/RVOSimulator';
import { Vector2 } from '../../rvo/Vector2';
import FloatSpring from '../../springs/FloatSpring';
import Vector2Spring, { Vector2Like } from '../../springs/Vector2Spring';
import { INavMesh } from './NavMesh';
import { INavMeshCongestionService } from './NavMeshCongestionService';
import { CastToNavMeshCongestionService } from './NavMeshCongestionService.gen';

const USE_RAYCAST_PREDICTION = false;
const USE_RVO_FOR_UPDATES = true;
const REPATH_EVERY_MS = 100_000;
const DRAW_DEBUG_DESTINATION = false;
const DRAW_DEBUG_PATH = false;
const APPLY_CONGESTION = false;

const NORMAL_RANGE_THRESHOLD = 16;
const USE_NORMAL_CHECKS = true;
const DRAW_DEBUG_WAYPOINT_NORMALS = false && USE_NORMAL_CHECKS;

const TURN_RATE_DEGREES_PER_SECOND = 360;

export function vec2magnitude(v: Vector2Like) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vec2normalize(v: Vector2Like) {
  const magnitude = vec2magnitude(v) + 1e-4;
  return { x: v.x / magnitude, y: v.y / magnitude };
}

export interface INavMeshAgent {
  setDestination(x: number, y: number): void;
  clearDestination(): void;
  getPosition(): { x: number; y: number };
  hasReachedDestination(): boolean;
  setAvoidanceMask(mask: number): void;
  onReachDestination(callback: Function): void;
  setAlignmentMode(mode: NavMeshAgentAlignmentMode): void;
  setRequiredForwardAlignment(amount: number): void;
  setImmobile(immobile: boolean): void;
}

export enum NavMeshAgentAlignmentMode {
  None,
  CurrentVelocity,
  DesiredVelocity,
  NextWaypoint,
  FinalWaypoint,
  Target,
}

export default class NavMeshAgent
  implements INavMeshAgent, IRVOAgent, IHeatSource
{
  private hasPath = false;
  private waypoints: Vector2Like[] = [];
  private scene: Phaser.Scene;

  private speed = 50;
  private callbacks: Function[] = [];

  gfx: Phaser.GameObjects.Graphics;
  rvo: IRVOService;
  rvoId: any;
  get x(): number {
    return this.entity.x;
  }
  get y(): number {
    return this.entity.y;
  }

  private desiredVelocity = new Vector2Spring(0.1, 1);
  private raycastLength = new FloatSpring(0.25, 1);
  private target?: Vector2Like;

  /**
   * The dot product required to consider the agent as facing the correct direction.
   * This is used to scale the desired velocity based on the agent's current rotation.
   * A reasonable value is 0.8 (i.e. the agent must be facing within 36 degrees of the desired direction)
   * Set this to -1 to disable the requirement.
   */
  private requiredForwardAlignment = -1;

  private _congestionManager: INavMeshCongestionService;
  public get congestionManager(): INavMeshCongestionService {
    this._congestionManager ??= ServiceContainer.getService(
      CastToNavMeshCongestionService
    );
    return this._congestionManager;
  }

  constructor(
    public navMesh: INavMesh,
    public entity: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  ) {
    this.scene = this.entity.scene;

    this.entity.setOrigin(0.5, 0.5);
    this.entity.setDepth(10000000);

    if (USE_RVO_FOR_UPDATES) {
      this.rvo = ServiceContainer.getService(CastToRVOService);
      this.rvoId = this.rvo.registerAgent(this, {
        maxSpeed: this.speed,
        radius: 8,
      });
    } else {
      this.scene.events.on('update', this.clockUpdate);
    }
  }
  setAlignmentMode(mode: NavMeshAgentAlignmentMode): void {
    this.alignmentMode = mode;
  }

  setImmobile(immobile: boolean): void {
    this.rvo
      .getSimulation()
      .setAgentMaxSpeed(this.rvoId, immobile ? 0 : this.speed);
  }

  setMaxSpeed(maxSpeed: number) {
    this.speed = maxSpeed;
    this.rvo.getSimulation().setAgentMaxSpeed(this.rvoId, maxSpeed);
  }

  /**
   * Sets the angle required for forward movement to begin.
   * Basically, if you want to require the agent to only move when it is facing its target direciton,
   * you can use this to dictate the angle at which the agent is considered "facing" the target.
   *
   * Set this to -1 to disable the requirement entirely.
   * It's generally recommended to set this greater than 10 degrees to ensure agents do not stop
   * to readjust prior to moving towards their next waypoint.
   */
  setRequiredForwardAlignment(degrees: number): void {
    // convert degrees to dot product value
    const amount = Math.cos((degrees * Math.PI) / 180);
    this.requiredForwardAlignment = amount;
  }

  /**
   * Any other agents which overlap with this mask will be considered in collision avoidance.
   *
   * Usage: `setAvoidanceMask(1 << group)`, where `group` is an integer in the range [1, 31]
   *
   * For multiple groups, you can do:
   * `setAvoidanceMask((1 << group1) | (1 << group2) | (1 << group3))` etc.
   *
   * For all groups, use the value `0` for the mask: `setAvoidanceMask(0)`
   * For NO groups (i.e. no collision avoidance calculations are applied), use `-1`: `setAvoidanceMask(-1)`
   *
   * A good way to manage groups is to use an enum:
   * ```
   * enum MyGroups {
   *   Red = 1 << 1,
   *   Green = 1 << 2,
   *   Blue = 1 << 3,
   * }
   * // Mask that matches the red and blue groups
   * agent.setAvoidanceMask(MyGroups.Red | MyGroups.Blue);
   * ```
   */
  setAvoidanceMask(mask: number | ((currentMask: number) => number)): void {
    if (typeof mask === 'function') {
      const maskFn = mask as (currentMask: number) => number;
      // Get the current mask and apply the function to it
      const currentMask = this.rvo
        .getSimulation()
        .getAgentAvoidanceMask(this.rvoId);
      const newMask = maskFn(currentMask);
      this.rvo.getSimulation().setAgentAvoidanceMask(this.rvoId, newMask);
    } else {
      // Set the mask directly
      this.rvo.getSimulation().setAgentAvoidanceMask(this.rvoId, mask);
    }
  }

  setAvoidanceLayer(layer: number, andSetMask: boolean = false): void {
    this.rvo.getSimulation().setAgentAvoidanceLayer(this.rvoId, layer);
    if (andSetMask) {
      this.setAvoidanceMask(layer);
    }
  }
  onRegister(id: number, rvo: RVOSimulation): void {}
  onUnregister(id: number, rvo: RVOSimulation): void {}

  private reachedDest = false;
  hasReachedDestination = () => {
    return this.reachedDest;
  };

  getDestination = (): { x: number; y: number } | undefined => {
    return this.target;
  };
  clearDestination = (): void => {
    this.waypoints = [];
    this.desiredVelocity.setGoal({ x: 0, y: 0 });
    this.hasPath = false;
  };
  public getPosition = (): { x: number; y: number } => {
    return { x: this.entity.x, y: this.entity.y };
  };
  public getIntensity = (): number => {
    return 255;
  };
  public getRadius = (): number => {
    return 5;
  };
  public getPreferredVelocity = (): Vector2Like => {
    // Compare the current rotation to our desired velocity and scale it by the dot product.
    // This will ensure the agent only moves forward when it's facing towards the proper direction.

    let currentRotation = Create.vec2(
      Math.cos(this.entity.rotation),
      Math.sin(this.entity.rotation)
    );
    currentRotation = vec2normalize(currentRotation);

    let desiredRotation = Create.vec2(
      Math.cos(this.targetRotation),
      Math.sin(this.targetRotation)
    );
    desiredRotation = vec2normalize(desiredRotation);
    const desiredVel = this.desiredVelocity.Value;

    let dot = Vector2.dot(currentRotation, desiredRotation);
    dot = Math.max(dot, 0);
    // We want to scale the dot product so that it only really starts to matter when the product is >= the constant
    // This provides granular control over when the 'forward' movement begins.
    const scaledDot =
      (dot - this.requiredForwardAlignment) /
      (1 - this.requiredForwardAlignment + 1e-4);

    // Ensure the dot product is at least 0
    dot = Math.max(scaledDot, 0);

    const scaled = Vector2.mul(dot, desiredVel);
    return scaled;
  };

  public setDestination = (x: number, y: number) => {
    this.reachedDest = false;
    if (DRAW_DEBUG_DESTINATION) {
      this.scene.add.circle(x, y, 5, 0xff0000);
    }

    const path = this.navMesh.getPath(this.entity, { x, y });

    if (APPLY_CONGESTION) {
      this.congestionManager.addHeatSource(this);

      // Update the congestion because we're gonna be using this path
      // (this will entice future paths to avoid overlapping)
      for (let i = 0; i < path.length - 1; i++) {
        this.congestionManager.setCongestionLine(
          path[i].x,
          path[i].y,
          path[i + 1].x,
          path[i + 1].y,
          1000
        );

        if (DRAW_DEBUG_PATH) {
          this.scene.add
            .line(
              0,
              0,
              path[i].x,
              path[i].y,
              path[i + 1].x,
              path[i + 1].y,
              0xff0000,
              0.2
            )
            .setLineWidth(2)
            .setOrigin(1000)
            .setOrigin(0, 0);
        }
      }
    }

    this.waypoints = path ?? this.waypoints;
    this.hasPath = this.waypoints.length > 0;
    this.target = { x, y };
    this.lastRepath = Date.now();
  };

  public onReachDestination = (callback: Function) => {
    this.callbacks.push(callback);
  };

  private triggerCallbacks = () => {
    for (let i = 0; i < this.callbacks.length; i++) {
      this.callbacks[i]();
    }
    this.callbacks = [];
  };

  // non-RVO update
  public clockUpdate = (time: number, delta: number) => {
    this.step(delta);
    this.entity.body.setVelocity(
      this.desiredVelocity.Value.x,
      this.desiredVelocity.Value.y
    );
  };

  // RVO update
  public updateFromRVO = (
    position: Vector2Like,
    time: number,
    delta: number
  ) => {
    this.entity.body.reset(position.x, position.y);
    this.step(delta);
  };

  private lastRepath = Date.now();

  private drawDebugWaypointStuff = () => {
    if (!DRAW_DEBUG_WAYPOINT_NORMALS) {
      return;
    }

    for (let i = 0; i < this.waypoints.length - 1; i++) {
      var curr = this.waypoints[i];
      var next = this.waypoints[i + 1];
      if (!next) {
        continue;
      }
      var dir: Vector2Like = { x: next.x - curr.x, y: next.y - curr.y };

      this.gfx.lineStyle(1, 0x0000ff, 1);
      // use this.gfx to draw the line perpendicular to `dir` at `curr`
      let normal = { x: -dir.y, y: dir.x };
      let mag = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
      normal.x /= mag + 1e-4;
      normal.y /= mag + 1e-4;

      let normalLength = 100;
      let normalStart = {
        x: curr.x - normal.x * (normalLength * 0.5),
        y: curr.y - normal.y * (normalLength * 0.5),
      };
      let normalEnd = {
        x: curr.x + normal.x * (normalLength * 0.5),
        y: curr.y + normal.y * (normalLength * 0.5),
      };
      this.gfx.strokePoints([
        // { x: curr.x, y: curr.y },
        { x: normalStart.x, y: normalStart.y },
        { x: normalEnd.x, y: normalEnd.y },
      ]);

      // draw 32-pixel circle to signify proximity check
      // this.gfx.fillStyle(0x0000ff, 0.1);
      // this.gfx.fillCircle(curr.x, curr.y, 32);

      // draw a 32-pixel half-arc to denote the area where the agent is considered "past" the waypoint
      this.gfx.lineStyle(1, 0x0000ff, 0.1);
      this.gfx.beginPath();
      let startAngle = Math.atan2(normal.y, normal.x);
      let endAngle = startAngle + Math.PI;
      this.gfx.arc(
        curr.x,
        curr.y,
        NORMAL_RANGE_THRESHOLD,
        startAngle,
        endAngle,
        true
      );
      this.gfx.closePath();
      this.gfx.fill();
    }
  };

  private targetRotation = 0;
  private alignmentMode = NavMeshAgentAlignmentMode.None;

  private step = (delta: number) => {
    const currentVel = this.rvo.getSimulation().getAgentVelocity(this.rvoId);
    this.desiredVelocity.update(delta / 1000);

    // draw a line for the velocity
    this.gfx ??= this.scene.add.graphics();
    this.gfx.clear();

    this.drawDebugWaypointStuff();

    // this.entity.setFlipX(this.entity.body.velocity.x < 0);

    let angle = this.entity.rotation;

    switch (this.alignmentMode) {
      default:
        throw new Error(
          'Unrecognized alignment mode "' + this.alignmentMode + '"'
        );
      case NavMeshAgentAlignmentMode.None:
        break;
      case NavMeshAgentAlignmentMode.CurrentVelocity:
        angle = Math.atan2(currentVel.y, currentVel.x);
        break;
      case NavMeshAgentAlignmentMode.DesiredVelocity:
        angle = Math.atan2(
          this.desiredVelocity.Value.y,
          this.desiredVelocity.Value.x
        );
        break;
      case NavMeshAgentAlignmentMode.NextWaypoint:
        if (this.waypoints.length > 0) {
          let dx = this.waypoints[0].x - this.entity.x;
          let dy = this.waypoints[0].y - this.entity.y;
          angle = Math.atan2(dy, dx);
        }
        break;
      case NavMeshAgentAlignmentMode.FinalWaypoint:
        let dx = this.waypoints[this.waypoints.length - 1].x - this.entity.x;
        let dy = this.waypoints[this.waypoints.length - 1].y - this.entity.y;
        angle = Math.atan2(dy, dx);
        break;
      case NavMeshAgentAlignmentMode.Target:
        if (this.target) {
          let dx = this.target.x - this.entity.x;
          let dy = this.target.y - this.entity.y;
          angle = Math.atan2(dy, dx);
        }
        break;
    }
    this.targetRotation = angle;

    // lerp rotation at 10 degrees per second
    let deltaRotation = this.targetRotation - this.entity.rotation;
    if (deltaRotation > Math.PI) {
      deltaRotation -= Math.PI * 2;
    } else if (deltaRotation < -Math.PI) {
      deltaRotation += Math.PI * 2;
    }
    const turnRateRads = TURN_RATE_DEGREES_PER_SECOND * (Math.PI / 180);
    const newRotation =
      this.entity.rotation + deltaRotation * turnRateRads * (delta / 1000);

    this.entity.setFlipY(
      newRotation > Math.PI / 2 || newRotation < -Math.PI / 2
    );

    this.entity.setRotation(newRotation);

    if (!this.hasPath) {
      return;
    }

    if (Date.now() - this.lastRepath > REPATH_EVERY_MS) {
      this.setDestination(this.target!.x, this.target!.y);
      return;
    }

    const nextWaypoint = this.waypoints[0];

    if (!nextWaypoint) {
      // Reached destination!
      this.desiredVelocity.setGoal({ x: 0, y: 0 });
      this.hasPath = false;
      this.triggerCallbacks();
      this.reachedDest = true;
      return;
    }

    let dx = nextWaypoint.x - this.entity.x;
    let dy = nextWaypoint.y - this.entity.y;

    let distance = Math.sqrt(dx * dx + dy * dy);

    let speed = this.speed;

    // normalize
    dx /= distance + 1e-4;
    dy /= distance + 1e-4;

    if (USE_RAYCAST_PREDICTION) {
      this.raycastLength.setGoal(vec2magnitude(this.desiredVelocity.Value) / 2);
      this.raycastLength.update(delta / 1000);
      // raycast to next waypoint using current velocity
      const raycast = this.navMesh.raycast(
        { x: this.entity.x, y: this.entity.y },
        vec2normalize(this.desiredVelocity.Value),
        speed
      );

      if (raycast.hit) {
        let newDx = raycast.point.x - this.entity.x;
        let newDy = raycast.point.y - this.entity.y;
        let newDistance = Math.sqrt(newDx * newDx + newDy * newDy);
        speed = Math.max(newDistance, 15); // the 15 here forces the agent to keep moving

        this.gfx.lineStyle(1, 0xff0000, 1);
        // draw circle at the raycast point of impact
        this.gfx.fillStyle(0xff0000, 1);
        this.gfx.fillCircle(raycast.point.x, raycast.point.y, 4);
      } else {
        this.gfx.lineStyle(1, 0x00ff00, 1);
      }

      this.gfx.strokePoints([
        { x: this.entity.x, y: this.entity.y },
        { x: raycast.point.x, y: raycast.point.y },
      ]);
    }

    if (!USE_NORMAL_CHECKS || this.waypoints.length <= 1) {
      if (distance <= 16) {
        this.waypoints.shift();
        return;
      }
    } else if (USE_NORMAL_CHECKS) {
      var curr = this.waypoints[0];
      var next = this.waypoints[1];
      var dir: Vector2Like = { x: next.x - curr.x, y: next.y - curr.y };

      const isInFrontOfWaypoint = isPositionInFrontOfLine(curr, dir, {
        x: this.entity.x,
        y: this.entity.y,
      });

      if (distance < NORMAL_RANGE_THRESHOLD && isInFrontOfWaypoint) {
        // console.log('in front!!!');
        this.waypoints.shift();
      } else if (distance <= 2) {
        // console.log('close enough!!!');
        this.waypoints.shift();
      }
    }

    this.desiredVelocity.setGoal({
      x: dx * speed,
      y: dy * speed,
    });
  };
}

function isPositionInFrontOfLine(
  origin: Vector2Like,
  normal: Vector2Like,
  position: Vector2Like
): boolean {
  let relativePosition = { x: position.x - origin.x, y: position.y - origin.y };
  return Vector2.dot(relativePosition, normal) > 0.2;
}

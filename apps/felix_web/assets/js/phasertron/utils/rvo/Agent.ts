/*
 * Agent.cs
 * RVO2/ts Library C#
 *
 * SPDX-FileCopyrightText: 2008 University of North Carolina at Chapel Hill
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Please send all bug reports to <geom@cs.unc.edu>.
 *
 * The authors may be contacted via:
 *
 * Jur van den Berg, Stephen J. Guy, Jamie Snape, Ming C. Lin, Dinesh Manocha
 * Dept. of Computer Science
 * 201 S. Columbia St.
 * Frederick P. Brooks, Jr. Computer Science Bldg.
 * Chapel Hill, N.C. 27599-3175
 * United States of America
 *
 * <http://gamma.cs.unc.edu/RVO2/ts/>
 */

import { Create } from '../TypeFactory';
import { Vector2Like } from '../springs/Vector2Spring';
import { Line } from './Line';
import { Obstacle } from './Obstacle';
import { RVOMath } from './RVOMath';
import { RVOSimulation } from './RVOSimulator';
import { Vector2 } from './Vector2';

/**
 * <summary>Defines an agent in the simulation.</summary>
 */
export class Agent {
  // Distance, Agent
  public agentNeighbors_: [number, Agent][] = [];
  public obstacleNeighbors_: [number, Obstacle][] = [];
  public orcaLines_: Line[] = [];
  public position_: Vector2Like = Vector2.zero;
  public prefVelocity_: Vector2Like = Vector2.zero;
  public velocity_: Vector2Like = Vector2.zero;
  public id_ = 0;
  public maxNeighbors_ = 0;
  public maxSpeed_ = 0.0;
  public neighborDist_ = 0.0;
  public radius_ = 0.0;
  public timeHorizon_ = 0.0;
  public timeHorizonObst_ = 0.0;

  public avoidanceMask_ = 0;

  public weight_ = 1;

  private newVelocity_: Vector2Like = Vector2.zero;
  public avoidanceLayer_: number = 0;

  /**
   * <summary>Computes the neighbors of this agent.</summary>
   */
  public computeNeighbors() {
    this.obstacleNeighbors_ = [];
    let rangeSq = RVOMath.sqr(
      this.timeHorizonObst_ * this.maxSpeed_ + this.radius_
    );
    RVOSimulation.Instance.kdTree_.computeObstacleNeighbors(this, rangeSq);

    this.agentNeighbors_ = [];

    if (this.maxNeighbors_ > 0) {
      rangeSq = RVOMath.sqr(this.neighborDist_);
      rangeSq = RVOSimulation.Instance.kdTree_.computeAgentNeighbors(
        this,
        rangeSq
      );
    }
  }

  /**
   * <summary>Computes the new velocity of this agent.</summary>
   */
  public computeNewVelocity() {
    this.orcaLines_ = [];

    const invTimeHorizonObst = 1.0 / this.timeHorizonObst_;

    /* Create obstacle ORCA lines. */
    for (let i = 0; i < this.obstacleNeighbors_.length; ++i) {
      let obstacle1 = this.obstacleNeighbors_[i][1];
      let obstacle2 = obstacle1.next_!;

      const relativePosition1 = Vector2.sub(obstacle1.point_, this.position_);
      const relativePosition2 = Vector2.sub(obstacle2.point_, this.position_);

      /*
       * Check if velocity obstacle of obstacle is already taken care
       * of by previously constructed obstacle ORCA lines.
       */
      let alreadyCovered = false;

      for (let j = 0; j < this.orcaLines_.length; ++j) {
        if (
          RVOMath.det(
            Vector2.sub(
              Vector2.mul(invTimeHorizonObst, relativePosition1),
              this.orcaLines_[j].point
            ),
            this.orcaLines_[j].direction
          ) -
            invTimeHorizonObst * this.radius_ >=
            -RVOMath.RVO_EPSILON &&
          RVOMath.det(
            Vector2.sub(
              Vector2.mul(invTimeHorizonObst, relativePosition2),
              this.orcaLines_[j].point
            ),
            this.orcaLines_[j].direction
          ) -
            invTimeHorizonObst * this.radius_ >=
            -RVOMath.RVO_EPSILON
        ) {
          alreadyCovered = true;

          break;
        }
      }

      if (alreadyCovered) {
        continue;
      }

      /* Not yet covered. Check for collisions. */
      const distSq1 = RVOMath.absSq(relativePosition1);
      const distSq2 = RVOMath.absSq(relativePosition2);

      const radiusSq = RVOMath.sqr(this.radius_);

      const obstacleVector = Vector2.sub(obstacle2.point_, obstacle1.point_);
      const s =
        Vector2.dot(Vector2.neg(relativePosition1), obstacleVector) /
        RVOMath.absSq(obstacleVector);
      const distSqLine = RVOMath.absSq(
        Vector2.sub(
          Vector2.neg(relativePosition1),
          Vector2.mul(s, obstacleVector)
        )
      );

      const line = new Line();

      if (s < 0.0 && distSq1 <= radiusSq) {
        /* Collision with left vertex. Ignore if non-convex. */
        if (obstacle1.convex_) {
          line.point = Create.vec2(0.0, 0.0);
          line.direction = RVOMath.normalize(
            Create.vec2(-relativePosition1.y, relativePosition1.x)
          );
          this.orcaLines_.push(line);
        }

        continue;
      } else if (s > 1.0 && distSq2 <= radiusSq) {
        /*
         * Collision with right vertex. Ignore if non-convex or if
         * it will be taken care of by neighboring obstacle.
         */
        if (
          obstacle2.convex_ &&
          RVOMath.det(relativePosition2, obstacle2.direction_) >= 0.0
        ) {
          line.point = Create.vec2(0.0, 0.0);
          line.direction = RVOMath.normalize(
            Create.vec2(-relativePosition2.y, relativePosition2.x)
          );
          this.orcaLines_.push(line);
        }

        continue;
      } else if (s >= 0.0 && s <= 1.0 && distSqLine <= radiusSq) {
        /* Collision with obstacle segment. */
        line.point = Create.vec2(0.0, 0.0);
        line.direction = Vector2.neg(obstacle1.direction_);
        this.orcaLines_.push(line);

        continue;
      }

      /*
       * No collision. Compute legs. When obliquely viewed, both legs
       * can come from a single vertex. Legs extend cut-off line when
       * non-convex vertex.
       */

      let leftLegDirection: Vector2Like = Vector2.zero;
      let rightLegDirection: Vector2Like = Vector2.zero;

      if (s < 0.0 && distSqLine <= radiusSq) {
        /*
         * Obstacle viewed obliquely so that left vertex
         * defines velocity obstacle.
         */
        if (!obstacle1.convex_) {
          /* Ignore obstacle. */
          continue;
        }

        obstacle2 = obstacle1;

        const leg1 = RVOMath.sqrt(distSq1 - radiusSq);
        leftLegDirection = Vector2.div(
          Create.vec2(
            relativePosition1.x * leg1 - relativePosition1.y * this.radius_,
            relativePosition1.x * this.radius_ + relativePosition1.y * leg1
          ),
          distSq1
        );
        rightLegDirection = Vector2.div(
          Create.vec2(
            relativePosition1.x * leg1 + relativePosition1.y * this.radius_,
            -relativePosition1.x * this.radius_ + relativePosition1.y * leg1
          ),
          distSq1
        );
      } else if (s > 1.0 && distSqLine <= radiusSq) {
        /*
         * Obstacle viewed obliquely so that
         * right vertex defines velocity obstacle.
         */
        if (!obstacle2.convex_) {
          /* Ignore obstacle. */
          continue;
        }

        obstacle1 = obstacle2;

        const leg2 = RVOMath.sqrt(distSq2 - radiusSq);
        leftLegDirection = Vector2.div(
          Create.vec2(
            relativePosition2.x * leg2 - relativePosition2.y * this.radius_,
            relativePosition2.x * this.radius_ + relativePosition2.y * leg2
          ),
          distSq2
        );
        rightLegDirection = Vector2.div(
          Create.vec2(
            relativePosition2.x * leg2 + relativePosition2.y * this.radius_,
            -relativePosition2.x * this.radius_ + relativePosition2.y * leg2
          ),
          distSq2
        );
      } else {
        /* Usual situation. */
        if (obstacle1.convex_) {
          const leg1 = RVOMath.sqrt(distSq1 - radiusSq);
          leftLegDirection = Vector2.div(
            Create.vec2(
              relativePosition1.x * leg1 - relativePosition1.y * this.radius_,
              relativePosition1.x * this.radius_ + relativePosition1.y * leg1
            ),
            distSq1
          );
        } else {
          /* Left vertex non-convex; left leg extends cut-off line. */
          leftLegDirection = Vector2.neg(obstacle1.direction_);
        }

        if (obstacle2.convex_) {
          const leg2 = RVOMath.sqrt(distSq2 - radiusSq);
          rightLegDirection = Vector2.div(
            Create.vec2(
              relativePosition2.x * leg2 + relativePosition2.y * this.radius_,
              -relativePosition2.x * this.radius_ + relativePosition2.y * leg2
            ),
            distSq2
          );
        } else {
          /* Right vertex non-convex; right leg extends cut-off line. */
          rightLegDirection = obstacle1.direction_;
        }
      }

      /*
       * Legs can never point into neighboring edge when convex
       * vertex, take cutoff-line of neighboring edge instead. If
       * velocity projected on "foreign" leg, no constraint is added.
       */

      const leftNeighbor = obstacle1.previous_!;

      let isLeftLegForeign = false;
      let isRightLegForeign = false;

      if (
        obstacle1.convex_ &&
        RVOMath.det(leftLegDirection, Vector2.neg(leftNeighbor.direction_)) >=
          0.0
      ) {
        /* Left leg points into obstacle. */
        leftLegDirection = Vector2.neg(leftNeighbor.direction_);
        isLeftLegForeign = true;
      }

      if (
        obstacle2.convex_ &&
        RVOMath.det(rightLegDirection, obstacle2.direction_) <= 0.0
      ) {
        /* Right leg points into obstacle. */
        rightLegDirection = obstacle2.direction_;
        isRightLegForeign = true;
      }

      /* Compute cut-off centers. */
      const leftCutOff = Vector2.mul(
        invTimeHorizonObst,
        Vector2.sub(obstacle1.point_, this.position_)
      );
      const rightCutOff = Vector2.mul(
        invTimeHorizonObst,
        Vector2.sub(obstacle2.point_, this.position_)
      );
      const cutOffVector = Vector2.sub(rightCutOff, leftCutOff);

      /* Project current velocity on velocity obstacle. */

      /* Check if current velocity is projected on cutoff circles. */
      const t =
        obstacle1 == obstacle2
          ? 0.5
          : Vector2.dot(Vector2.sub(this.velocity_, leftCutOff), cutOffVector) /
            RVOMath.absSq(cutOffVector);
      const tLeft = Vector2.dot(
        Vector2.sub(this.velocity_, leftCutOff),
        leftLegDirection
      );
      const tRight = Vector2.dot(
        Vector2.sub(this.velocity_, rightCutOff),
        rightLegDirection
      );

      if (
        (t < 0.0 && tLeft < 0.0) ||
        (obstacle1 == obstacle2 && tLeft < 0.0 && tRight < 0.0)
      ) {
        /* Project on left cut-off circle. */
        const unitW = RVOMath.normalize(
          Vector2.sub(this.velocity_, leftCutOff)
        );

        line.direction = Create.vec2(unitW.y, -unitW.x);
        line.point = Vector2.add(
          leftCutOff,
          Vector2.mul(this.radius_ * invTimeHorizonObst, unitW)
        );
        this.orcaLines_.push(line);

        continue;
      } else if (t > 1.0 && tRight < 0.0) {
        /* Project on right cut-off circle. */
        const unitW = RVOMath.normalize(
          Vector2.sub(this.velocity_, rightCutOff)
        );

        line.direction = Create.vec2(unitW.y, -unitW.x);
        line.point = Vector2.add(
          rightCutOff,
          Vector2.mul(this.radius_ * invTimeHorizonObst, unitW)
        );
        this.orcaLines_.push(line);

        continue;
      }

      /*
       * Project on left leg, right leg, or cut-off line, whichever is
       * closest to velocity.
       */
      const distSqCutoff =
        t < 0.0 || t > 1.0 || obstacle1 == obstacle2
          ? Infinity
          : RVOMath.absSq(
              Vector2.sub(
                this.velocity_,
                Vector2.add(leftCutOff, Vector2.mul(t, cutOffVector))
              )
            );
      const distSqLeft =
        tLeft < 0.0
          ? Infinity
          : RVOMath.absSq(
              Vector2.sub(
                this.velocity_,
                Vector2.add(leftCutOff, Vector2.mul(tLeft, leftLegDirection))
              )
            );
      const distSqRight =
        tRight < 0.0
          ? Infinity
          : RVOMath.absSq(
              Vector2.sub(
                this.velocity_,
                Vector2.add(rightCutOff, Vector2.mul(tRight, rightLegDirection))
              )
            );

      if (distSqCutoff <= distSqLeft && distSqCutoff <= distSqRight) {
        /* Project on cut-off line. */
        line.direction = Vector2.neg(obstacle1.direction_);
        line.point = Vector2.add(
          leftCutOff,
          Vector2.mul(
            this.radius_ * invTimeHorizonObst,
            Create.vec2(-line.direction.y, line.direction.x)
          )
        );
        this.orcaLines_.push(line);

        continue;
      }

      if (distSqLeft <= distSqRight) {
        /* Project on left leg. */
        if (isLeftLegForeign) {
          continue;
        }

        line.direction = leftLegDirection;
        line.point = Vector2.add(
          leftCutOff,
          Vector2.mul(
            this.radius_ * invTimeHorizonObst,
            Create.vec2(-line.direction.y, line.direction.x)
          )
        );
        this.orcaLines_.push(line);

        continue;
      }

      /* Project on right leg. */
      if (isRightLegForeign) {
        continue;
      }

      line.direction = Vector2.neg(rightLegDirection);
      line.point = Vector2.add(
        rightCutOff,
        Vector2.mul(
          this.radius_ * invTimeHorizonObst,
          Create.vec2(-line.direction.y, line.direction.x)
        )
      );
      this.orcaLines_.push(line);
    }

    const numObstLines = this.orcaLines_.length;

    const invTimeHorizon = 1.0 / this.timeHorizon_;

    // const orcas = ([] as [number, { position_: Vector2; velocity_: Vector2; radius_: number; }][])
    // .concat(this.agentNeighbors_)
    // .concat(this.obstacleNeighbors_);
    // console.log(this.obstacleNeighbors_.length);

    const orcas = this.agentNeighbors_;
    /* Create agent ORCA lines. */
    for (
      let i = 0;
      i < orcas.length;
      ++i // this.agentNeighbors_.length; ++i)
    ) {
      const other = orcas[i][1];

      const relativePosition = Vector2.sub(other.position_, this.position_);
      const relativeVelocity = Vector2.sub(this.velocity_, other.velocity_);
      const distSq = RVOMath.absSq(relativePosition);
      const combinedRadius = this.radius_ + other.radius_ + other.weight_;
      const combinedRadiusSq = RVOMath.sqr(combinedRadius);

      const line = new Line();
      let u: Vector2Like = Vector2.zero;

      if (distSq > combinedRadiusSq) {
        /* No collision. */
        const w = Vector2.sub(
          relativeVelocity,
          Vector2.mul(invTimeHorizon, relativePosition)
        );

        /* Vector from cutoff center to relative velocity. */
        const wLengthSq = RVOMath.absSq(w);
        const dotProduct1 = Vector2.dot(w, relativePosition);

        if (
          dotProduct1 < 0.0 &&
          RVOMath.sqr(dotProduct1) > combinedRadiusSq * wLengthSq
        ) {
          /* Project on cut-off circle. */
          const wLength = RVOMath.sqrt(wLengthSq);
          const unitW = Vector2.div(w, wLength);

          line.direction = Create.vec2(unitW.y, -unitW.x);
          u = Vector2.mul(combinedRadius * invTimeHorizon - wLength, unitW);
        } else {
          /* Project on legs. */
          const leg = RVOMath.sqrt(distSq - combinedRadiusSq);

          if (RVOMath.det(relativePosition, w) > 0.0) {
            /* Project on left leg. */
            line.direction = Vector2.div(
              Create.vec2(
                relativePosition.x * leg - relativePosition.y * combinedRadius,
                relativePosition.x * combinedRadius + relativePosition.y * leg
              ),
              distSq
            );
          } else {
            /* Project on right leg. */
            line.direction = Vector2.div(
              Vector2.neg(
                Create.vec2(
                  relativePosition.x * leg +
                    relativePosition.y * combinedRadius,
                  -relativePosition.x * combinedRadius +
                    relativePosition.y * leg
                )
              ),
              distSq
            );
          }

          const dotProduct2 = Vector2.dot(relativeVelocity, line.direction);
          u = Vector2.sub(
            Vector2.mul(dotProduct2, line.direction),
            relativeVelocity
          );
        }
      } else {
        /* Collision. Project on cut-off circle of time timeStep. */
        const invTimeStep = 1.0 / RVOSimulation.Instance.timeStep_;

        /* Vector from cutoff center to relative velocity. */
        const w = Vector2.sub(
          relativeVelocity,
          Vector2.mul(invTimeStep, relativePosition)
        );

        const wLength = RVOMath.abs(w);
        const unitW = Vector2.div(w, wLength);

        line.direction = Create.vec2(unitW.y, -unitW.x);
        u = Vector2.mul(combinedRadius * invTimeStep - wLength, unitW);
      }

      line.point = Vector2.add(this.velocity_, Vector2.mul(0.5, u));
      this.orcaLines_.push(line);
    }

    const lineFail = this.linearProgram2(
      this.orcaLines_,
      this.maxSpeed_,
      this.prefVelocity_,
      false,
      this.newVelocity_
    );

    if (lineFail < this.orcaLines_.length) {
      this.linearProgram3(
        this.orcaLines_,
        numObstLines,
        lineFail,
        this.maxSpeed_,
        this.newVelocity_
      );
    }
  }

  /**
   * <summary>Inserts an agent neighbor into the set of neighbors of this
   * agent.</summary>
   *
   * <param name="agent">A pointer to the agent to be inserted.</param>
   * <param name="rangeSq">The squared range around this agent.</param>
   */
  public insertAgentNeighbor(agent: Agent, rangeSq: number): number {
    if (this != agent) {
      const distSq = RVOMath.absSq(
        Vector2.sub(this.position_, agent.position_)
      );

      // if (this.avoidanceMask_ === -1 || agent.avoidanceMask_ === -1) {
      //   return rangeSq;
      // }

      const hasMaskOverlap = true;
      // (this.avoidanceMask_ & agent.avoidanceLayer_) !== 0; // if the groups overlap, the agents can see each other

      if (distSq < rangeSq && hasMaskOverlap) {
        if (this.agentNeighbors_.length < this.maxNeighbors_) {
          this.agentNeighbors_.push([distSq, agent]);
        }

        let i = this.agentNeighbors_.length - 1;

        while (i != 0 && distSq < this.agentNeighbors_[i - 1][0]) {
          this.agentNeighbors_[i] = this.agentNeighbors_[i - 1];
          --i;
        }

        this.agentNeighbors_[i] = [distSq, agent];

        if (this.agentNeighbors_.length == this.maxNeighbors_) {
          rangeSq = this.agentNeighbors_[this.agentNeighbors_.length - 1][0];
        }
      }
    }

    return rangeSq;
  }

  /**
   * <summary>Inserts a static obstacle neighbor into the set of neighbors
   * of this agent.</summary>
   *
   * <param name="obstacle">The number of the static obstacle to be
   * inserted.</param>
   * <param name="rangeSq">The squared range around this agent.</param>
   */
  public insertObstacleNeighbor(obstacle: Obstacle, rangeSq: number): number {
    const nextObstacle = obstacle.next_!;

    const distSq = RVOMath.distSqPointLineSegment(
      obstacle.point_,
      nextObstacle.point_,
      this.position_
    );

    if (distSq < rangeSq) {
      this.obstacleNeighbors_.push([distSq, obstacle]);

      let i = this.obstacleNeighbors_.length - 1;

      while (i != 0 && distSq < this.obstacleNeighbors_[i - 1][0]) {
        this.obstacleNeighbors_[i] = this.obstacleNeighbors_[i - 1];
        --i;
      }
      this.obstacleNeighbors_[i] = [distSq, obstacle];
    }

    return rangeSq;
  }

  /**
   * <summary>Updates the two-dimensional position and two-dimensional
   * velocity of this agent.</summary>
   */
  public update() {
    this.velocity_ = this.newVelocity_;
    this.position_ = Vector2.add(
      this.position_,
      Vector2.mul(this.velocity_, RVOSimulation.Instance.timeStep_)
    );
  }

  /**
   * <summary>Solves a one-dimensional linear program on a specified line
   * subject to linear constraints defined by lines and a circular
   * constraint.</summary>
   *
   * <returns>True if successful.</returns>
   *
   * <param name="lines">Lines defining the linear constraints.</param>
   * <param name="lineNo">The specified line constraint.</param>
   * <param name="radius">The radius of the circular constraint.</param>
   * <param name="optVelocity">The optimization velocity.</param>
   * <param name="directionOpt">True if the direction should be optimized.
   * </param>
   * <param name="result">A reference to the result of the linear program.
   * </param>
   */
  private linearProgram1(
    lines: Line[],
    lineNo: number,
    radius: number,
    optVelocity: Vector2Like,
    directionOpt: boolean,
    result: Vector2Like
  ): boolean {
    const dotProduct = Vector2.dot(
      lines[lineNo].point,
      lines[lineNo].direction
    );
    const discriminant =
      RVOMath.sqr(dotProduct) +
      RVOMath.sqr(radius) -
      RVOMath.absSq(lines[lineNo].point);

    if (discriminant < 0.0) {
      /* Max speed circle fully invalidates line lineNo. */
      return false;
    }

    const sqrtDiscriminant = RVOMath.sqrt(discriminant);
    let tLeft = -dotProduct - sqrtDiscriminant;
    let tRight = -dotProduct + sqrtDiscriminant;

    for (let i = 0; i < lineNo; ++i) {
      const denominator = RVOMath.det(
        lines[lineNo].direction,
        lines[i].direction
      );
      const numerator = RVOMath.det(
        lines[i].direction,
        Vector2.sub(lines[lineNo].point, lines[i].point)
      );

      if (RVOMath.fabs(denominator) <= RVOMath.RVO_EPSILON) {
        /* Lines lineNo and i are (almost) parallel. */
        if (numerator < 0.0) {
          return false;
        }

        continue;
      }

      const t = numerator / denominator;

      if (denominator >= 0.0) {
        /* Line i bounds line lineNo on the right. */
        tRight = Math.min(tRight, t);
      } else {
        /* Line i bounds line lineNo on the left. */
        tLeft = Math.max(tLeft, t);
      }

      if (tLeft > tRight) {
        return false;
      }
    }

    if (directionOpt) {
      /* Optimize direction. */
      if (Vector2.dot(optVelocity, lines[lineNo].direction) > 0.0) {
        /* Take right extreme. */
        Vector2.copy(
          result,
          Vector2.add(
            lines[lineNo].point,
            Vector2.mul(tRight, lines[lineNo].direction)
          )
        );
      } else {
        /* Take left extreme. */
        Vector2.copy(
          result,
          Vector2.add(
            lines[lineNo].point,
            Vector2.mul(tLeft, lines[lineNo].direction)
          )
        );
      }
    } else {
      /* Optimize closest point. */
      const t = Vector2.dot(
        lines[lineNo].direction,
        Vector2.sub(optVelocity, lines[lineNo].point)
      );

      if (t < tLeft) {
        Vector2.copy(
          result,
          Vector2.add(
            lines[lineNo].point,
            Vector2.mul(tLeft, lines[lineNo].direction)
          )
        );
      } else if (t > tRight) {
        Vector2.copy(
          result,
          Vector2.add(
            lines[lineNo].point,
            Vector2.mul(tRight, lines[lineNo].direction)
          )
        );
      } else {
        Vector2.copy(
          result,
          Vector2.add(
            lines[lineNo].point,
            Vector2.mul(t, lines[lineNo].direction)
          )
        );
      }
    }

    return true;
  }

  /**
   * <summary>Solves a two-dimensional linear program subject to linear
   * constraints defined by lines and a circular constraint.</summary>
   *
   * <returns>The number of the line it fails on, and the number of lines
   * if successful.</returns>
   *
   * <param name="lines">Lines defining the linear constraints.</param>
   * <param name="radius">The radius of the circular constraint.</param>
   * <param name="optVelocity">The optimization velocity.</param>
   * <param name="directionOpt">True if the direction should be optimized.
   * </param>
   * <param name="result">A reference to the result of the linear program.
   * </param>
   */
  private linearProgram2(
    lines: Line[],
    radius: number,
    optVelocity: Vector2Like,
    directionOpt: boolean,
    result: Vector2Like
  ): number {
    if (directionOpt) {
      /*
       * Optimize direction. Note that the optimization velocity is of
       * unit length in this case.
       */
      Vector2.copy(result, Vector2.mul(optVelocity, radius));
    } else if (RVOMath.absSq(optVelocity) > RVOMath.sqr(radius)) {
      /* Optimize closest point and outside circle. */
      Vector2.copy(result, Vector2.mul(RVOMath.normalize(optVelocity), radius));
    } else {
      /* Optimize closest point and inside circle. */
      Vector2.copy(result, optVelocity);
    }

    for (let i = 0; i < lines.length; ++i) {
      if (
        RVOMath.det(lines[i].direction, Vector2.sub(lines[i].point, result)) >
        0.0
      ) {
        /* Result does not satisfy constraint i. Compute new optimal result. */
        const tempResult = Create.vec2(result.x, result.y);
        if (
          !this.linearProgram1(
            lines,
            i,
            radius,
            optVelocity,
            directionOpt,
            result
          )
        ) {
          Vector2.copy(result, tempResult);
          return i;
        }
      }
    }

    return lines.length;
  }

  /**
   * <summary>Solves a two-dimensional linear program subject to linear
   * constraints defined by lines and a circular constraint.</summary>
   *
   * <param name="lines">Lines defining the linear constraints.</param>
   * <param name="numObstLines">Count of obstacle lines.</param>
   * <param name="beginLine">The line on which the 2-d linear program
   * failed.</param>
   * <param name="radius">The radius of the circular constraint.</param>
   * <param name="result">A reference to the result of the linear program.
   * </param>
   */
  private linearProgram3(
    lines: Line[],
    numObstLines: number,
    beginLine: number,
    radius: number,
    result: Vector2Like
  ) {
    let distance = 0.0;

    for (let i = beginLine; i < lines.length; ++i) {
      if (
        RVOMath.det(lines[i].direction, Vector2.sub(lines[i].point, result)) >
        distance
      ) {
        /* Result does not satisfy constraint of line i. */
        const projLines: Line[] = [];
        for (let ii = 0; ii < numObstLines; ++ii) {
          projLines.push(lines[ii]);
        }

        for (let j = numObstLines; j < i; ++j) {
          const line = new Line();

          const determinant = RVOMath.det(
            lines[i].direction,
            lines[j].direction
          );

          if (RVOMath.fabs(determinant) <= RVOMath.RVO_EPSILON) {
            /* Line i and line j are parallel. */
            if (Vector2.dot(lines[i].direction, lines[j].direction) > 0.0) {
              /* Line i and line j point in the same direction. */
              continue;
            } else {
              /* Line i and line j point in opposite direction. */
              line.point = Vector2.mul(
                0.5,
                Vector2.add(lines[i].point, lines[j].point)
              );
            }
          } else {
            line.point = Vector2.add(
              lines[i].point,
              Vector2.mul(
                RVOMath.det(
                  lines[j].direction,
                  Vector2.sub(lines[i].point, lines[j].point)
                ) / determinant,
                lines[i].direction
              )
            );
          }

          line.direction = RVOMath.normalize(
            Vector2.sub(lines[j].direction, lines[i].direction)
          );
          projLines.push(line);
        }

        const tempResult = Create.vec2(result.x, result.y);
        if (
          this.linearProgram2(
            projLines,
            radius,
            Create.vec2(-lines[i].direction.y, lines[i].direction.x),
            true,
            result
          ) < projLines.length
        ) {
          /*
           * This should in principle not happen. The result is by
           * definition already in the feasible region of this
           * linear program. If it fails, it is due to small
           * floating point error, and the current result is kept.
           */
          Vector2.copy(result, tempResult);
        }

        distance = RVOMath.det(
          lines[i].direction,
          Vector2.sub(lines[i].point, result)
        );
      }
    }
  }
}

import { Vector2Like } from '../springs/Vector2Spring';
import SpatialHash from './SpatialHash';

export type QueryableRingItem = {
  position: Vector2Like;
};

export default class RingQuery<T extends QueryableRingItem> {
  entityHash: SpatialHash<T>;

  constructor(
    entities: T[],
    private center: Vector2Like = { x: 0, y: 0 }
  ) {
    this.entityHash = new SpatialHash(25, Math.PI / 2);
    // convert entities to polar coordinates and
    entities.forEach((entity) => {
      const polar = this.convertCartesianToPolar(entity.position, center);
      this.entityHash.insert(
        {
          position: {
            x: polar.r,
            y: polar.theta,
          },
        } as T,
        polar.r,
        polar.theta,
        5,
        5
      );
    });
  }

  public convertCartesianToPolar = (
    position: Vector2Like,
    fromOrigin: Vector2Like = this.center
  ) => {
    // r is the distance from the origin
    const r = Math.sqrt(
      (position.x - fromOrigin.x) * (position.x - fromOrigin.x) +
        (position.y - fromOrigin.y) * (position.y - fromOrigin.y)
    );
    // theta is the angle from the x axis
    let theta = Math.atan2(
      position.y - fromOrigin.y,
      position.x - fromOrigin.x
    );

    if (theta < 0) {
      theta += 2 * Math.PI;
    }

    return { r, theta };
  };

  public convertPolarToCartesian = (
    polar: Vector2Like,
    fromOrigin: Vector2Like = this.center
  ) => {
    // convert from polar to cartesian, accounting for the `fromOrigin` as the origin for the point
    const x = polar.x * Math.cos(polar.y) + fromOrigin.x;
    const y = polar.x * Math.sin(polar.y) + fromOrigin.y;
    return { x, y };
  };

  private convertNegativeRadianToWithin2Pi = (radian: number) => {
    while (radian < 0) {
      radian += 2 * Math.PI;
    }
    return radian;
  };

  private convertRadianToWithin2Pi = (radian: number) => {
    while (radian > 2 * Math.PI) {
      radian -= 2 * Math.PI;
    }
    return radian;
  };

  private queryImpl = (x: number, y: number, w: number, h: number) => {
    const candidates = this.entityHash.query(x, y, w, h);
    const results = [];
    let pos;
    for (let i = 0; i < candidates.length; i++) {
      pos = candidates[i].position;
      if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h) {
        results.push(candidates[i]);
      }
    }
    return results;
  };

  public query(
    distanceStart: number,
    distanceEnd: number,
    angleStart: number,
    angleEnd: number
  ): T[] {
    angleStart = this.convertNegativeRadianToWithin2Pi(angleStart);
    angleEnd = this.convertNegativeRadianToWithin2Pi(angleEnd);

    // we may have to perform two queries here if the angle range wraps around 2pi
    if (angleStart >= angleEnd || angleEnd >= Math.PI * 2) {
      angleEnd = this.convertRadianToWithin2Pi(angleEnd);
      // first point is from angleStart to 2pi
      const firstAngle = Math.abs(2 * Math.PI - angleStart);
      const res1 = this.queryImpl(
        distanceStart,
        angleStart,
        Math.abs(distanceEnd - distanceStart),
        firstAngle
      );

      const remainingAngle =
        Math.PI * 2 - Math.abs(angleStart - angleEnd) - firstAngle;
      const res2 = this.queryImpl(
        distanceStart,
        0,
        Math.abs(distanceEnd - distanceStart),
        remainingAngle
      );

      return [...res1, ...res2];
    }

    const res = this.queryImpl(
      distanceStart,
      angleStart,
      Math.abs(distanceEnd - distanceStart),
      Math.abs(angleEnd - angleStart)
    );

    return res;
  }
}

/*
 * RVOMath.cs
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

import { Vector2Like } from '../springs/Vector2Spring';
import { Vector2 } from './Vector2';

/**
 * <summary>Contains functions and constants used in multiple classes.
 * </summary>
 */
export class RVOMath {
  /**
   * <summary>A sufficiently small positive number.</summary>
   */
  public static RVO_EPSILON = 0.00001;

  /**
   * <summary>Computes the length of a specified two-dimensional vector.
   * </summary>
   *
   * <param name="vector">The two-dimensional vector whose length is to be
   * computed.</param>
   * <returns>The length of the two-dimensional vector.</returns>
   */
  public static abs(vector: Vector2Like) {
    return this.sqrt(this.absSq(vector));
  }

  /**
   * <summary>Computes the squared length of a specified two-dimensional
   * vector.</summary>
   *
   * <returns>The squared length of the two-dimensional vector.</returns>
   *
   * <param name="vector">The two-dimensional vector whose squared length
   * is to be computed.</param>
   */
  public static absSq(vector: Vector2Like) {
    // TIL the resulting dot product of a vector with itself is the vector's squared magnitude!
    return Vector2.dot(vector, vector);
  }

  /**
   * <summary>Computes the normalization of the specified two-dimensional
   * vector.</summary>
   *
   * <returns>The normalization of the two-dimensional vector.</returns>
   *
   * <param name="vector">The two-dimensional vector whose normalization
   * is to be computed.</param>
   */
  public static normalize(vector: Vector2Like) {
    return Vector2.div(vector, this.abs(vector));
  }

  /**
   * <summary>Computes the determinant of a two-dimensional square matrix
   * with rows consisting of the specified two-dimensional vectors.
   * </summary>
   *
   * <returns>The determinant of the two-dimensional square matrix.
   * </returns>
   *
   * <param name="vector1">The top row of the two-dimensional square
   * matrix.</param>
   * <param name="vector2">The bottom row of the two-dimensional square
   * matrix.</param>
   */
  public static det(vector1: Vector2Like, vector2: Vector2Like) {
    return vector1.x * vector2.y - vector1.y * vector2.x;
  }

  /**
   * <summary>Computes the squared distance from a line segment with the
   * specified endpoints to a specified point.</summary>
   *
   * <returns>The squared distance from the line segment to the point.
   * </returns>
   *
   * <param name="vector1">The first endpoint of the line segment.</param>
   * <param name="vector2">The second endpoint of the line segment.
   * </param>
   * <param name="vector3">The point to which the squared distance is to
   * be calculated.</param>
   */
  public static distSqPointLineSegment(
    vector1: Vector2Like,
    vector2: Vector2Like,
    vector3: Vector2Like
  ) {
    const r =
      Vector2.dot(
        Vector2.sub(vector3, vector1),
        Vector2.sub(vector2, vector1)
      ) / this.absSq(Vector2.sub(vector2, vector1));

    if (r < 0.0) {
      return this.absSq(Vector2.sub(vector3, vector1));
    }

    if (r > 1.0) {
      return this.absSq(Vector2.sub(vector3, vector2));
    }

    return this.absSq(
      Vector2.sub(
        vector3,
        Vector2.add(vector1, Vector2.mul(r, Vector2.sub(vector2, vector1)))
      )
    );
  }

  /**
   * <summary>Computes the absolute value of a float.</summary>
   *
   * <returns>The absolute value of the float.</returns>
   *
   * <param name="scalar">The float of which to compute the absolute
   * value.</param>
   */
  public static fabs(scalar: number) {
    return Math.abs(scalar);
  }

  /**
   * <summary>Computes the signed distance from a line connecting the
   * specified points to a specified point.</summary>
   *
   * <returns>Positive when the point c lies to the left of the line ab.
   * </returns>
   *
   * <param name="a">The first point on the line.</param>
   * <param name="b">The second point on the line.</param>
   * <param name="c">The point to which the signed distance is to be
   * calculated.</param>
   */
  public static leftOf(a: Vector2Like, b: Vector2Like, c: Vector2Like) {
    return this.det(Vector2.sub(a, c), Vector2.sub(b, a));
  }

  /**
   * <summary>Computes the square of a float.</summary>
   *
   * <returns>The square of the float.</returns>
   *
   * <param name="scalar">The float to be squared.</param>
   */
  public static sqr(scalar: number) {
    return scalar * scalar;
  }

  /**
   * <summary>Computes the square root of a float.</summary>
   *
   * <returns>The square root of the float.</returns>
   *
   * <param name="scalar">The float of which to compute the square root.
   * </param>
   */
  public static sqrt(scalar: number) {
    return Math.sqrt(scalar);
  }
}
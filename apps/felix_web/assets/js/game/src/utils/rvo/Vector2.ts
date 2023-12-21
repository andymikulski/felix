/*
 * Vector2.cs
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

/**
 * <summary>Defines a two-dimensional vector.</summary>
 */
export class Vector2 {
  public static get zero(): Vector2 {
    return new Vector2(0, 0);
  }

  public static copy(destination: Vector2, newValues: Vector2) {
    destination.x = newValues.x;
    destination.y = newValues.y;
  }

  /**
   * <summary>Constructs and initializes a two-dimensional vector from the
   * specified xy-coordinates.</summary>
   *
   * <param name="x">The x-coordinate of the two-dimensional vector.
   * </param>
   * <param name="y">The y-coordinate of the two-dimensional vector.
   * </param>
   */
  constructor(
    public x: number,
    public y: number
  ) {}

  /**
   * <summary>Returns the string representation of this vector.</summary>
   *
   * <returns>The string representation of this vector.</returns>
   */
  public ToString() {
    return '(' + this.x + ',' + this.y + ')';
  }

  public static Distance(one: Vector2, other: Vector2): number {
    return Math.sqrt(
      (one.x - other.x) * (one.x - other.x) +
        (one.y - other.y) * (one.y - other.y)
    );
  }

  public get magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * <summary>Computes the dot product of the two specified
   * two-dimensional vectors.</summary>
   *
   * <returns>The dot product of the two specified two-dimensional
   * vectors.</returns>
   *
   * <param name="vector1">The first two-dimensional vector.</param>
   * <param name="vector2">The second two-dimensional vector.</param>
   */
  public static dot(vector1: Vector2, vector2: Vector2): number {
    return vector1.x * vector2.x + vector1.y * vector2.y;
  }

  /**
   * <summary>Computes the scalar multiplication of the specified
   * two-dimensional vector with the specified scalar value.</summary>
   *
   * <returns>The scalar multiplication of the specified two-dimensional
   * vector with the specified scalar value.</returns>
   *
   * <param name="scalar">The scalar value.</param>
   * <param name="vector">The two-dimensional vector.</param>
   */
  // public static mul(scalar:number, vector:Vector2):Vector2
  // {
  //     return new Vector2(vector.x * scalar, vector.y * scalar);
  // }

  /**
   * <summary>Computes the scalar multiplication of the specified
   * two-dimensional vector with the specified scalar value.</summary>
   *
   * <returns>The scalar multiplication of the specified two-dimensional
   * vector with the specified scalar value.</returns>
   *
   * <param name="vector">The two-dimensional vector.</param>
   * <param name="scalar">The scalar value.</param>
   */
  public static mul(scalar: number, vector: Vector2): Vector2;
  public static mul(vector: Vector2, scalar: number): Vector2;
  public static mul(arg1: number | Vector2, arg2: number | Vector2): Vector2 {
    if (arg1 instanceof Vector2 && typeof arg2 === 'number') {
      return new Vector2(arg1.x * arg2, arg1.y * arg2);
    } else if (arg2 instanceof Vector2 && typeof arg1 === 'number') {
      return new Vector2(arg2.x * arg1, arg2.y * arg1);
    } else {
      throw new Error(
        `Invalid arguments provided to Vector2.mul: ${arg1} (typeof ${typeof arg1}) /  ${arg2} (typeof ${typeof arg2})`
      );
    }
  }

  /**
   * <summary>Computes the scalar division of the specified
   * two-dimensional vector with the specified scalar value.</summary>
   *
   * <returns>The scalar division of the specified two-dimensional vector
   * with the specified scalar value.</returns>
   *
   * <param name="vector">The two-dimensional vector.</param>
   * <param name="scalar">The scalar value.</param>
   */
  public static div(vector: Vector2, scalar: number): Vector2 {
    return new Vector2(vector.x / scalar, vector.y / scalar);
  }

  /**
   * <summary>Computes the vector sum of the two specified two-dimensional
   * vectors.</summary>
   *
   * <returns>The vector sum of the two specified two-dimensional vectors.
   * </returns>
   *
   * <param name="vector1">The first two-dimensional vector.</param>
   * <param name="vector2">The second two-dimensional vector.</param>
   */
  public static add(vector1: Vector2, vector2: Vector2): Vector2 {
    return new Vector2(vector1.x + vector2.x, vector1.y + vector2.y);
  }

  /**
   * <summary>Computes the vector difference of the two specified
   * two-dimensional vectors</summary>
   *
   * <returns>The vector difference of the two specified two-dimensional
   * vectors.</returns>
   *
   * <param name="vector1">The first two-dimensional vector.</param>
   * <param name="vector2">The second two-dimensional vector.</param>
   */
  public static sub(vector1: Vector2, vector2: Vector2): Vector2 {
    return new Vector2(vector1.x - vector2.x, vector1.y - vector2.y);
  }

  /**
   * <summary>Computes the negation of the specified two-dimensional
   * vector.</summary>
   *
   * <returns>The negation of the specified two-dimensional vector.
   * </returns>
   *
   * <param name="vector">The two-dimensional vector.</param>
   */
  public static neg(vector: Vector2): Vector2 {
    return new Vector2(-vector.x, -vector.y);
  }
}

// Port of Jake Low's hobby curve implementation from JavaScript into TypeScript.
// Ported May 2024 by Andy Mikulski.
// Original source: https://www.jakelow.com/blog/hobby-curves/hobby.js

/*!
 * ISC License
 *
 * Copyright 2020 Jake Low
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose
 * with or without fee is hereby granted, provided that the above copyright notice
 * and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
 * OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
 * TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
 * THIS SOFTWARE.
 *
 * */

import { Vector2Like } from '../springs/Vector2Spring';
// Calculate the length (magnitude) of a 2D vector.
function vLength(v: Vector2Like): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

// Add two 2D vectors.
function vAdd(v1: Vector2Like, v2: Vector2Like): Vector2Like {
  return { x: v1.x + v2.x, y: v1.y + v2.y };
}

// Subtract one 2D vector from another.
function vSub(v1: Vector2Like, v2: Vector2Like): Vector2Like {
  return { x: v1.x - v2.x, y: v1.y - v2.y };
}

// Calculate the angle between two 2D vectors.
function vAngleBetween(v1: Vector2Like, v2: Vector2Like): number {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const det = v1.x * v2.y - v1.y * v2.x;
  return Math.atan2(det, dot);
}

// Scale a 2D vector by a scalar.
function vScale(v: Vector2Like, scalar: number): Vector2Like {
  return { x: v.x * scalar, y: v.y * scalar };
}

// Normalize a 2D vector to have a length of 1.
function vNorm(v: Vector2Like): Vector2Like {
  const len = vLength(v);
  return { x: v.x / len, y: v.y / len };
}

// Rotate a 2D vector by a given angle in radians.
function vRot(v: Vector2Like, angle: number): Vector2Like {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  return { x: v.x * cosA - v.y * sinA, y: v.x * sinA + v.y * cosA };
}

function rho(alpha: number, beta: number): number {
  const c = 2 / 3;
  return 2 / (1 + c * Math.cos(beta) + (1 - c) * Math.cos(alpha));
}

function thomas(A: number[], B: number[], C: number[], D: number[]): number[] {
  const n = B.length - 1;
  const Cp: number[] = Array(n + 1);
  const Dp: number[] = Array(n + 1);

  Cp[0] = C[0] / B[0];
  Dp[0] = D[0] / B[0];

  for (let i = 1; i <= n; i++) {
    const denom = B[i] - Cp[i - 1] * A[i];
    Cp[i] = C[i] / denom;
    Dp[i] = (D[i] - Dp[i - 1] * A[i]) / denom;
  }

  const X: number[] = Array(n);
  X[n] = Dp[n];
  for (let i = n - 1; i >= 0; i--) {
    X[i] = Dp[i] - Cp[i] * X[i + 1];
  }

  return X;
}

export function hobby(
  points: Vector2Like[],
  omega: number = 0.0
): Vector2Like[] {
  if (points.length <= 2) {
    return points;
  }
  // assert(Vector2Likes.length >= 2);
  const n = points.length - 1;
  const chords: Vector2Like[] = Array(n);
  const d: number[] = Array(n);

  for (let i = 0; i < n; i++) {
    chords[i] = vSub(points[i + 1], points[i]);
    d[i] = vLength(chords[i]);
    // assert(d[i] > 0);
  }

  const gamma: number[] = Array(n + 1);
  for (let i = 1; i < n; i++) {
    gamma[i] = vAngleBetween(chords[i - 1], chords[i]);
  }
  gamma[n] = 0;

  const A: number[] = Array(n + 1);
  const B: number[] = Array(n + 1);
  const C: number[] = Array(n + 1);
  const D: number[] = Array(n + 1);

  B[0] = 2 + omega;
  C[0] = 2 * omega + 1;
  D[0] = -1 * C[0] * gamma[1];

  for (let i = 1; i < n; i++) {
    A[i] = 1 / d[i - 1];
    B[i] = (2 * d[i - 1] + 2 * d[i]) / (d[i - 1] * d[i]);
    C[i] = 1 / d[i];
    D[i] =
      (-1 * (2 * gamma[i] * d[i] + gamma[i + 1] * d[i - 1])) /
      (d[i - 1] * d[i]);
  }

  A[n] = 2 * omega + 1;
  B[n] = 2 + omega;
  D[n] = 0;

  const alpha = thomas(A, B, C, D);
  const beta: number[] = Array(n);
  for (let i = 0; i < n - 1; i++) {
    beta[i] = -1 * gamma[i + 1] - alpha[i + 1];
  }
  beta[n - 1] = -1 * alpha[n];

  const c0: Vector2Like[] = Array(n);
  const c1: Vector2Like[] = Array(n);
  for (let i = 0; i < n; i++) {
    const a = (rho(alpha[i], beta[i]) * d[i]) / 3;
    const b = (rho(beta[i], alpha[i]) * d[i]) / 3;

    c0[i] = vAdd(points[i], vScale(vNorm(vRot(chords[i], alpha[i])), a));
    c1[i] = vSub(
      points[i + 1],
      vScale(vNorm(vRot(chords[i], -1 * beta[i])), b)
    );
  }

  const res: Vector2Like[] = [];
  for (let i = 0; i < n; i++) {
    res.push(points[i], c0[i], c1[i]);
  }
  res.push(points[n]);

  return res;
}

// const canvas = document.createElement('canvas');
// document.body.appendChild(canvas);
// const ctx = canvas.getContext('2d');

// const points: Vector2Like[] = [];
// function render() {
//   if (ctx && points.length) {
//     canvas.width = 800;
//     canvas.height = 600;

//     // draw straight line of `points` for comparison
//     ctx.strokeStyle = 'red';
//     ctx.lineWidth = 1;
//     ctx.beginPath();
//     ctx.moveTo(points[0].x, points[0].y);
//     ctx.setLineDash([5, 5]);
//     for (let j = 1; j < points.length; j++) {
//       ctx.lineTo(points[j].x, points[j].y);
//     }
//     ctx.stroke();

//     ctx.setLineDash([]);

//     var hobbyPoints = points; // .concat([points[0]]);

//     const zeroCurve = hobby(hobbyPoints, 0);
//     drawCurve(ctx, zeroCurve, 'orange');

//     const halfCurv = hobby(hobbyPoints, -0.25);
//     drawCurve(ctx, halfCurv, 'blue');

//     const fullCurve = hobby(hobbyPoints, 1);
//     drawCurve(ctx, fullCurve, 'black');
//   }

//   requestAnimationFrame(render);
// }

// function drawCurve(
//   ctx: CanvasRenderingContext2D,
//   curve: Vector2Like[],
//   color: string
// ) {
//   if (curve.length < 3) return;
//   ctx.strokeStyle = color;
//   ctx.lineWidth = 2;
//   ctx.beginPath();
//   ctx.moveTo(curve[0].x, curve[0].y); // Start at the first point
//   // The curve array should contain the original points interspersed with control points
//   // You should move to the first point and then draw Bézier curves using the control points
//   for (let i = 1; i < curve.length; i += 3) {
//     ctx.bezierCurveTo(
//       curve[i].x,
//       curve[i].y, // first control point
//       curve[i + 1].x,
//       curve[i + 1].y, // second control point
//       curve[i + 2].x,
//       curve[i + 2].y // endpoint of the curve
//     );
//   }
//   // ctx.closePath();
//   ctx.stroke();
// }

// render();

// // add point on mouse click
// window.addEventListener('click', (e) => {
//   points.push({ x: e.clientX, y: e.clientY });
// });

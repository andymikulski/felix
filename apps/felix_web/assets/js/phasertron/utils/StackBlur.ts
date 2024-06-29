/*

StackBlur - a fast almost Gaussian Blur For Canvas

Version: 	0.6 (TypeScript)
Author:		Mario Klingemann (ported to TS by andymikulski.com)
Contact: 	mario@quasimondo.com
Website:	http://www.quasimondo.com/StackBlurForCanvas
Twitter:	@quasimondo

In case you find this class useful - especially in commercial projects -
I am not totally unhappy for a small donation to my PayPal account
mario@quasimondo.de

Or support me on flattr:
https://flattr.com/thing/72791/StackBlur-a-fast-almost-Gaussian-Blur-Effect-for-CanvasJavascript

Copyright (c) 2010 Mario Klingemann

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

import { HeatMapPixel } from './Heatmap';

const mul_table = [
  512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292,
  512, 454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292,
  273, 512, 482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259,
  496, 475, 456, 437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292,
  282, 273, 265, 512, 497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373,
  364, 354, 345, 337, 328, 320, 312, 305, 298, 291, 284, 278, 271, 265, 259,
  507, 496, 485, 475, 465, 456, 446, 437, 428, 420, 412, 404, 396, 388, 381,
  374, 367, 360, 354, 347, 341, 335, 329, 323, 318, 312, 307, 302, 297, 292,
  287, 282, 278, 273, 269, 265, 261, 512, 505, 497, 489, 482, 475, 468, 461,
  454, 447, 441, 435, 428, 422, 417, 411, 405, 399, 394, 389, 383, 378, 373,
  368, 364, 359, 354, 350, 345, 341, 337, 332, 328, 324, 320, 316, 312, 309,
  305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271, 268, 265, 262, 259,
  257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456, 451, 446, 442,
  437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388, 385, 381,
  377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335, 332,
  329, 326, 323, 320, 318, 315, 312, 310, 307, 304, 302, 299, 297, 294, 292,
  289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259,
];

const shg_table = [
  9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17, 17, 17, 17, 17,
  17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19,
  19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
  20, 20, 20, 20, 20, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
  21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
  22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
  22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23, 23, 23, 23, 23, 23, 23,
  23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
  23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
  23, 23, 23, 23, 23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24,
];

type BlurStack = {
  value: number;
  next?: BlurStack;
};

export function stackBlurInPlace(
  values: HeatMapPixel[],
  width: number,
  height: number,
  radius: number = 2
) {
  let pixelPosition: number;
  let yPixelPosition: number, pixelIndex: number, ywPixelPosition: number;
  let valueSum: number, valueOutSum: number, valueInSum: number;
  let currentPixelValue: number, remainingBlurSteps: number;

  const div = radius + radius + 1;
  const widthMinus1 = width - 1;
  const heightMinus1 = height - 1;
  const radiusPlus1 = radius + 1;
  const sumFactor = (radiusPlus1 * (radiusPlus1 + 1)) / 2;

  const stackStart: BlurStack = { value: 0, next: undefined };
  let stackEnd: BlurStack | undefined;
  let stack = stackStart;

  // Creating a circular stack for the blur effect
  for (let i = 1; i < div; i++) {
    stack.next = { value: 0, next: undefined };
    stack = stack.next;
    if (i === radiusPlus1) {
      stackEnd = stack;
    }
  }
  stack.next = stackStart;

  let stackIn: BlurStack | undefined;
  let stackOut: BlurStack | undefined;

  ywPixelPosition = pixelIndex = 0;

  const mul_sum = mul_table[radius];
  const shg_sum = shg_table[radius];

  for (let y = 0; y < height; y++) {
    valueInSum = valueSum = 0;

    // Initializing stack values for the current row
    currentPixelValue = values[pixelIndex] ?? 0;
    valueOutSum = radiusPlus1 * currentPixelValue;
    valueSum += sumFactor * currentPixelValue;
    stack = stackStart;

    for (let i = 0; i < radiusPlus1; i++) {
      stack.value = currentPixelValue;
      stack = stack.next!;
    }

    for (let i = 1; i < radiusPlus1; i++) {
      pixelPosition = pixelIndex + (widthMinus1 < i ? widthMinus1 : i);
      currentPixelValue = values[pixelPosition] ?? 0;
      remainingBlurSteps = radiusPlus1 - i;
      stack.value = currentPixelValue;
      valueSum += currentPixelValue * remainingBlurSteps;
      valueInSum += currentPixelValue;
      stack = stack.next!;
    }

    stackIn = stackStart;
    stackOut = stackEnd;

    for (let x = 0; x < width; x++) {
      values[pixelIndex] = (valueSum * mul_sum) >> shg_sum;

      valueSum -= valueOutSum;
      valueOutSum -= stackIn!.value;

      // Calculate the new position based on the current x position and the radius
      let newPixelPosition = x + radius + 1;

      // Check if this new position is within the width boundary, and adjust if necessary
      if (newPixelPosition > widthMinus1) {
        newPixelPosition = widthMinus1;
      }

      // Calculate the final pixel position
      pixelPosition = ywPixelPosition + newPixelPosition;

      stackIn!.value = values[pixelPosition] ?? 0;
      valueInSum += values[pixelPosition] ?? 0;
      valueSum += valueInSum;
      stackIn = stackIn!.next;
      currentPixelValue = stackOut?.value ?? 0;
      valueOutSum += currentPixelValue;
      valueInSum -= currentPixelValue;
      stackOut = stackOut?.next;
      pixelIndex++;
    }
    ywPixelPosition += width;
  }

  for (let x = 0; x < width; x++) {
    valueInSum = valueSum = 0;
    pixelIndex = x;
    currentPixelValue = values[pixelIndex] ?? 0;
    valueOutSum = radiusPlus1 * currentPixelValue;
    valueSum += sumFactor * currentPixelValue;
    stack = stackStart;

    for (let i = 0; i < radiusPlus1; i++) {
      stack.value = currentPixelValue;
      stack = stack.next!;
    }
    yPixelPosition = width;

    for (let i = 1; i <= radius; i++) {
      pixelIndex = yPixelPosition + x;
      currentPixelValue = values[pixelIndex] ?? 0;
      remainingBlurSteps = radiusPlus1 - i;
      stack.value = currentPixelValue;
      valueSum += currentPixelValue * remainingBlurSteps;
      valueInSum += currentPixelValue;
      stack = stack.next!;
      if (i < heightMinus1) {
        yPixelPosition += width;
      }
    }

    pixelIndex = x;
    stackIn = stackStart;
    stackOut = stackEnd;

    for (let y = 0; y < height; y++) {
      values[pixelIndex] = (valueSum * mul_sum) >> shg_sum;
      valueSum -= valueOutSum;
      valueOutSum -= stackIn!.value;

      // Calculate the new position based on the current y position and the radius plus one
      let newPixelPosition = y + radiusPlus1;

      // Check if this new position is within the height boundary, and adjust if necessary
      if (newPixelPosition > heightMinus1) {
        newPixelPosition = heightMinus1;
      }

      pixelPosition = x + newPixelPosition * width;

      stackIn!.value = values[pixelPosition] ?? 0;
      valueInSum += values[pixelPosition] ?? 0;
      valueSum += valueInSum;
      stackIn = stackIn!.next;
      currentPixelValue = stackOut?.value ?? 0;
      valueOutSum += currentPixelValue;
      valueInSum -= currentPixelValue;
      stackOut = stackOut?.next;
      pixelIndex += width;
    }
  }
}

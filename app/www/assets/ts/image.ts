import cv from "@techstark/opencv-js";
import * as tractjs from "tractjs";

export function extractGrid(mat: cv.Mat, cellSize: number, cellsNumPerDim: number): [Quadrangle, Float32Array] | undefined {
  // Apply a threshold
  const grayMat = new cv.Mat(mat);
  cv.cvtColor(grayMat, grayMat, cv.COLOR_RGBA2GRAY);
  cv.adaptiveThreshold(grayMat, grayMat, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 10);
  // Detect contours within the image
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(grayMat, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
  hierarchy.delete();
  // Approximates each contour to polygon
  let largestQuad: Quadrangle | undefined;
  let largestArea = 0;
  for (let i = 0; i < (contours.size() as unknown as number); i++) {
    const approxContour = new cv.Mat();
    cv.approxPolyDP(contours.get(i), approxContour, 10, true);
    const quad = Quadrangle.fromContour(approxContour);
    if (quad !== undefined) {
      const area = cv.contourArea(approxContour);
      if (largestArea < area) {
        largestQuad = quad;
        largestArea = area;
      }
    }
    approxContour.delete();
  }
  contours.delete();
  const matArea = grayMat.size().width * grayMat.size().height;
  if (largestQuad !== undefined && largestArea / matArea > 0.35) {
    // Copy and project
    const gridSize = cellSize * cellsNumPerDim;
    const gridMat = transform(grayMat, largestQuad, gridSize);
    // Extract the data for each cell
    const gridData = new Float32Array(cellSize ** 2 * cellsNumPerDim ** 2);
    let i = 0;
    for (let cellY = 0; cellY < gridSize; cellY += cellSize) {
      for (let cellX = 0; cellX < gridSize; cellX += cellSize) {
        const cellData = new Float32Array(cellSize ** 2);
        for (let y = 0; y < cellSize; y++) {
          for (let x = 0; x < cellSize; x++) {
            cellData[y * cellSize + x] = gridMat.data[(cellY + y) * gridSize + (cellX + x)] / 255;
          }
        }
        gridData.set(cellData, i++ * cellSize ** 2);
      }
    }
    gridMat.delete();
    return [largestQuad, gridData];
  }
  grayMat.delete();
}

export async function recognizeDigit(gridData: Float32Array, inputShape: number[], model: tractjs.Model): Promise<number[]> {
  const tensor = new tractjs.Tensor(gridData, inputShape);
  const outputData = (await model.predict_one(tensor)).data;
  const batchSize = inputShape[0];
  const outputLen = outputData.length / batchSize;
  const digits: number[] = [];
  for (let i = 0; i < batchSize; i++) {
    const output = outputData.slice(i * outputLen, (i + 1) * outputLen);
    digits.push(output.indexOf(Math.max(...output)));
  }
  return digits;
}

export function writeImage(mat: cv.Mat, context: CanvasRenderingContext2D) {
  const data = new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows);
  context.putImageData(data, 0, 0);
}

function transform(srcMat: cv.Mat, srcCoord: Quadrangle, dstSize: number): cv.Mat {
  const srcCoordMat = cv.matFromArray(4, 2, cv.CV_32F, srcCoord.toArray());
  const dstCoordMat = cv.matFromArray(4, 2, cv.CV_32F, Quadrangle.fromTopLeftAndSize(0, 0, dstSize).toArray());
  const transformation = cv.getPerspectiveTransform(srcCoordMat, dstCoordMat);
  srcCoordMat.delete();
  dstCoordMat.delete();
  // TODO: Use gray mode
  const dstMat = new cv.Mat(dstSize, dstSize, cv.CV_8UC3);
  cv.warpPerspective(srcMat, dstMat, transformation, new cv.Size(dstSize, dstSize));
  transformation.delete();
  return dstMat;
}

class Point {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class Quadrangle {
  public topLeft: Point;
  public topRight: Point;
  public bottomLeft: Point;
  public bottomRight: Point;

  private constructor(topLeft: Point, topRight: Point, bottomLeft: Point, bottomRight: Point) {
    this.topLeft = topLeft;
    this.topRight = topRight;
    this.bottomLeft = bottomLeft;
    this.bottomRight = bottomRight;
  }

  public static fromContour(contour: cv.Mat): Quadrangle | undefined {
    if (contour.size().height != 4) {
      return;
    }
    const data = Array.from(contour.data32S);
    const points: Point[] = [];
    for (let i = 0; i < 4; i++) {
      points.push(new Point(data[i * 2], data[i * 2 + 1]));
    }
    points.sort((p1, p2) => p1.y - p2.y);
    let [topLeft, topRight, bottomLeft, bottomRight] = points;
    if (topLeft.x > topRight.x) {
      [topLeft, topRight] = [topRight, topLeft];
    }
    if (bottomLeft.x > bottomRight.x) {
      [bottomLeft, bottomRight] = [bottomRight, bottomLeft];
    }
    return new Quadrangle(topLeft, topRight, bottomLeft, bottomRight);
  }

  public static fromTopLeftAndSize(topLeftX: number, topLeftY: number, size: number): Quadrangle {
    return new Quadrangle(
      new Point(topLeftX, topLeftY),
      new Point(topLeftX + size, topLeftY),
      new Point(topLeftX, topLeftY + size),
      new Point(topLeftX + size, topLeftY + size)
    );
  }

  public toArray(): number[] {
    return [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight].map((p) => [p.x, p.y]).flat();
  }

  public get points(): Point[] {
    return [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight];
  }
}

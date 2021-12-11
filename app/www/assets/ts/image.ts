import cv from "@techstark/opencv-js";
import * as tractjs from "tractjs";

export function detectGridCoord(mat: cv.Mat, gridMat: cv.Mat): Quadrangle | undefined {
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
  const matArea = grayMat.cols * grayMat.rows;
  let gridCoord: Quadrangle | undefined = undefined;
  if (largestQuad !== undefined && largestArea > 0.35 * matArea) {
    // Copy and project
    transform(grayMat, largestQuad, gridMat, Quadrangle.fromSize(gridMat.cols, gridMat.rows));
    gridCoord = largestQuad;
  }
  grayMat.delete();
  return gridCoord;
}

export function extractData(gridMat: cv.Mat, cellWidth: number, cellHeight: number): Float32Array {
  const gridData = new Float32Array(gridMat.cols * gridMat.rows);
  let i = 0;
  // Extract the data for each cell
  for (let cellY = 0; cellY < gridMat.rows; cellY += cellHeight) {
    for (let cellX = 0; cellX < gridMat.cols; cellX += cellWidth) {
      const cellData = new Float32Array(cellWidth * cellHeight);
      for (let y = 0; y < cellHeight; y++) {
        for (let x = 0; x < cellWidth; x++) {
          cellData[y * cellHeight + x] = gridMat.data[(cellY + y) * gridMat.rows + (cellX + x)] / 255;
        }
      }
      gridData.set(cellData, i++ * cellData.length);
    }
  }
  return gridData;
}

export async function recognizeDigits(gridTensor: tractjs.Tensor, model: tractjs.Model): Promise<number[]> {
  const outputData = (await model.predict_one(gridTensor)).data;
  const batchSize = gridTensor.shape[0];
  const outputLen = outputData.length / batchSize;
  const digits: number[] = [];
  for (let i = 0; i < batchSize; i++) {
    const output = outputData.slice(i * outputLen, (i + 1) * outputLen);
    digits.push(output.indexOf(Math.max(...output)));
  }
  return digits;
}

export function renderDigits(mat: cv.Mat, coord: Quadrangle, gridDigits: number[][]) {
  const digitsMat = cv.Mat.zeros(400, 400, cv.CV_8UC4);
  digitsMat.setTo(new cv.Scalar(1, 1, 1, 1));
  const cellHeight = digitsMat.rows / gridDigits.length;
  for (let i = 0; i < gridDigits.length; i++) {
    const row = gridDigits[i];
    for (let j = 0; j < row.length; j++) {
      const digit = row[j];
      // TODO: Properly select font size and set anchor point to middle
      const cellWidth = digitsMat.cols / row.length;
      const position = new cv.Point(j * cellWidth + 15, (i + 1) * cellHeight - 10);
      cv.putText(digitsMat, `${digit}`, position, cv.FONT_HERSHEY_SIMPLEX, 1, new cv.Scalar(0, 0, 1, 1), 2);
    }
  }
  // Merge into rendered mat
  const renderedMat = cv.Mat.ones(mat.rows, mat.cols, cv.CV_8UC4);
  transform(digitsMat, Quadrangle.fromSize(digitsMat.cols, digitsMat.rows), renderedMat, coord, new cv.Scalar(1, 1, 1, 1));
  digitsMat.delete();
  cv.multiply(mat, renderedMat, mat); // Luckily `mat` has white background...
  renderedMat.delete();
}

export function writeImage(mat: cv.Mat, context: CanvasRenderingContext2D) {
  const data = new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows);
  context.putImageData(data, 0, 0);
}

function transform(srcMat: cv.Mat, srcCoord: Quadrangle, dstMat: cv.Mat, dstCoord: Quadrangle, border?: cv.Scalar) {
  const srcCoordMat = cv.matFromArray(4, 2, cv.CV_32F, srcCoord.toArray());
  const dstCoordMat = cv.matFromArray(4, 2, cv.CV_32F, dstCoord.toArray());
  const transformation = cv.getPerspectiveTransform(srcCoordMat, dstCoordMat);
  srcCoordMat.delete();
  dstCoordMat.delete();
  cv.warpPerspective(srcMat, dstMat, transformation, dstMat.size(), cv.INTER_LINEAR, cv.BORDER_CONSTANT, border ?? new cv.Scalar());
  transformation.delete();
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

  public static fromSize(width: number, height: number): Quadrangle {
    return new Quadrangle(new Point(0, 0), new Point(width, 0), new Point(0, height), new Point(width, height));
  }

  public toArray(): number[] {
    return [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight].map((p) => [p.x, p.y]).flat();
  }

  public get points(): Point[] {
    return [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight];
  }
}

import cv from "@techstark/opencv-js";

export function findGridCoord(mat: cv.Mat): number[] | undefined {
  const tempMat = new cv.Mat(mat);
  cv.cvtColor(tempMat, tempMat, cv.COLOR_RGBA2GRAY, 0);
  // Apply a threshold
  cv.adaptiveThreshold(tempMat, tempMat, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 10);
  // Detect contours within the image
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(tempMat, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
  tempMat.delete();
  hierarchy.delete();
  // Approximates each contour to polygon
  type Grid = { coord: number[]; area: number };
  let grid: Grid | undefined;
  for (let i = 0; i < (contours.size() as unknown as number); i++) {
    const approxContour = new cv.Mat();
    cv.approxPolyDP(contours.get(i), approxContour, 10, true);
    // Is it a quadrilateral contour?
    if (approxContour.size().height === 4) {
      const coord = Array.from(approxContour.data32S);
      const area = cv.contourArea(approxContour);
      // Find the largest
      if ((grid?.area ?? 0) < area) {
        grid = { coord, area };
      }
    }
    approxContour.delete();
  }
  contours.delete();
  return grid?.coord;
}

export function writeImage(mat: cv.Mat, context: CanvasRenderingContext2D) {
  const data = new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows);
  context.putImageData(data, 0, 0);
}

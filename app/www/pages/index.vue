<template>
  <div class="container">
    <canvas ref="canvas" :width="width" :height="height"></canvas>
    <video ref="video" autoplay></video>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import cv from "@techstark/opencv-js";
import * as tractjs from "tractjs";
import * as wasm from "wasm";
import { detectGridCoord, extractData, recognizeDigits, renderDigits, writeImage } from "~/assets/ts/image";

export default Vue.extend({
  data() {
    return {
      width: 0,
      height: 0,
    };
  },
  async mounted() {
    let idleTime: number | undefined = Date.now();
    let gridDigits: number[][] = [];
    // Start camera
    const video = this.$refs.video as HTMLVideoElement;
    video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    const { width, height } = video.srcObject.getVideoTracks()[0].getSettings();
    this.width = width!;
    this.height = height!;
    // Load model
    const CELL_SIZE = 20;
    const CELLS_NUM_PER_DIM = 9;
    const INPUT_SHAPE = [CELLS_NUM_PER_DIM ** 2, CELL_SIZE, CELL_SIZE, 1];
    const model = await tractjs.load("/model.onnx", {
      inputFacts: {
        0: ["float32", INPUT_SHAPE],
      },
    });
    // Get contexts
    const buffCanvas = document.createElement("canvas");
    buffCanvas.width = this.width;
    buffCanvas.height = this.height;
    const buffContext = buffCanvas.getContext("2d")!;
    const context = (this.$refs.canvas as HTMLCanvasElement).getContext("2d")!;
    // Detect the grid, solve it and show result
    const solve = async () => {
      buffContext.drawImage(video, 0, 0, this.width, this.height);
      const mat = cv.matFromImageData(buffContext.getImageData(0, 0, this.width, this.height));
      const gridSize = CELL_SIZE * CELLS_NUM_PER_DIM;
      const gridMat = new cv.Mat(gridSize, gridSize, cv.CV_8UC3); // TODO: Use gray mode
      const gridCoord = detectGridCoord(mat, gridMat);
      if (gridCoord !== undefined) {
        idleTime = undefined;
        if (gridDigits.length == 0) {
          const gridData = extractData(gridMat, CELL_SIZE, CELL_SIZE);
          const digits = await recognizeDigits(new tractjs.Tensor(gridData, INPUT_SHAPE), model);
          const solution = wasm.solve(digits);
          if (solution !== undefined) {
            gridDigits = [];
            for (let i = 0; i < solution.length / CELLS_NUM_PER_DIM; i++) {
              const row = solution.slice(i * CELLS_NUM_PER_DIM, (i + 1) * CELLS_NUM_PER_DIM);
              for (let j = 0; j < row.length; j++) {
                // Do not show provided digits
                if (digits[i * CELLS_NUM_PER_DIM + j] != 0) {
                  row[j] = 0;
                }
              }
              gridDigits.push(row);
            }
          }
        }
        renderDigits(mat, gridCoord, gridDigits);
        for (let point of gridCoord.points) {
          cv.circle(mat, new cv.Point(point.x, point.y), 8, new cv.Scalar(255, 255, 255, 255), cv.FILLED);
        }
      } else {
        if (idleTime === undefined) {
          idleTime = Date.now();
        } else if (Date.now() - idleTime > 2000) {
          gridDigits = [];
        }
      }
      writeImage(mat, context);
      mat.delete();
      gridMat.delete();
      requestAnimationFrame(solve);
    };
    requestAnimationFrame(solve);
  },
});
</script>

<style>
.container {
  text-align: center;
}
video {
  display: none;
}
</style>

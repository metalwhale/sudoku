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
import { extractGrid, recognizeDigit, writeImage } from "~/assets/ts/image";

export default Vue.extend({
  data() {
    return {
      width: 0,
      height: 0,
    };
  },
  async mounted() {
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
      const grid = extractGrid(mat, CELL_SIZE, CELLS_NUM_PER_DIM);
      if (grid !== undefined) {
        const [coord, data] = grid;
        const digits = await recognizeDigit(data, INPUT_SHAPE, model);
        console.log(digits);
        for (let point of coord.points) {
          cv.circle(mat, new cv.Point(point.x, point.y), 8, new cv.Scalar(255, 255, 255, 255), cv.FILLED);
        }
      }
      writeImage(mat, context);
      mat.delete();
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

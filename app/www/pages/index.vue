<template>
  <div class="container">
    <canvas ref="canvas" :width="videoWidth" :height="videoHeight"></canvas>
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
      videoWidth: 0,
      videoHeight: 0,
    };
  },
  async mounted() {
    const canvas = this.$refs.canvas as HTMLCanvasElement;
    const video = this.$refs.video as HTMLVideoElement;
    video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    const { width, height } = video.srcObject.getVideoTracks()[0].getSettings();
    this.videoWidth = width!;
    this.videoHeight = height!;
    const context = canvas.getContext("2d")!;
    const CELL_SIZE = 30;
    const CELLS_NUM_PER_DIM = 9;
    const INPUT_SHAPE = [CELLS_NUM_PER_DIM ** 2, CELL_SIZE, CELL_SIZE, 1];
    const model = await tractjs.load("/model.onnx", {
      inputFacts: {
        0: ["float32", INPUT_SHAPE],
      },
    });
    setInterval(async () => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      // TODO: `cv["onRuntimeInitialized"]`
      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      const mat = cv.matFromImageData(data);
      const grid = extractGrid(mat, CELL_SIZE, CELLS_NUM_PER_DIM);
      if (grid !== undefined) {
        const [coord, data] = grid;
        for (let point of coord.points) {
          cv.circle(mat, new cv.Point(point.x, point.y), 8, new cv.Scalar(255, 255, 255, 255), cv.FILLED);
        }
        const digits = await recognizeDigit(data, INPUT_SHAPE, model);
        console.log(digits);
      }
      writeImage(mat, context);
      mat.delete();
    }, 100);
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

<template>
  <div class="container">
    <canvas ref="canvas" width="640" height="480"></canvas>
    <video ref="video" autoplay></video>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import cv from "@techstark/opencv-js";
import { findGridCoord, writeImage } from "~/assets/ts/image";

export default Vue.extend({
  async mounted() {
    const canvas = this.$refs.canvas as HTMLCanvasElement;
    const video = this.$refs.video as HTMLVideoElement;
    video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    const context = canvas.getContext("2d")!;
    setInterval(() => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      // TODO: `cv["onRuntimeInitialized"]`
      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      const mat = cv.matFromImageData(data);
      const coord = findGridCoord(mat);
      if (coord) {
        for (let i = 0; i < 4; i++) {
          cv.circle(mat, new cv.Point(coord[i * 2], coord[i * 2 + 1]), 4, new cv.Scalar(255, 255, 255), 8);
        }
      }
      writeImage(mat, context);
      mat.delete();
    });
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

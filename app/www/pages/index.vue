<template>
  <Tutorial />
</template>

<script lang="ts">
import Vue from "vue";
import * as wasm from "wasm";

wasm.greet();
export default Vue.extend({});
</script>

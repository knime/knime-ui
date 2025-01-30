<script setup lang="ts">
import { onMounted, ref } from "vue";

// https://stackoverflow.com/a/52727222
const output = ref<number>(0);
const decimalPlaces = 2;
const updateEachSecond = 1;

// Cache values
// eslint-disable-next-line no-magic-numbers
const decimalPlacesRatio = Math.pow(10, decimalPlaces);
let timeMeasurements: number[] = [];
const lowestValue = ref<number>(Number.MAX_SAFE_INTEGER);

// Final output
let fps = 0;

const tick = function () {
  timeMeasurements.push(performance.now());

  const msPassed =
    timeMeasurements[timeMeasurements.length - 1] - timeMeasurements[0];

  if (msPassed >= updateEachSecond * 1000) {
    fps =
      Math.round(
        (timeMeasurements.length / msPassed) * 1000 * decimalPlacesRatio,
      ) / decimalPlacesRatio;
    timeMeasurements = [];
  }

  output.value = fps;

  if (fps !== 0 && fps < lowestValue.value) {
    lowestValue.value = fps;
  }

  requestAnimationFrame(() => {
    tick();
  });
};

onMounted(() => {
  tick();
});
</script>

<template>
  <div class="fps-meter">
    {{ output }} FPS (lowest:
    {{ lowestValue == Number.MAX_SAFE_INTEGER ? "-" : lowestValue }})
  </div>
</template>

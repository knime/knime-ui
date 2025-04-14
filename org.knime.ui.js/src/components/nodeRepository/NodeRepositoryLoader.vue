<script setup lang="ts">
import { computed } from "vue";

interface Props {
  progress?: number;
  extensionName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  extensionName: "",
});

const round = (value: number) => value.toFixed();

const rounded = computed(() => round(props.progress * 100));
</script>

<template>
  <div class="not-ready">
    <span id="progress-label">{{ rounded }}%</span>
    <progress
      :value="rounded"
      max="100"
      aria-labelledby="progress-label extension-name"
    />
    <div class="progress-message">
      <span id="extension-name">{{ extensionName }} </span>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.not-ready {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding: 20px;
  margin-top: 60px;
  font-family: "Roboto Condensed", sans-serif;
  font-size: 13px;
}

& span {
  padding: 10px 0;
}

/* In Firefox we have to use the <progress> element direcly to style the
unfinished part of the bar */
& progress {
  --color: var(--knime-yellow);
  --background: var(--knime-silver-sand);
  --radius: 10px;

  border-radius: var(--radius);
}

/* Firefox */
& progress[value]::-moz-progress-bar {
  border-radius: var(--radius);
  background: var(--color);
}

& progress[value] {
  width: 200px;
  height: 10px;
  margin: 0 10px;
  appearance: none;
}

& progress[value]::-webkit-progress-bar {
  border-radius: var(--radius);
  background: var(--background);
}

& progress[value]::-webkit-progress-value {
  border-radius: var(--radius);
  background: var(--color);
  transition: width 0.3s ease-in-out;
}

& .progress-message {
  display: flex;
  text-align: center;
}
</style>

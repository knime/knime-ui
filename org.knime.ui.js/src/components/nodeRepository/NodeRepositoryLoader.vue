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

const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const rounded = computed(() => round(props.progress * 100));
</script>

<template>
  <div class="not-ready">
    <span>{{ rounded }}%</span>
    <progress :value="rounded" max="100" />
    <div class="progress-message">
      <span>{{ extensionName }} </span>
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

& progress[value] {
  --color: var(--knime-yellow);
  --background: var(--knime-silver-sand);

  width: 200px;
  height: 10px;
  margin: 0 10px;
  appearance: none;
}

& progress[value]::-webkit-progress-bar {
  border-radius: 10px;
  background: var(--background);
}

& progress[value]::-webkit-progress-value {
  border-radius: 10px;
  background: var(--color);
  transition: width 1s ease-in-out;
}

& .progress-message {
  display: flex;
  text-align: center;
}
</style>

<script setup lang="ts">
interface Props {
  nodeRepositoryLoadingProgress: {
    progress: number;
    extensionName: string;
  };
}

defineProps<Props>();
</script>

<template>
  <div class="not-ready">
    <progress :value="nodeRepositoryLoadingProgress.progress" max="100">
      {{ nodeRepositoryLoadingProgress.progress * 100 }}%
    </progress>
    <div class="progress-message">
      <span>{{ nodeRepositoryLoadingProgress.progress * 100 }}%</span>
      <span>Loading: {{ nodeRepositoryLoadingProgress.extensionName }} </span>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.not-ready {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding: 10px;
  margin-top: 60px;
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
  transition: width 2.5s ease-in-out;
}

& .progress-message {
  display: flex;
  flex-direction: column;
  margin-top: 30px;
}
</style>

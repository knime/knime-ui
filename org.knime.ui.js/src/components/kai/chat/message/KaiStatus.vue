<script setup lang="ts">
import LoadingIcon from "@knime/styles/img/icons/reload.svg";

interface Props {
  status?: string;
}

const props = defineProps<Props>();
</script>

<template>
  <div v-if="props.status" class="status">
    <LoadingIcon class="loading-icon" />
    {{ props.status }}
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

@keyframes rotate-animation {
  0% {
    transform: rotate(360deg);
  }

  100% {
    transform: rotate(0deg);
  }
}

& .status {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  padding-top: var(--space-12);

  & svg.loading-icon {
    animation: rotate-animation 2s linear infinite;

    @mixin svg-icon-size 14;
  }
}
</style>

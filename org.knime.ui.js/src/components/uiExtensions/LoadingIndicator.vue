<script setup lang="ts">
import ReloadIcon from "@knime/styles/img/icons/reload.svg";

type Props = {
  message: string;
};

defineProps<Props>();
</script>

<template>
  <div class="load-wrapper">
    <span>
      <ReloadIcon class="loading-icon" />

      {{ message }}
    </span>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

@keyframes spin {
  100% {
    transform: rotate(-360deg);
  }
}

@keyframes show {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.load-wrapper {
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;

  /* Wait for a short amount of time before rendering loading placeholder
    to prevent flickering when the table loads very quickly */
  animation: show 100ms ease-in 150ms;
  animation-fill-mode: both;

  & span {
    font-size: 16px;
    font-style: italic;
    color: var(--knime-masala);
    text-align: center;

    & .loading-icon {
      @mixin svg-icon-size 24;

      margin: auto;
      margin-right: 10px;
      vertical-align: -6px;
      stroke: var(--knime-masala);
      animation: spin 2s linear infinite;
    }
  }
}
</style>

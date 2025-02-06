<script setup lang="ts">
/** Blocks the whole UI */
import { nextTick, ref, watch } from "vue";

import { useGlobalBusListener } from "@/composables/useGlobalBusListener";

const block = ref(false);
const darkenBackground = ref(false);

const blocker = ref<HTMLElement | null>(null);

const focus = async () => {
  await nextTick();
  blocker.value?.focus();
};

useGlobalBusListener({
  eventName: "block-ui",
  handler: (config = {}) => {
    block.value = true;
    darkenBackground.value = Boolean(config.darkenBackground);
  },
});

useGlobalBusListener({
  eventName: "unblock-ui",
  handler: () => {
    block.value = false;
    darkenBackground.value = false;
  },
});

watch(block, () => {
  if (block.value) {
    focus();
  } else {
    // reset darken on unblock
    darkenBackground.value = false;
  }
});
</script>

<template>
  <div
    v-show="block"
    ref="blocker"
    :class="['blocker', { 'darken-background': darkenBackground }]"
    tabindex="-1"
    @click.prevent.stop
    @pointerdown.prevent.stop
    @keydown.stop.prevent
  />
</template>

<style lang="postcss" scoped>
.blocker {
  display: flex;
  outline: none;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  z-index: calc(v-bind("$zIndices.layerBlockingOverlay"));
  position: fixed;
  width: 100vw;
  height: 100vh;
  background: transparent;

  &.darken-background {
    background: var(--knime-black-semi);
  }
}
</style>

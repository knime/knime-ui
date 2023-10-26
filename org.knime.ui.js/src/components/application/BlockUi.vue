<script setup lang="ts">
/** Blocks the whole UI */
import { $bus } from "@/plugins/event-bus";
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";

const block = ref(false);
const darkenBackground = ref(false);

const blocker = ref<HTMLElement>(null);

const focus = async () => {
  await nextTick();
  blocker.value.focus();
};

onMounted(() => {
  $bus.on("desktop-api-function-block-ui", (config) => {
    block.value = config.block;
    darkenBackground.value = config.darkenBackground;
  });
});

onBeforeUnmount(() => {
  $bus.off("desktop-api-function-block-ui");
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
  z-index: 100;
  position: fixed;
  width: 100vw;
  height: 100vh;
  background: transparent;

  &.darken-background {
    background: var(--knime-black-semi);
  }
}
</style>

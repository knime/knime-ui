<script setup lang="ts">
import { ref, toRefs, watch, nextTick } from "vue";

const blocker = ref<HTMLElement>(null);

const focus = async () => {
  await nextTick();
  blocker.value.focus();
};

interface Props {
  showBlocker?: boolean;
  darkenBackground?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  showBlocker: false,
  darkenBackground: false,
});

// focus on show
const { showBlocker } = toRefs(props);
watch(showBlocker, () => {
  if (showBlocker.value) {
    focus();
  }
});
</script>

<template>
  <div
    v-show="showBlocker"
    ref="blocker"
    :class="['blocker', { 'darken-background': darkenBackground }]"
    tabindex="-1"
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

  &.darken-background {
    background: rgba(0 0 0 / 40%);
  }
}
</style>

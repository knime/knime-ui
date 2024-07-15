<script setup lang="ts">
import { nextTick, ref, toRefs, watch } from "vue";
import { useFloating, offset, shift } from "@floating-ui/vue";

interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();

const { isOpen } = toRefs(props);

const toolbarElement = ref<HTMLElement | null>(null);
const toolbarDialogElement = ref<HTMLElement | null>(null);

const yOffset = 20;
const { floatingStyles, update: updateFloating } = useFloating(
  toolbarElement,
  toolbarDialogElement,
  {
    placement: "bottom",
    strategy: "absolute",
    middleware: [offset({ mainAxis: yOffset }), shift()],
  },
);

watch(isOpen, async () => {
  await nextTick();
  if (isOpen.value) {
    updateFloating();
  }
});
</script>

<template>
  <div ref="toolbarElement">
    <slot name="toggle" />
  </div>

  <div
    v-if="isOpen"
    ref="toolbarDialogElement"
    class="dialog"
    :style="floatingStyles"
  >
    <slot name="content" />
  </div>
</template>

<style lang="postcss" scoped>
.dialog {
  background: white;
  box-shadow: var(--shadow-elevation-1);
}
</style>

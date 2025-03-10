<script setup lang="ts">
import { ref, toRef } from "vue";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import {
  type FloatingContainerProperties,
  useCanvasFloatingContainer,
} from "../../CanvasAnchoredComponents";

import { useFloatingMenuClickaway } from "./useFloatingMenuClickaway";

defineOptions({ inheritAttrs: false });

type Props = FloatingContainerProperties;

const props = withDefaults(defineProps<Props>(), {
  focusTrap: false,
  closeOnEscape: false,
  disableInteractions: false,
});

const emit = defineEmits(["menuClose"]);

const canvasStore = useWebGLCanvasStore();

const rootEl = ref<HTMLDivElement>();

useCanvasFloatingContainer({
  rootEl,
  closeMenu: () => emit("menuClose"),
  canvasStore,
});

useFloatingMenuClickaway({
  rootEl,
  focusTrap: toRef(props, "focusTrap"),
  onClickaway: () => emit("menuClose"),
});
</script>

<template>
  <Portal to="canvas-anchored-container">
    <div ref="rootEl">
      <slot />
    </div>
  </Portal>
</template>

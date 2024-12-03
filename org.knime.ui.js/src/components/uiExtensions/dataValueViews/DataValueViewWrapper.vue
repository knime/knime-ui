<script setup lang="ts">
import { type Ref, computed, onMounted, onUnmounted, ref } from "vue";
import type { ClientRectObject } from "@floating-ui/vue";

import { FunctionButton } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";

import DataValueViewLoader, {
  type Props as DataValueViewLoaderProps,
} from "./DataValueViewLoader.vue";
import ResizableComponentWrapper from "./ResizableComponentWrapper.vue";
import {
  useDataValueViewSize,
  useDraggableElement,
  useDraggableResizableRectState,
  useFloatingDataValueView,
} from "./useDataValueView";

export type Props = DataValueViewLoaderProps & {
  anchor: Ref<ClientRectObject | null>;
};

const props = defineProps<Props>();

const SESSION_STORAGE_KEY = "data-value-view-resized-size";

const elementWasResized = ref(false);
const dataValueViewWrapper = ref<HTMLElement | null>(null);

const { floatingStyles } = useFloatingDataValueView(dataValueViewWrapper, {
  anchor: props.anchor,
});

const PADDING_TOP = 32; // var(--space-32)
const PADDING = 8; // var(--space-8)
const {
  height: dataValueViewHeight,
  width: dataValueViewWidth,
  minSize: minLoaderSize,
} = useDataValueViewSize();

const defaultWidth = computed(() => dataValueViewWidth.value + 2 * PADDING);
const defaultHeight = computed(
  () => dataValueViewHeight.value + PADDING_TOP + PADDING,
);

const { state: rectState, setRect } = useDraggableResizableRectState();

const { isDragging } = useDraggableElement(
  dataValueViewWrapper,
  rectState,
  setRect,
);

const styles = computed(() => {
  const { left, top, width, height } = rectState.value;
  return {
    ...floatingStyles.value,
    left: `${left}px`,
    top: `${top}px`,
    width: `${elementWasResized.value ? width : defaultWidth.value}px`,
    height: `${elementWasResized.value ? height : defaultHeight.value}px`,
    padding: `${PADDING_TOP}px ${PADDING}px ${PADDING}px`,
  };
});

onMounted(() => {
  const initialRect = {
    top: 0,
    left: 0,
    width: defaultWidth.value,
    height: defaultHeight.value,
  };
  const resizedSizes = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (resizedSizes) {
    const { width, height } = JSON.parse(resizedSizes);
    initialRect.width = width;
    initialRect.height = height;
    elementWasResized.value = true;
  }
  setRect(initialRect);
});

onUnmounted(() => {
  if (elementWasResized.value) {
    const { width, height } = rectState.value;
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ width, height }),
    );
  }
});

const emit = defineEmits(["close"]);
</script>

<template>
  <ResizableComponentWrapper
    ref="dataValueViewWrapper"
    class="data-value-view-element"
    :min-size="minLoaderSize"
    :rect-state="rectState"
    :style="styles"
    draggable
    @custom-resize.once="elementWasResized = true"
    @custom-resize="setRect"
  >
    <FunctionButton compact class="close-button" @click="() => emit('close')">
      <CloseIcon />
    </FunctionButton>
    <DataValueViewLoader
      :tabindex="-1"
      class="data-value-view-loader"
      :style="isDragging ? { pointerEvents: 'none' } : {}"
      :project-id="projectId"
      :workflow-id="workflowId"
      :node-id="nodeId"
      :selected-port-index="selectedPortIndex"
      :selected-row-index="selectedRowIndex"
      :selected-col-index="selectedColIndex"
    />
  </ResizableComponentWrapper>
</template>

<style lang="postcss" scoped>
.data-value-view-element {
  z-index: v-bind("$zIndices.layerFloatingWindows");
  border-radius: 8px;
  background-color: var(--knime-porcelain);
  box-shadow: var(--shadow-elevation-2);
  cursor: move;

  & .close-button {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
  }

  & .data-value-view-loader {
    border-radius: 8px;
  }
}
</style>

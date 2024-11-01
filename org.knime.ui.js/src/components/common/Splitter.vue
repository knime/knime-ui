<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable no-use-before-define -->
<!-- eslint-disable func-style -->
<script setup lang="ts">
// A simple 2 panel splitter component that works with pixels or percent
// based on vue-splitter: https://github.com/rmp135/vue-splitter (MIT)
// some modifications have been done:
// * add pixel mode
// * added events (drag-start drag-end)
// * added splitterSize prop
// * added ability to define the panel for which the size will be set (important for pixel mode)
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    isHorizontal?: boolean;
    sizePane?: "left" | "right" | "top" | "bottom";
    usePixel?: boolean;
    percent?: number | null;
    pixel?: number | null;
    initialPercent?: number | string;
    initialPixel?: number | string;
    splitterSize?: number;
    splitterTitle?: string;
    //ID added for testing purposes to differentiate between splitters
    splitterId?: string;
  }>(),
  {
    percent: null,
    pixel: null,
    sizePane: "left",
    usePixel: false,
    isHorizontal: false,
    initialPercent: 50,
    initialPixel: 250,
    splitterSize: 8,
    splitterTitle: "",
    splitterId: "",
  },
);

const emit = defineEmits<{
  (event: "update:percent", value: number): void;
  (event: "update:pixel", value: number): void;
  (event: "drag-start"): void;
  (event: "drag-end"): void;
  (event: "splitter-click"): void;
}>();

const isActive = ref(false);
const currentPercent = ref(Number(props.initialPercent));
const currentPixel = ref(Number(props.initialPixel));
const hasMoved = ref(false);
const dragOffset = ref(0);

const containerRef = ref<HTMLElement>();

const modelPercent = computed<number>({
  get() {
    return props.percent ?? currentPercent.value;
  },
  set(value) {
    emit("update:percent", value);
    currentPercent.value = value;
  },
});

const modelPixel = computed<number>({
  get() {
    return props.pixel ?? currentPixel.value;
  },
  set(value) {
    emit("update:pixel", value);
    currentPixel.value = value;
  },
});

const templateSizes = computed<string>(() => {
  const size = props.usePixel
    ? `${modelPixel.value}px`
    : `${modelPercent.value}%`;
  return ["top", "left"].includes(props.sizePane)
    ? `${size} auto 1fr`
    : `1fr auto ${size}`;
});

const leftPaneClass = computed(() =>
  props.isHorizontal ? "top-pane" : "left-pane",
);
const rightPaneClass = computed(() =>
  props.isHorizontal ? "bottom-pane" : "right-pane",
);
const gridTemplate = computed(() =>
  props.isHorizontal
    ? `${templateSizes.value} / none`
    : `none / ${templateSizes.value}`,
);
const userSelect = computed(() => (isActive.value ? "none" : "auto"));

function addBodyListeners() {
  window.addEventListener("mousemove", onBodyMouseMove);
  window.addEventListener("touchmove", onBodyTouchMove);
  window.addEventListener("touchend", onBodyUp, { once: true });
  window.addEventListener("mouseup", onBodyUp, { once: true });
}

function onSplitterDown() {
  emit("drag-start");
  isActive.value = true;
  hasMoved.value = false;
  addBodyListeners();
}

function onSplitterClick() {
  if (!hasMoved.value) {
    emit("splitter-click");
  }
}

function onSplitterMouseDown(e: MouseEvent) {
  dragOffset.value = props.isHorizontal ? e.offsetY : e.offsetX;
  onSplitterDown();
}

function onSplitterTouchDown() {
  dragOffset.value = 0;
  onSplitterDown();
}

function calculateSplitterPercent(e: MouseEvent | Touch) {
  let offset = dragOffset.value;
  let target = containerRef.value as HTMLElement;
  let containerOffset = 0;
  let pixel = 0;
  if (props.isHorizontal) {
    offset += target.offsetTop;
    while (target.offsetParent) {
      target = target.offsetParent as HTMLElement;
      offset += target.offsetTop;
    }
    pixel = e.pageY - offset;
    containerOffset = containerRef.value!.offsetHeight;
  } else {
    offset += target.offsetLeft;
    while (target.offsetParent) {
      target = target.offsetParent as HTMLElement;
      offset += target.offsetLeft;
    }
    pixel = e.pageX - offset;
    containerOffset = containerRef.value!.offsetWidth;
  }

  const percent = Math.floor((pixel / containerOffset) * 10000) / 100;
  const splitterSizeInPercent =
    Math.floor((props.splitterSize / containerOffset) * 10000) / 100;

  if (percent > 0 && percent < 100) {
    const sizeLastPane = ["bottom", "right"].includes(props.sizePane);
    modelPercent.value = sizeLastPane
      ? 100 - percent - splitterSizeInPercent
      : percent;
    modelPixel.value = sizeLastPane
      ? containerOffset - pixel - props.splitterSize
      : pixel;
    hasMoved.value = true;
  }
}

function onBodyTouchMove(e: TouchEvent) {
  if (isActive.value) {
    calculateSplitterPercent(e.touches[0]);
  }
}

function onBodyMouseMove(e: MouseEvent) {
  if (e.buttons && e.buttons === 0) {
    isActive.value = false;
    removeBodyListeners();
  }
  if (isActive.value) {
    calculateSplitterPercent(e);
  }
}

function removeBodyListeners() {
  window.removeEventListener("touchmove", onBodyTouchMove);
  window.removeEventListener("mousemove", onBodyMouseMove);
}

function onBodyUp() {
  emit("drag-end");
  isActive.value = false;
  removeBodyListeners();
}
</script>

<template>
  <div
    ref="containerRef"
    :style="{ userSelect, gridTemplate }"
    class="vue-splitter"
    :class="{ horizontal: isHorizontal, vertical: !isHorizontal }"
  >
    <div class="splitter-pane" :class="leftPaneClass">
      <slot name="left-pane" />
      <slot name="top-pane" />
    </div>
    <div
      class="splitter"
      :splitter-id="splitterId"
      :class="{ active: isActive }"
      :title="splitterTitle"
      @mousedown="onSplitterMouseDown"
      @touchstart.passive="onSplitterTouchDown"
      @click="onSplitterClick"
    >
      <slot name="splitter" />
    </div>
    <div class="splitter-pane" :class="rightPaneClass">
      <slot name="right-pane" />
      <slot name="bottom-pane" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.vue-splitter {
  --splitter-background-color: var(--knime-silver-sand-semi);

  display: grid;
  height: inherit;

  & .splitter {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--splitter-background-color);
  }

  & .splitter-pane {
    overflow-y: auto;
  }

  &.vertical {
    width: 100%;

    & > .splitter {
      cursor: ew-resize;
      width: calc(v-bind(splitterSize) * 1px);
    }
  }

  &.horizontal {
    height: 100%;

    & > .splitter {
      cursor: ns-resize;
      height: calc(v-bind(splitterSize) * 1px);
    }
  }
}
</style>

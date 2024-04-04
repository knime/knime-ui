<script setup lang="ts">
// Offers a primary and a secondary slot that are split horizontal or vertical. Percent or pixel based sizes
// which can be limited. Click to the splitter will hide the secondary panel.
import { computed, ref, toRef, watch } from "vue";
import Splitter from "./Splitter.vue";

interface Props {
  isHorizontal: boolean;
  secondarySize?: number;
  secondaryMinSize?: number;
  secondaryMaxSize?: number;
  usePixel?: boolean;
  showSecondaryPanel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  secondarySize: 40,
  secondaryMinSize: 15,
  secondaryMaxSize: 70,
  usePixel: false,
  isHorizontal: false,
  showSecondaryPanel: true,
});

interface Emits {
  (e: "update:secondarySize", size: number): void;
}
const emit = defineEmits<Emits>();

// min max to bounds given by props, but allow 0 (hide)
const minMax = (value: number) =>
  value === 0
    ? value
    : Math.max(props.secondaryMinSize, Math.min(props.secondaryMaxSize, value));

// current size live updated while resize
const percentSize = ref(props.secondarySize);
const pixelSize = ref(props.secondarySize);

watch(
  toRef(props, "showSecondaryPanel"),
  (show) => {
    if (!show) {
      percentSize.value = 0;
      pixelSize.value = 0;
    }
  },
  { immediate: true },
);

const modelPercentSize = computed({
  get() {
    return percentSize.value;
  },
  set(size) {
    const value = minMax(size);
    percentSize.value = value;
    if (!props.usePixel) {
      emit("update:secondarySize", value);
    }
  },
});

const modelPixelSize = computed({
  get() {
    return pixelSize.value;
  },
  set(size) {
    const value = minMax(size);
    pixelSize.value = minMax(size);
    if (props.usePixel) {
      emit("update:secondarySize", value);
    }
  },
});

const currentSecondarySize = computed({
  get() {
    return props.usePixel ? modelPixelSize.value : modelPercentSize.value;
  },
  set(size) {
    if (props.usePixel) {
      modelPixelSize.value = size;
    } else {
      modelPercentSize.value = size;
    }
  },
});

// the last really defined size (which is never 0 for hidden)
// start with secondary size to ensure that we open closed ones to a nice size
const previousSecondarySize = ref(props.secondarySize);

// computed states
const isClosed = computed(() => currentSecondarySize.value === 0);

const closePanel = () => {
  // remember current size on a regular close
  previousSecondarySize.value = currentSecondarySize.value;
  currentSecondarySize.value = 0;
};

const showPanel = () => {
  currentSecondarySize.value = Math.max(
    props.secondaryMinSize,
    previousSecondarySize.value,
  );
};

// hide or show on click
const onSplitterClick = () => {
  if (isClosed.value) {
    showPanel();
  } else {
    closePanel();
  }
};
</script>

<template>
  <Splitter
    v-model:percent="modelPercentSize"
    v-model:pixel="modelPixelSize"
    :use-pixel="usePixel"
    size-pane="right"
    :is-horizontal="isHorizontal"
    @splitter-click="onSplitterClick"
  >
    <template #left-pane>
      <slot />
    </template>
    <template #right-pane>
      <slot v-if="!isClosed" name="secondary" />
    </template>
  </Splitter>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");
</style>

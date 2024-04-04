<script setup lang="ts">
// Offers a primary and a secondary slot that are split horizontal or vertical. Percent or pixel based sizes
// which can be limited. Click to the splitter will hide the secondary panel.
import { computed, ref, toRef, watch } from "vue";
import Splitter from "./Splitter.vue";
import SwitchIcon from "webapps-common/ui/assets/img/icons/arrow-next.svg";

interface Props {
  isHorizontal: boolean;
  secondarySize?: number;
  secondaryMinSize?: number;
  secondarySnapSize?: number;
  secondaryMaxSize?: number;
  usePixel?: boolean;
  showSecondaryPanel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  secondarySize: 40,
  secondarySnapSize: 0,
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

const willSnap = computed(() => {
  if (props.usePixel) {
    return props.secondarySnapSize > pixelSize.value;
  }
  return props.secondarySnapSize > percentSize.value;
});

const modelPercentSize = computed({
  get() {
    return percentSize.value;
  },
  set(size) {
    const adjustedSize = minMax(size);
    percentSize.value = adjustedSize;
    if (!props.usePixel) {
      emit("update:secondarySize", adjustedSize);
    }
  },
});

const modelPixelSize = computed({
  get() {
    return pixelSize.value;
  },
  set(size) {
    const adjustedSize = minMax(size);
    pixelSize.value = adjustedSize;
    if (props.usePixel) {
      emit("update:secondarySize", adjustedSize);
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

const onDragEnd = () => {
  if (willSnap.value) {
    pixelSize.value = 0;
    percentSize.value = 0;
  } else {
    // remember last size if we did not snap
    previousSecondarySize.value = currentSecondarySize.value;
  }
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
    :splitter-size="10"
    :class="{ 'will-snap': willSnap }"
    :splitter-title="`Click to ${isClosed ? 'open' : 'close'}`"
    @splitter-click="onSplitterClick"
    @drag-end="onDragEnd"
    @drag-start="onDragStart"
  >
    <template #left-pane>
      <slot />
    </template>
    <template #splitter>
      <SwitchIcon
        class="switch-icon"
        :class="{
          closed: isClosed,
          horizontal: isHorizontal,
          vertical: !isHorizontal,
        }"
      />
    </template>
    <template #right-pane>
      <div class="secondary-wrapper" :class="{ 'will-snap': willSnap }">
        <slot v-if="!isClosed" name="secondary" />
      </div>
    </template>
  </Splitter>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.secondary-wrapper {
  width: 100%;
  height: 100%;
}

.switch-icon {
  @mixin svg-icon-size 10;

  stroke: var(--knime-masala);
  position: relative;

  &:not(.closed) {
    visibility: hidden;
  }

  &.vertical {
    &.closed {
      transform: scaleX(-1);
    }
  }

  &.horizontal {
    transform: rotate(90deg);

    &.closed {
      transform: rotate(-90deg);
    }
  }
}

/* snap overlay and message */
.will-snap {
  --will-snap-background-color: var(--knime-porcelain);
  --splitter-background-color: var(--will-snap-background-color);
}

.secondary-wrapper.will-snap {
  position: relative;

  &::after {
    position: absolute;
    content: "Release to hide panel.";
    display: flex;
    font-style: italic;
    justify-content: center;
    align-items: center;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--will-snap-background-color);
  }
}
</style>

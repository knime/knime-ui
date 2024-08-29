<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  toRefs,
  onMounted,
  nextTick,
  onBeforeUnmount,
} from "vue";

/**
 * A <foreignObject> that can be used in SVG to render HTML. It automatically updates the size based on the contents.
 * Updates to the contents can be done via `adjustDimensions` method.
 * It offers limits to the size and always centers around a given parentWidth. It issues 'width' and 'height' events
 * when the size is adjusted so other drawings can update.
 */

type Props = {
  value?: string;
  maxWidth?: number;
  yOffset: number;
  offsetByHeight?: boolean;
  parentWidth?: number | null;
};

const props = withDefaults(defineProps<Props>(), {
  value: "",
  maxWidth: 1000,
  yOffset: 0,
  offsetByHeight: false,
  parentWidth: null,
});

const emit = defineEmits<{
  (e: "widthChange", width: number): void;
  (e: "heightChange", height: number): void;
}>();

const { maxWidth, parentWidth, offsetByHeight, yOffset } = toRefs(props);
const width = ref(0);
const height = ref(1);
const x = ref(0);
const wrapper = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver;

const y = computed(() => {
  if (offsetByHeight.value) {
    return -height.value + yOffset.value;
  }
  return yOffset.value;
});

watch(
  maxWidth,
  () => {
    width.value = maxWidth.value;
  },
  { immediate: true },
);

const centerAroundParentWidth = () => {
  if (parentWidth.value !== null) {
    x.value = (parentWidth.value - width.value) / 2;
  }
};

const emitDimensions = () => {
  emit("widthChange", width.value);
  emit("heightChange", height.value);
};

onMounted(async () => {
  centerAroundParentWidth();
  await nextTick();

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { contentRect } = entry;
      // The value is floored to avoid excessive executions of the resize observer,
      // which can occur due to minor changes in the width's decimal places.
      width.value = Math.floor(contentRect.width);
      height.value = contentRect.height;
      centerAroundParentWidth();
      emitDimensions();
    }
  });

  resizeObserver.observe(wrapper.value!);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <foreignObject
    class="autosize-container"
    :width="width"
    :height="height"
    :x="x"
    :y="y"
  >
    <!-- wrapper is used to calculate size -->
    <div ref="wrapper" class="wrapper">
      <slot />
    </div>
  </foreignObject>
</template>

<style lang="postcss" scoped>
.autosize-container {
  & .wrapper {
    display: block;
    padding: 0;
    margin: auto;
    border: 0;

    /* solves many problems with inline-blocks such as whitespace; https://caniuse.com/intrinsic-width */
    /* stylelint-disable-next-line value-no-vendor-prefix */
    width: -moz-fit-content;
    width: fit-content;
  }
}
</style>

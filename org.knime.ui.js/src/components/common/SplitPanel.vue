<script setup lang="ts">
// @ts-ignore
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import { computed, ref } from "vue";

interface Props {
  id: string;
  direction?: "left" | "right" | "down" | "up";
  secondarySize?: number;
  secondaryMinSize?: number;
  mainMinSize?: number;
  withTransition?: boolean;
  showSecondaryPanel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  direction: "left",
  secondarySize: 40,
  secondaryMinSize: 15,
  mainMinSize: 25,
  withTransition: false,
  showSecondaryPanel: true,
});

interface Emits {
  (e: "update:secondarySize", size: number): void;
}
const emit = defineEmits<Emits>();

// current size live updated while resize
const currentSecondarySize = ref(props.secondarySize);

// the last really defined size (which is never 0 for hidden)
// start with secondary size to ensure that we open closed ones to a nice size
const previousSecondarySize = ref(props.secondarySize);

// computed states
const mainSize = computed(() => 100 - currentSecondarySize.value);
const isClosed = computed(() => mainSize.value === 100);

const isSecondaryReverse = computed(
  () => props.direction === "left" || props.direction === "up",
);

const isHorizontal = computed(
  () => props.direction === "up" || props.direction === "down",
);

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

const isResizing = ref(false);

const onResized = ({ size }: { size: number }) => {
  // snapping on release of mouse (resize is done)
  if (size < props.secondaryMinSize && size > 0) {
    // just set to zero on a snapping close (we want to keep the prev value)
    currentSecondarySize.value = 0;
    return;
  }
  // update prev size if it did not snap
  previousSecondarySize.value = size;
  emit("update:secondarySize", size);
  isResizing.value = false;
};

// update our current size on every resize
const onResize = ({ size }: { size: number }) => {
  isResizing.value = true;
  currentSecondarySize.value = size;
};
</script>

<template>
  <splitpanes
    :id="id"
    class="split-panel"
    :dbl-click-splitter="false"
    :horizontal="isHorizontal"
    :class="{
      'is-closed': isClosed,
      'unset-transition': !withTransition,
      'left-facing-splitter': direction === 'left',
      'right-facing-splitter': direction === 'right',
      'down-facing-splitter': direction === 'down',
      'up-facing-splitter': direction === 'up',
    }"
    @splitter-click="onSplitterClick"
    @resized="onResized($event[isSecondaryReverse ? 0 : 1])"
    @resize="onResize($event[isSecondaryReverse ? 0 : 1])"
  >
    <pane
      v-if="isSecondaryReverse && showSecondaryPanel"
      :size="currentSecondarySize"
      :class="[
        'secondary-panel',
        {
          'is-resizing': isResizing,
          'will-snap': currentSecondarySize < secondaryMinSize,
        },
      ]"
    >
      <slot v-if="!isClosed" name="secondary" />
    </pane>
    <pane :size="mainSize" :min-size="mainMinSize" class="main-panel">
      <slot />
    </pane>
    <pane
      v-if="!isSecondaryReverse && showSecondaryPanel"
      :size="currentSecondarySize"
      :class="[
        'secondary-panel',
        {
          'is-resizing': isResizing,
          'will-snap': currentSecondarySize < secondaryMinSize,
        },
      ]"
    >
      <slot v-if="!isClosed" name="secondary" />
    </pane>
  </splitpanes>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

/* NB: we disable the rule because of classes defined by the splitpanes package */
/* stylelint-disable selector-class-pattern */
/* stylelint-disable no-descending-specificity */
.split-panel {
  /* drag area for splitter */
  & :deep(> .splitpanes__splitter) {
    position: relative;

    &::after {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      opacity: 0;
      z-index: 1;
    }

    &:hover::after {
      opacity: 1;
    }
  }

  &.splitpanes--vertical :deep(> .splitpanes__splitter)::after {
    left: -5px;
    right: -5px;
    height: 100%;
  }

  &.splitpanes--horizontal :deep(> .splitpanes__splitter)::after {
    top: -5px;
    bottom: -5px;
    width: 100%;
  }

  & .is-resizing {
    /** if the content is an iframe it might steal our mousemove and we want to prevent that */
    pointer-events: none;
  }

  /* snap overlay and message */
  & .will-snap {
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
      background-color: var(--knime-porcelain);
    }
  }

  /* style open state and some defaults */
  & :deep(.splitpanes__splitter) {
    min-width: 1px;
    min-height: 1px;
    background-color: var(--knime-porcelain);
    border-color: var(--knime-silver-sand);
    border-style: solid;

    &:hover {
      background-color: var(--knime-silver-sand-semi);
    }

    &::before {
      width: 10px;
      height: 10px;
      line-height: 10px;
      display: none;

      /* down arrow: embedded svg as it needs to have the correct color and size because it is used as image */
      content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='none'%3E%3Cpath stroke='%233E3A39' stroke-linejoin='round' stroke-miterlimit='10' d='M9.125 2.938 5 7.061.875 2.938'/%3E%3C/svg%3E");
    }
  }

  &.is-closed {
    & :deep(> .splitpanes__splitter) {
      min-width: 11px;
      min-height: 11px;

      &::before {
        display: block;
      }
    }
  }

  &.splitpanes--vertical {
    & :deep(> .splitpanes__splitter) {
      &::before {
        position: relative;
        top: calc(50% - 5px);
      }
    }
  }

  &.splitpanes--horizontal {
    & :deep(> .splitpanes__splitter) {
      &::before {
        margin: auto;
      }
    }
  }

  &.left-facing-splitter {
    & :deep(> .splitpanes__splitter) {
      border-width: 0 1px 0 0;
    }

    &.is-closed {
      & :deep(> .splitpanes__splitter) {
        &::before {
          transform: rotate(-90deg);
        }
      }
    }
  }

  &.right-facing-splitter {
    & :deep(> .splitpanes__splitter) {
      border-width: 0 0 0 1px;
    }

    &.is-closed {
      & :deep(> .splitpanes__splitter) {
        &::before {
          transform: rotate(90deg);
        }
      }
    }
  }

  &.down-facing-splitter {
    & :deep(> .splitpanes__splitter) {
      border-width: 1px 0 0;
    }

    &.is-closed {
      & :deep(> .splitpanes__splitter) {
        &::before {
          transform: scaleY(-1);
        }
      }
    }
  }

  &.up-facing-splitter {
    & :deep(> .splitpanes__splitter) {
      border-width: 0 0 1px;
    }

    &.is-closed {
      & :deep(> .splitpanes__splitter) {
        &::before {
          transform: scaleY(1);
        }
      }
    }
  }

  &.unset-transition .splitpanes__pane {
    transition: unset;
  }
}
</style>

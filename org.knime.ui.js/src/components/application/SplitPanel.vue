<script setup lang="ts">
// @ts-ignore
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import { computed, ref, onBeforeMount, watch } from "vue";

interface Props {
  id: string;
  direction?: "left" | "right" | "down" | "up";
  secondarySize?: number;
  secondaryMinSize?: number;
  mainMinSize?: number;
  withTransition?: boolean;
}

const supportLocalStorage = () => typeof localStorage !== "undefined";

const props = withDefaults(defineProps<Props>(), {
  direction: "left",
  secondarySize: 40,
  secondaryMinSize: 15,
  mainMinSize: 25,
  withTransition: false,
});

const previousSecondarySize = ref<number | null>(null);
const currentSecondarySize = ref<number | null>(props.secondarySize);
const mainSize = computed(() => 100 - currentSecondarySize.value);
const isClosed = computed(() => mainSize.value === 100);

onBeforeMount(() => {
  if (supportLocalStorage()) {
    const localStoreValue = localStorage.getItem(`ui-splitter-${props.id}`);
    if (localStoreValue !== null) {
      currentSecondarySize.value = parseFloat(localStoreValue);
    }
  }
});

const onResize = ({ size }: { size: number }) => {
  currentSecondarySize.value = size;
};

watch(currentSecondarySize, () => {
  if (supportLocalStorage()) {
    localStorage.setItem(
      `ui-splitter-${props.id}`,
      String(currentSecondarySize.value),
    );
  }
});

const isSecondaryFirstComponent = computed(
  () => props.direction === "left" || props.direction === "up",
);

const isHorizontal = computed(
  () => props.direction === "up" || props.direction === "down",
);

// hide or show on click
const onSplitterClick = () => {
  if (isClosed.value) {
    currentSecondarySize.value =
      previousSecondarySize.value < 1
        ? props.secondaryMinSize
        : previousSecondarySize.value;
    previousSecondarySize.value = null;
  } else {
    previousSecondarySize.value = currentSecondarySize.value;
    currentSecondarySize.value = 0;
  }
};
</script>

<template>
  <splitpanes
    :id="id"
    class="common-splitter"
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
    @resize="onResize($event[isSecondaryFirstComponent ? 0 : 1])"
  >
    <pane v-if="isSecondaryFirstComponent" :size="currentSecondarySize">
      <slot name="secondary" />
    </pane>
    <pane :size="mainSize" :min-size="mainMinSize">
      <slot />
    </pane>
    <pane v-if="!isSecondaryFirstComponent" :size="currentSecondarySize">
      <slot name="secondary" />
    </pane>
  </splitpanes>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

/* NB: we disable the rule because of classes defined by the splitpanes package */
/* stylelint-disable selector-class-pattern */
/* stylelint-disable no-descending-specificity */
.common-splitter {
  & :deep(.splitpanes__splitter) {
    min-width: 11px;
    min-height: 11px;
    background-color: var(--knime-porcelain);
    background-repeat: no-repeat;
    background-position: center;
    border-color: var(--knime-silver-sand);
    border-style: solid;

    &:hover {
      background-color: var(--knime-silver-sand-semi);
    }

    &::before {
      width: 10px;
      height: 10px;
      line-height: 10px;
      display: block;

      /* down arrow: embedded svg as it needs to have the correct color and size because it is used as image */
      content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='none'%3E%3Cpath stroke='%233E3A39' stroke-linejoin='round' stroke-miterlimit='10' d='M9.125 2.938 5 7.061.875 2.938'/%3E%3C/svg%3E");
    }
  }
}

.splitpanes--vertical {
  & :deep(> .splitpanes__splitter) {
    border-width: 0 1px;

    &::before {
      position: relative;
      top: calc(50% - 5px);
    }
  }
}

.splitpanes--horizontal {
  & :deep(> .splitpanes__splitter) {
    border-width: 1px 0;

    &::before {
      margin: auto;
    }
  }
}

.left-facing-splitter {
  & :deep(> .splitpanes__splitter) {
    &::before {
      transform: rotate(90deg);
    }
  }

  &.is-closed {
    & :deep(> .splitpanes__splitter) {
      border-left: none;

      &::before {
        transform: rotate(-90deg);
      }
    }
  }
}

.right-facing-splitter {
  & :deep(> .splitpanes__splitter) {
    &::before {
      transform: rotate(-90deg);
    }
  }

  &.is-closed {
    & :deep(> .splitpanes__splitter) {
      border-right: none;

      &::before {
        transform: rotate(90deg);
      }
    }
  }
}

.down-facing-splitter {
  &.is-closed {
    & :deep(> .splitpanes__splitter) {
      border-bottom: none;

      &::before {
        transform: scaleY(-1);
      }
    }
  }
}

.up-facing-splitter {
  & :deep(> .splitpanes__splitter) {
    &::before {
      transform: scaleY(-1);
    }
  }

  &.is-closed {
    & :deep(> .splitpanes__splitter) {
      border-top: none;

      &::before {
        transform: scaleY(1);
      }
    }
  }
}

.unset-transition .splitpanes__pane {
  transition: unset;
}
/* stylelint-enable selector-class-pattern */
</style>

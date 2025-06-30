<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useComponentLayoutEditorStore } from "@/store/componentLayoutEditor/componentLayoutEditor";
import type { ComponentLayoutEditorNodeLayout } from "@/store/componentLayoutEditor/types";

// TODO: Fix type
interface Props {
  view: ComponentLayoutEditorNodeLayout;
}

const props = defineProps<Props>();

const componentLayoutEditorStore = useComponentLayoutEditorStore();
const { nodes } = storeToRefs(componentLayoutEditorStore);

const node = computed(() =>
  nodes.value.find((node) => node.nodeID === props.view.nodeID),
);

const disabledOrMissing = computed(() => {
  if (!node.value) {
    return true;
  }

  if (node.value.hasOwnProperty("availableInView")) {
    return !node.value.availableInView;
  } else if (node.value.hasOwnProperty("availableInDialog")) {
    return !node.value.availableInDialog;
  }

  return false;
});

const typeClass = computed(() => node.value?.type);
const resizeClass = computed(() => props.view.resizeMethod ?? null);
const style = computed(() => {
  const styleProps = ["minWidth", "maxWidth", "minHeight", "maxHeight"];

  // extract style props
  const style = {};
  styleProps.forEach((prop) => {
    if (props.view.hasOwnProperty(prop)) {
      let value = props.view[prop];
      if (value) {
        if (!value.toString().includes("px")) {
          value = `${value}px`;
        }
        style[prop] = value;
      }
    }
  });
  return style;
});
</script>

<template>
  <div
    :class="[
      'knime-view',
      typeClass,
      resizeClass,
      { missing: disabledOrMissing },
    ]"
    :style="style"
  >
    <div v-if="node" :title="node.name" class="knime-view-container">
      <main>
        <img :src="node.icon" /><br />{{ node.name }}<br />
        <small class="text-muted node-id">Node&nbsp;{{ view.nodeID }}</small>
        <small v-if="disabledOrMissing" class="text-muted">
          (disabled in node usage)
        </small>
        <div
          v-if="node && node.description && node.description.length"
          class="description"
        >
          <small>{{ node.description }}</small>
        </div>
      </main>
    </div>

    <main v-else class="knime-view-container">
      <span class="node-id">Node&nbsp;{{ view.nodeID }}</span> (missing in
      workflow)
    </main>
  </div>
</template>

<style lang="postcss" scoped>
.knime-view {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--knime-aquamarine);
  border-radius: 3px;
  overflow: hidden;
  text-align: center;
  padding: 10px;

  & .knime-view-container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  &.missing {
    opacity: 0.4;
  }

  &.view,
  /* stylelint-disable-next-line selector-class-pattern */
  &.nestedLayout {
    min-height: 150px;
  }

  &.sortable-drag {
    background-color: var(--knime-aquamarine-light);
  }

  &.quickform,
  &.configuration {
    background-color: var(--knime-avocado);

    &.sortable-drag {
      background-color: var(--knime-avocado-light);
    }
  }

  /* stylelint-disable-next-line selector-class-pattern */
  &.aspectRatio16by9,
  /* stylelint-disable-next-line selector-class-pattern */
  &.aspectRatio4by3,
  /* stylelint-disable-next-line selector-class-pattern */
  &.aspectRatio1by1 {
    position: relative;
    width: 100%;
    height: 0;

    & > :first-child {
      position: absolute;
      width: 100%;
      height: 100%;
      left: 0;
      top: 0;
    }
  }

  /* stylelint-disable-next-line selector-class-pattern */
  &.aspectRatio16by9 {
    padding-bottom: calc(100% / (16 / 9));
  }

  /* stylelint-disable-next-line selector-class-pattern */
  &.aspectRatio4by3 {
    padding-bottom: calc(100% / (4 / 3));
  }

  /* stylelint-disable-next-line selector-class-pattern */
  &.aspectRatio1by1 {
    padding-bottom: 100%;
  }

  & main {
    padding: 0 10px;

    & .description {
      line-height: 100%;
    }

    & .node-id {
      white-space: nowrap;
    }
  }
}
</style>

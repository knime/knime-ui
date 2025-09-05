<script setup lang="ts">
import { computed } from "vue";

import type { ConfigurationLayoutEditorNode } from "@/store/layoutEditor/types/configuration";
import {
  type LayoutEditorNestedLayoutItem,
  type LayoutEditorNode,
  type LayoutEditorViewItem,
  isViewItem,
} from "@/store/layoutEditor/types/view";

import NodeIcon from "./NodeIcon.vue";

type Props = {
  nodes: LayoutEditorNode[] | ConfigurationLayoutEditorNode[];
  view: LayoutEditorViewItem | LayoutEditorNestedLayoutItem;
};

const props = defineProps<Props>();

const node = computed(() =>
  props.nodes.find((node) => node.nodeID === props.view.nodeID),
);

const isEnabled = computed(() => {
  if (!node.value) {
    return false;
  }

  // Only enable the node if it wasn't explicitly disabled in view or dialog
  if (node.value.hasOwnProperty("availableInView")) {
    return node.value.availableInView;
  } else if (node.value.hasOwnProperty("availableInDialog")) {
    return node.value.availableInDialog;
  }

  return true;
});

const typeClass = computed(() => node.value?.type);
const resizeClass = computed(() => {
  if (isViewItem(props.view)) {
    return props.view.resizeMethod ?? null;
  }
  return null;
});

const aspectRatioMap = {
  aspectRatio16by9: "16 / 9",
  aspectRatio4by3: "4 / 3",
  aspectRatio1by1: "1 / 1",
};

const aspectRatioStyles = computed(() => {
  if (isViewItem(props.view) && props.view.resizeMethod) {
    return { aspectRatio: aspectRatioMap[props.view.resizeMethod] };
  }
  return {};
});

const autoSizeStyles = computed(() => {
  const styleProps = ["minWidth", "maxWidth", "minHeight", "maxHeight"];

  // extract style props
  const style = {};
  styleProps.forEach((prop) => {
    if (!props.view.hasOwnProperty(prop)) {
      return;
    }

    let value = props.view[prop];
    if (value) {
      if (!value.toString().includes("px")) {
        value = `${value}px`;
      }
      style[prop] = value;
    }
  });
  return style;
});
</script>

<template>
  <div
    :class="['knime-view', typeClass, resizeClass, { missing: !isEnabled }]"
    :style="{ ...aspectRatioStyles, ...autoSizeStyles }"
  >
    <div v-if="node" :title="node.name" class="knime-view-container">
      <main>
        <NodeIcon :node-suffix="view.nodeID" class="node-icon" /> <br />
        {{ node.name }} <br />
        <small class="text-muted node-id">Node&nbsp;{{ view.nodeID }}</small>
        <small v-if="!isEnabled" class="text-muted">
          (disabled in node usage)
        </small>
        <div
          v-if="
            node.type !== 'configuration' &&
            node.description &&
            node.description.length
          "
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
  box-sizing: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--knime-aquamarine);
  border-radius: 3px;
  overflow: hidden;
  text-align: center;
  padding: 10px;
  container-type: inline-size;
  user-select: none;

  & .knime-view-container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(13px, 7cqi, 28px);
  }

  &.missing {
    opacity: 0.4;
  }

  /* stylelint-disable-next-line selector-class-pattern */
  &.nestedLayout {
    min-height: 100px;
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

  &.node-icon {
    transform: scale(1.5);
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

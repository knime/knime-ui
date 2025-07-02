<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import type { ComponentLayoutView } from "@/store/layoutEditor/types";

interface Props {
  view: ComponentLayoutView;
}

const props = defineProps<Props>();

const layoutEditorStore = useLayoutEditorStore();
const { nodes } = storeToRefs(layoutEditorStore);

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

const aspectRatioMap = {
  aspectRatio16by9: "16 / 9",
  aspectRatio4by3: "4 / 3",
  aspectRatio1by1: "1 / 1",
};

const aspectRatioClass = computed(() => {
  if (!props.view.resizeMethod) {
    return {};
  }
  return { aspectRatio: aspectRatioMap[props.view.resizeMethod] };
});

const autoSizeClass = computed(() => {
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
    :style="{ ...aspectRatioClass, ...autoSizeClass }"
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

  & .knime-view-container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(0.8rem, 7cqi, 1.5rem);
  }

  &.missing {
    opacity: 0.4;
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

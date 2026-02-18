<script setup lang="ts">
import { computed, ref } from "vue";

import { NodePreview } from "@knime/components";

import type {
  ComponentNodeTemplateWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "@/lib/data-mappers";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";

import NodeTemplateIconMode from "./NodeTemplateIconMode.vue";
import NodeTemplateListMode from "./NodeTemplateListMode.vue";

/**
 * Basic NodeTemplate without any drag or insert features. This component should stay reusable.
 */
export type Props = {
  /**
   * Additional to the properties of the NodeTemplate from the gateway API, this object
   * contains the port information (color and kind) which was mapped from the store
   */
  nodeTemplate:
    | NodeTemplateWithExtendedPorts
    | ComponentNodeTemplateWithExtendedPorts;
  displayMode?: NodeRepositoryDisplayModesType;
  isSelected?: boolean;
  isDescriptionActive?: boolean;
  isHighlighted?: boolean;
  showFloatingHelpIcon?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  displayMode: "icon",
  isSelected: false,
  isHighlighted: false,
  isDescriptionActive: false,
  showFloatingHelpIcon: false,
});

const emit = defineEmits(["helpIconClick"]);

const nodeHovered = ref(false);
const onPointerEnter = () => {
  nodeHovered.value = true;
};

const onPointerLeave = () => {
  nodeHovered.value = false;
};

const templateComponent = computed(() =>
  props.displayMode === "icon" ? NodeTemplateIconMode : NodeTemplateListMode,
);

const nodePreview = ref<InstanceType<typeof NodePreview> | null>(null);

const getNodePreview = () => {
  return nodePreview.value;
};
defineExpose({ getNodePreview });
</script>

<template>
  <Component
    :is="templateComponent"
    :class="[
      'node',
      {
        'list-mode': displayMode === 'list',
        'tree-mode': displayMode === 'tree',
        selected: isSelected,
        highlighted: isHighlighted,
      },
    ]"
    :node-template="nodeTemplate"
    :is-hovered="nodeHovered"
    :display-mode="displayMode"
    :is-highlighted="isHighlighted"
    :is-description-active="isDescriptionActive"
    :show-floating-help-icon="showFloatingHelpIcon"
    :is-selected="isSelected"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @help-icon-click="emit('helpIconClick')"
  >
    <template #node-preview>
      <NodePreview
        ref="nodePreview"
        :type="nodeTemplate.type"
        :in-ports="nodeTemplate.inPorts"
        :out-ports="nodeTemplate.outPorts"
        :icon="nodeTemplate.icon"
        :is-component="nodeTemplate.component"
      />
    </template>
  </Component>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node {
  margin: 0;
  position: relative;
  font-size: 12px;

  &:hover {
    cursor: pointer;
  }

  &[draggable="true"]:hover {
    cursor: grab;
  }
}

.highlighted {
  outline: calc(v-bind("$shapes.selectedNodeStrokeWidth") * 1px) solid
    var(--knime-dove-gray);
  border-radius: calc(v-bind("$shapes.selectedItemBorderRadius") * 1px);
  background-color: var(--knime-porcelain);

  &.list-mode,
  &.tree-mode {
    border-radius: 2px;
  }
}

/* selected needs to come after highlighted */
.selected {
  outline: calc(v-bind("$shapes.selectedNodeStrokeWidth") * 1px) solid
    var(--knime-cornflower);
  border-radius: calc(v-bind("$shapes.selectedItemBorderRadius") * 1px);
  background-color: var(--knime-cornflower-semi);
  color: var(--knime-cornflower-dark);

  &.list-mode,
  &.tree-mode {
    border-radius: 2px;
  }
}
</style>

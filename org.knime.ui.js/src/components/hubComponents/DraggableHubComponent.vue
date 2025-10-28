<script setup lang="ts">
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";
import { type HubComponent } from "@/store/hubComponents";

import { useAddHubComponentToWorkflow } from "./useAddHubComponentToWorkflow";

type DisplayMode = "list" | "icon";

const props = defineProps<{
  component: HubComponent;
  displayMode: DisplayMode;
  isSelected: boolean;
  isHighlighted?: boolean;
  isDescriptionActive?: boolean;
}>();

const emit = defineEmits<{
  click: [];
  showNodeDescription: [];
}>();

const addHubComponentToWorkflow = useAddHubComponentToWorkflow();

const handleDoubleClick = () => {
  addHubComponentToWorkflow(props.component);
};

const handleClick = () => {
  emit("click");
};

const handleShowDescription = () => {
  emit("showNodeDescription");
};
</script>

<template>
  <div class="hub-component-wrapper">
    <!-- Private badge overlay -->
    <div v-if="component.isPrivate" class="private-badge">
      Private
    </div>
    
    <!-- Just use the standard node template drag system -->
    <DraggableNodeTemplate
      :node-template="component.nodeTemplate"
      :is-selected="isSelected"
      :is-highlighted="isHighlighted"
      :is-description-active="isDescriptionActive"
      :display-mode="displayMode"
      @dblclick="handleDoubleClick"
      @click="handleClick"
      @show-node-description="handleShowDescription"
    />
  </div>
</template>

<style lang="postcss" scoped>
.hub-component-wrapper {
  position: relative;
}

.private-badge {
  position: absolute;
  bottom: 1px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: var(--knime-masala);
  color: var(--knime-white);
  font-size: 8px;
  line-height: 12px;
  font-weight: 500;
  padding: 0px 4px;
  border-radius: 2px;
  pointer-events: none;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
</style>

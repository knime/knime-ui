<script setup lang="ts">
import { computed } from "vue";

import type { HubComponent } from "@/store/hubComponents";

import DraggableHubComponent from "./DraggableHubComponent.vue";

type DisplayMode = "list" | "icon";

const COMPONENTS_PER_ROW_ICON_MODE = 3;
const COMPONENTS_PER_ROW_LIST_MODE = 1;

const props = withDefaults(
  defineProps<{
    components: HubComponent[];
    displayMode?: DisplayMode;
    selectedComponentId?: string | null;
    descriptionActiveForId?: string | null;
  }>(),
  {
    displayMode: "icon",
    selectedComponentId: null,
    descriptionActiveForId: null,
  },
);

const emit = defineEmits<{
  selectComponent: [componentId: string];
  showNodeDescription: [component: HubComponent];
}>();

const componentsPerRow = computed(() => {
  return props.displayMode === "icon"
    ? COMPONENTS_PER_ROW_ICON_MODE
    : COMPONENTS_PER_ROW_LIST_MODE;
});
</script>

<template>
  <div
    class="hub-component-list"
    :class="[`display-${displayMode}`]"
  >
    <DraggableHubComponent
      v-for="component in components"
      :key="component.id"
      :component="component"
      :display-mode="displayMode"
      :is-selected="selectedComponentId === component.id"
      :is-description-active="descriptionActiveForId === component.id"
      @click="emit('selectComponent', component.id)"
      @show-node-description="emit('showNodeDescription', component)"
    />
  </div>
</template>

<style lang="postcss" scoped>
.hub-component-list {
  display: grid;
  grid-template-columns: repeat(v-bind(componentsPerRow), 1fr);

  &.display-icon {
    gap: var(--spacing-12);
    padding: var(--spacing-12) var(--spacing-16);
  }

  &.display-list {
    gap: var(--spacing-4);
    padding: var(--spacing-8) var(--spacing-16);
  }
}
</style>

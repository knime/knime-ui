<script setup lang="ts">
import { computed } from "vue";

import { FunctionButton } from "@knime/components";
import ChevronDownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";

import type { HubComponent } from "@/store/hubComponents";
import { useHubComponentsStore } from "@/store/hubComponents";

import HubComponentList from "./HubComponentList.vue";

interface Props {
  category: string;
  components: HubComponent[];
  displayMode: "icon" | "list";
  selectedComponentId?: string | null;
  descriptionActiveForId?: string | null;
  isExpanded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selectedComponentId: null,
  descriptionActiveForId: null,
  isExpanded: false,
});

const emit = defineEmits<{
  selectComponent: [componentId: string];
  showNodeDescription: [component: HubComponent];
  toggleExpansion: [category: string];
}>();

const hubComponentsStore = useHubComponentsStore();

const toggleExpanded = () => {
  emit("toggleExpansion", props.category);
};

const hasMore = computed(() => {
  return hubComponentsStore.categoryHasMore(props.category);
});

const totalCount = computed(() => {
  return hubComponentsStore.getCategoryTotalCount(props.category);
});

const loadMore = () => {
  hubComponentsStore.loadMoreInCategory(props.category);
};

// Map category to color for the pill
const categoryColors = {
  Source: { bg: "#ff851b1a", text: "#ff851b" },
  Sink: { bg: "#ff41361a", text: "#ff4136" },
  Learner: { bg: "#c5e41d1a", text: "#8a9e00" },
  Predictor: { bg: "#00a8521a", text: "#00a852" },
  Manipulator: { bg: "#ffd5001a", text: "#d4a800" },
  Visualizer: { bg: "#0089cc1a", text: "#0089cc" },
  Other: { bg: "#d4a8001a", text: "#a0800d" },
  Uncategorized: { bg: "var(--knime-silver-sand)", text: "var(--knime-dove-gray)" },
};

const pillStyle = computed(() => {
  const colors = categoryColors[props.category as keyof typeof categoryColors];
  if (colors) {
    return {
      backgroundColor: colors.bg,
      color: colors.text,
    };
  }
  return {
    backgroundColor: "var(--knime-silver-sand)",
    color: "var(--knime-dove-gray)",
  };
});
</script>

<template>
  <div class="category-results">
    <button class="category-header" @click="toggleExpanded">
      <ChevronDownIcon class="chevron" :class="{ collapsed: !isExpanded }" />
      <span class="category-name">{{ category }}</span>
      <span class="component-count-pill" :style="pillStyle">{{ totalCount }}</span>
    </button>
    <Transition name="collapse">
      <div v-if="isExpanded" class="category-content">
        <HubComponentList 
          :components="components" 
          :display-mode="displayMode"
          :selected-component-id="selectedComponentId"
          :description-active-for-id="descriptionActiveForId"
          @select-component="emit('selectComponent', $event)"
          @show-node-description="emit('showNodeDescription', $event)"
        />
        <div v-if="hasMore" class="load-more-container">
          <FunctionButton compact @click="loadMore">
            Load More ({{ components.length }} of {{ totalCount }})
          </FunctionButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.category-results {
  margin-bottom: var(--spacing-4);
}

.category-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  padding: var(--spacing-8) var(--spacing-16);
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s;
  text-align: left;
  padding: 4px 0px;

  &:hover {
    background: var(--knime-silver-sand-semi);
  }
}

.chevron {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  transition: transform 0.2s;
  stroke: var(--knime-dove-gray);
  stroke-width: 3px;
}

.chevron.collapsed {
  transform: rotate(-90deg);
}

.category-name {
  flex: 1;
  font-weight: 500;
  font-size: 13px;
  color: var(--knime-masala);
  padding-left: 4px;
}

.component-count-pill {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.category-content {
  overflow: visible;
}

.load-more-container {
  display: flex;
  justify-content: center;
  padding: var(--spacing-8) var(--spacing-16);
}

/* Collapse transition */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 2000px;
  opacity: 1;
}
</style>

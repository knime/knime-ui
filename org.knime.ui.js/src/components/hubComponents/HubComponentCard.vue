<script setup lang="ts">
import { computed } from "vue";

import { Tag } from "@knime/components";

import type { HubComponent } from "@/store/hubComponents";

defineOptions({
  inheritAttrs: false,
});

type DisplayMode = "list" | "icon";

const props = defineProps<{
  component: HubComponent;
  displayMode: DisplayMode;
  isSelected: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();

const formattedDate = computed(() => {
  const date = new Date(props.component.lastUpdated);
  return date.toLocaleDateString();
});

const handleClick = () => {
  emit("click");
};

// Component type color mapping based on KNIME node types
const componentTypeColor = computed(() => {
  const type = props.component.componentType || "Other";
  const colorMap: Record<string, string> = {
    Learner: "#c5e41d", // Bright lime green
    Manipulator: "#ffd500", // Yellow
    Predictor: "#00a852", // Green
    Sink: "#ff4136", // Red
    Source: "#ff851b", // Orange
    Visualizer: "#0089cc", // Blue
    Other: "#c9b4a3", // Tan/beige
    Default: "#949494", // Gray
  };
  return colorMap[type] || colorMap.Other;
});

</script>

<template>
  <div
    class="hub-component-card"
    :class="[{ selected: isSelected }, `display-${displayMode}`]"
    v-bind="$attrs"
    @click="handleClick"
  >
    <div class="card-header">
      <div v-if="displayMode === 'icon'" class="component-icon">
        <div class="icon-wrapper">
          <div class="type-indicator" :style="{ backgroundColor: componentTypeColor }" />
          <img v-if="component.icon" :src="`data:image/png;base64,${component.icon}`" :alt="component.name" />
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>
      <div class="component-info">
        <h3 class="component-name" :title="component.name">
          <span v-if="displayMode === 'list'" class="type-indicator-inline" :style="{ backgroundColor: componentTypeColor }" />
          {{ component.name }}
        </h3>
        <p v-if="displayMode === 'icon'" class="component-author">
          by {{ component.author }}
        </p>
      </div>
    </div>

    <p v-if="displayMode === 'icon' && component.description" class="component-description">
      {{ component.description }}
    </p>

    <div v-if="component.tags && component.tags.length > 0" class="component-tags">
      <Tag
        v-for="tag in (displayMode === 'icon' ? component.tags.slice(0, 3) : component.tags.slice(0, 2))"
        :key="tag"
        compact
      >
        {{ tag }}
      </Tag>
      <span v-if="displayMode === 'icon' && component.tags.length > 3" class="more-tags">
        +{{ component.tags.length - 3 }}
      </span>
      <span v-if="displayMode === 'list' && component.tags.length > 2" class="more-tags">
        +{{ component.tags.length - 2 }}
      </span>
    </div>

    <div class="component-meta">
      <span v-if="displayMode === 'icon'" class="version">v{{ component.version }}</span>
      <span v-if="component.rating" class="rating">
        ★ {{ component.rating }}
      </span>
      <span v-if="displayMode === 'icon'" class="updated">{{ formattedDate }}</span>
      <span v-if="displayMode === 'list'" class="author">{{ component.author }}</span>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.hub-component-card {
  background: var(--knime-white);
  border: 1px solid var(--knime-stone-gray);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--knime-masala);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &.selected {
    border-color: var(--knime-cornflower);
    background: var(--knime-porcelain);
  }

  &.display-icon {
    padding: var(--spacing-12);
    display: flex;
    flex-direction: column;

    & .card-header {
      display: flex;
      gap: var(--spacing-12);
      align-items: flex-start;
      margin-bottom: var(--spacing-8);
    }

    & .component-icon {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      position: relative;

      & .icon-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--knime-porcelain);
        border-radius: 4px;
        position: relative;
      }

      & .type-indicator {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid var(--knime-white);
        z-index: 1;
      }

      & img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        padding: 4px;
      }

      & svg {
        width: 24px;
        height: 24px;
        stroke: var(--knime-masala);
      }
    }

    & .component-info {
      flex: 1;
      min-width: 0;
    }

    & .component-name {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--knime-masala);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: var(--spacing-8);
    }

    & .type-indicator-inline {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    & .component-author {
      margin: 0;
      font-size: 12px;
      color: var(--knime-dove-gray);
    }

    & .component-description {
      margin: 0 0 var(--spacing-12) 0;
      font-size: 12px;
      color: var(--knime-dove-gray);
      line-height: 1.4;
      display: -webkit-box;
      line-clamp: 2;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    & .component-tags {
      display: flex;
      gap: var(--spacing-4);
      flex-wrap: wrap;
      margin-bottom: var(--spacing-12);
      align-items: center;
    }

    & .component-meta {
      display: flex;
      gap: var(--spacing-12);
      font-size: 11px;
      color: var(--knime-dove-gray);
      align-items: center;
    }
  }

  &.display-list {
    padding: var(--spacing-8) var(--spacing-12);
    display: flex;
    align-items: center;
    gap: var(--spacing-12);

    & .card-header {
      flex: 1;
      min-width: 0;
    }

    & .component-info {
      flex: 1;
      min-width: 0;
    }

    & .component-name {
      margin: 0;
      font-size: 13px;
      font-weight: 500;
      color: var(--knime-masala);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: var(--spacing-8);
    }

    & .type-indicator-inline {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    & .component-tags {
      display: flex;
      gap: var(--spacing-4);
      margin-left: auto;
      flex-shrink: 0;
    }

    & .component-meta {
      display: flex;
      gap: var(--spacing-8);
      font-size: 11px;
      color: var(--knime-dove-gray);
      align-items: center;
      margin-left: var(--spacing-8);
      flex-shrink: 0;
    }
  }
}

.more-tags {
  font-size: 11px;
  color: var(--knime-dove-gray);
}

.version {
  font-weight: 500;
}

.rating {
  color: var(--knime-yellow);
}
</style>

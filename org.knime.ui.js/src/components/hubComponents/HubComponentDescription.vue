<script setup lang="ts">
import { computed } from "vue";

import CloseButton from "@/components/common/CloseButton.vue";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";
import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "@/components/common/side-panel/SidebarPanelScrollContainer.vue";
import SidebarPanelSubHeading from "@/components/common/side-panel/SidebarPanelSubHeading.vue";
import type { HubComponent } from "@/store/hubComponents";

interface Props {
  component: HubComponent | null;
  showCloseButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showCloseButton: false,
});

const emit = defineEmits<{
  close: [];
}>();

const componentTypeLabel = computed(() => {
  const type = props.component?.componentType || "Component";
  return type;
});

const hasLinks = computed(() => {
  return props.component && props.component.hubUrl;
});

const links = computed(() => {
  if (!props.component) {
    return [];
  }
  
  return [
    {
      text: "View on KNIME Hub",
      url: props.component.hubUrl,
    },
  ];
});

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
</script>

<template>
  <SidebarPanelLayout v-if="component">
    <template #header>
      <div class="header">
        <div class="title-row">
          <h2>{{ component.name }}</h2>
          <CloseButton
            v-if="showCloseButton"
            class="close-button"
            @click="emit('close')"
          />
        </div>
        <div class="component-type-badge" :class="`type-${component.componentType?.toLowerCase()}`">
          {{ componentTypeLabel }}
        </div>
      </div>
    </template>

    <SidebarPanelScrollContainer>
      <div class="description-section">
        <SidebarPanelSubHeading>Description</SidebarPanelSubHeading>
        <p v-if="component.description" class="description-text">
          {{ component.description }}
        </p>
        <p v-else class="no-description">
          No description available for this component.
        </p>
      </div>

      <div v-if="component.tags && component.tags.length > 0" class="tags-section">
        <SidebarPanelSubHeading>Tags</SidebarPanelSubHeading>
        <div class="tags-list">
          <span
            v-for="tag in component.tags"
            :key="tag"
            class="tag"
          >
            {{ tag }}
          </span>
        </div>
      </div>

      <div class="metadata-section">
        <SidebarPanelSubHeading>Information</SidebarPanelSubHeading>
        <dl class="metadata-list">
          <div class="metadata-item">
            <dt>Author</dt>
            <dd>{{ component.author }}</dd>
          </div>
          <div class="metadata-item">
            <dt>Version</dt>
            <dd>{{ component.version }}</dd>
          </div>
          <div class="metadata-item">
            <dt>Last Updated</dt>
            <dd>{{ formatDate(component.lastUpdated) }}</dd>
          </div>
          <div v-if="component.rating" class="metadata-item">
            <dt>Rating</dt>
            <dd>★ {{ component.rating }}</dd>
          </div>
          <div v-if="component.downloadCount" class="metadata-item">
            <dt>Downloads</dt>
            <dd>{{ component.downloadCount.toLocaleString() }}</dd>
          </div>
        </dl>
      </div>

      <ExternalResourcesList
        v-if="hasLinks"
        :model-value="links"
        :editable="false"
      />
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.header {
  padding: var(--spacing-16);
  width: 100%;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-8);

  & h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    line-height: 1.3;
    flex: 1;
  }
}

.close-button {
  flex-shrink: 0;
}

.component-type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &.type-source {
    background: #ff851b1a;
    color: #ff851b;
  }

  &.type-sink {
    background: #ff41361a;
    color: #ff4136;
  }

  &.type-learner {
    background: #c5e41d1a;
    color: #8a9e00;
  }

  &.type-predictor {
    background: #00a8521a;
    color: #00a852;
  }

  &.type-manipulator {
    background: #ffd5001a;
    color: #d4a800;
  }

  &.type-visualizer {
    background: #0089cc1a;
    color: #0089cc;
  }

  &.type-other {
    background: var(--knime-silver-sand);
    color: var(--knime-dove-gray);
  }
}

.description-section,
.tags-section,
.metadata-section {
  padding: var(--spacing-16);
  border-bottom: 1px solid var(--knime-silver-sand);
}

.description-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--knime-masala);
}

.no-description {
  margin: 0;
  font-size: 13px;
  color: var(--knime-dove-gray);
  font-style: italic;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-8);
}

.tag {
  padding: 4px 10px;
  background: var(--knime-porcelain);
  border: 1px solid var(--knime-silver-sand);
  border-radius: 4px;
  font-size: 12px;
  color: var(--knime-masala);
}

.metadata-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-12);
}

.metadata-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--spacing-12);

  & dt {
    font-size: 12px;
    font-weight: 500;
    color: var(--knime-dove-gray);
    flex-shrink: 0;
  }

  & dd {
    margin: 0;
    font-size: 13px;
    color: var(--knime-masala);
    text-align: right;
  }
}
</style>

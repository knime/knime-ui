<script setup lang="ts">
import { computed, ref } from "vue";

import { KdsCardClickable } from "@knime/kds-components";
import type { KdsCardProps } from "@knime/kds-components";

import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "@/components/common/side-panel/SidebarPanelScrollContainer.vue";
import { useAddNodeViaFileUpload } from "@/components/nodeTemplates/useAddNodeViaFileUpload";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { freeSpaceInCanvas } from "@/lib/workflow-canvas";

const addNodeViaUpload = useAddNodeViaFileUpload();
const isDraggingOver = ref(false);
const connectingTo = ref<string | null>(null);
const integrationSearch = ref("");

const integrations = [
  { id: "google-calendar", name: "Google Calendar", initials: "GC", bg: "#4285F4" },
  { id: "slack", name: "Slack", initials: "Sl", bg: "#4A154B" },
  { id: "google-drive", name: "Google Drive", initials: "GD", bg: "#34A853" },
  { id: "notion", name: "Notion", initials: "N", bg: "#000000" },
  { id: "linear", name: "Linear", initials: "Li", bg: "#5E6AD2" },
  { id: "airtable", name: "Airtable", initials: "At", bg: "#FCB400" },
  { id: "jira", name: "Jira", initials: "Ji", bg: "#0052CC" },
  { id: "fathom", name: "Fathom", initials: "Fa", bg: "#04A777" },
  { id: "confluence", name: "Confluence", initials: "Co", bg: "#172B4D" },
  { id: "github", name: "GitHub", initials: "GH", bg: "#24292E" },
  { id: "salesforce", name: "Salesforce", initials: "SF", bg: "#00A1E0" },
  { id: "hubspot", name: "HubSpot", initials: "HS", bg: "#FF7A59" },
] as const;

const filteredIntegrations = computed(() => {
  const q = integrationSearch.value.trim().toLowerCase();
  if (!q) return integrations;
  return integrations.filter((i) => i.name.toLowerCase().includes(q));
});

const cardProps = (name: string): KdsCardProps => ({
  variant: "outlined",
  ariaLabel: `Connect to ${name}`,
});

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDraggingOver.value = true;
};

const onDragLeave = () => {
  isDraggingOver.value = false;
};

const onDrop = (event: DragEvent) => {
  event.preventDefault();
  isDraggingOver.value = false;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length === 0) return;
  const center = freeSpaceInCanvas.aroundCenterWithFallback({
    visibleFrame: useCurrentCanvasStore().value.getVisibleFrame,
    nodes: useWorkflowStore().activeWorkflow?.nodes ?? {},
  });
  addNodeViaUpload.importFilesViaDrop(files, center);
};

const onBrowseFiles = () => {
  addNodeViaUpload.importFilesViaDialog();
};
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <h2>Add to Canvas</h2>
    </template>

    <SidebarPanelScrollContainer>
      <!-- FILES section -->
      <section class="section">
        <h3 class="section-title">FILES</h3>
        <div
          class="drop-zone"
          :class="{ 'drag-over': isDraggingOver }"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @click="onBrowseFiles"
        >
          <svg class="drop-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v13M6 8l6-6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M3 19h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <span class="drop-text">Drag &amp; drop files and images or click to browse</span>
        </div>
      </section>

      <!-- INTEGRATIONS section -->
      <section class="section">
        <h3 class="section-title">INTEGRATIONS</h3>
        <div class="search-row">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.2" />
            <path d="M11 11l3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          </svg>
          <input
            v-model="integrationSearch"
            class="search-input"
            type="text"
            placeholder="Search apps…"
          />
        </div>

        <div class="integrations-grid">
          <KdsCardClickable
            v-for="integration in filteredIntegrations"
            :key="integration.id"
            v-bind="cardProps(integration.name)"
            class="integration-card"
            @click="connectingTo = integration.id"
          >
            <div class="integration-logo" :style="{ backgroundColor: integration.bg }">
              {{ integration.initials }}
            </div>
            <span class="integration-name">{{ integration.name }}</span>
            <span class="connect-label">Connect</span>
          </KdsCardClickable>
        </div>
      </section>
    </SidebarPanelScrollContainer>

    <!-- Connect modal -->
    <Teleport to="body">
      <div
        v-if="connectingTo"
        class="connect-modal-backdrop"
        @click.self="connectingTo = null"
      >
        <div class="connect-modal">
          <div class="connect-modal-header">
            <span>Connect to {{ integrations.find(i => i.id === connectingTo)?.name }}</span>
            <button class="close-btn" @click="connectingTo = null">✕</button>
          </div>
          <div class="connect-modal-body">
            <p>OAuth integration coming soon.</p>
          </div>
          <div class="connect-modal-footer">
            <button class="connect-modal-btn" @click="connectingTo = null">Close</button>
          </div>
        </div>
      </div>
    </Teleport>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.section {
  margin-bottom: var(--kds-spacing-container-1x);
}

.section-title {
  font-size: var(--kds-core-font-size-0-75x);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--kds-color-text-secondary);
  margin: 0 0 var(--kds-spacing-container-0-5x);
}

.drop-zone {
  border: 1.5px dashed var(--kds-color-border-subtle);
  border-radius: var(--kds-border-radius-container-0-25x);
  padding: var(--kds-spacing-container-1x);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;

  &:hover,
  &.drag-over {
    background-color: var(--kds-color-surface-hover);
    border-color: var(--kds-color-border-focus);
  }
}

.drop-icon {
  color: var(--kds-color-text-secondary);
}

.drop-text {
  font-size: var(--kds-core-font-size-0-75x);
  color: var(--kds-color-text-secondary);
  text-align: center;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--kds-color-surface-subtle);
  border-radius: var(--kds-border-radius-container-0-25x);
  padding: 0 var(--kds-spacing-container-0-5x);
  border: 1px solid var(--kds-color-border-subtle);
  margin-bottom: var(--kds-spacing-container-0-5x);
}

.search-icon {
  flex-shrink: 0;
  color: var(--kds-color-text-secondary);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: var(--kds-spacing-container-0-5x) 0;
  font-size: var(--kds-core-font-size-0-87x);
  color: var(--kds-color-text-primary);

  &::placeholder {
    color: var(--kds-color-text-placeholder);
  }
}

.integrations-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--kds-spacing-container-0-5x);
  min-width: 0;
}

.integration-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--kds-spacing-container-0-75x) var(--kds-spacing-container-0-5x);
  text-align: center;
  width: 100%;
}

.integration-logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.integration-name {
  font-size: var(--kds-core-font-size-0-75x);
  color: var(--kds-color-text-primary);
  line-height: 1.2;
  word-break: break-word;
  hyphens: auto;
}

.connect-label {
  font-size: var(--kds-core-font-size-0-75x);
  color: var(--kds-color-text-secondary);
}

/* Connect modal */
.connect-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: v-bind("$zIndices.layerModals");
  background-color: rgb(0 0 0 / 40%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.connect-modal {
  background-color: var(--kds-color-surface-default);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--kds-elevation-level-3);
  width: min(400px, 90vw);
  display: flex;
  flex-direction: column;
}

.connect-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--kds-spacing-container-0-75x) var(--kds-spacing-container-1x);
  border-bottom: 1px solid var(--kds-color-border-subtle);
  font-weight: 600;
  font-size: var(--kds-core-font-size-0-87x);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--kds-color-text-secondary);
  font-size: 14px;
  padding: 2px 4px;

  &:hover {
    color: var(--kds-color-text-primary);
  }
}

.connect-modal-body {
  padding: var(--kds-spacing-container-1x);
  font-size: var(--kds-core-font-size-0-87x);
  color: var(--kds-color-text-secondary);
}

.connect-modal-footer {
  padding: var(--kds-spacing-container-0-75x) var(--kds-spacing-container-1x);
  border-top: 1px solid var(--kds-color-border-subtle);
  display: flex;
  justify-content: flex-end;
}

.connect-modal-btn {
  background-color: var(--kds-color-fill-primary);
  color: var(--kds-color-text-on-primary);
  border: none;
  border-radius: var(--kds-border-radius-container-0-25x);
  padding: var(--kds-spacing-container-0-25x) var(--kds-spacing-container-0-75x);
  font-size: var(--kds-core-font-size-0-87x);
  cursor: pointer;

  &:hover {
    opacity: 0.85;
  }
}
</style>

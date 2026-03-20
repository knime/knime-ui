<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import Draggable from "vuedraggable";

import { Button } from "@knime/components";
import { KdsInlineMessage } from "@knime/kds-components";
import InfoIcon from "@knime/styles/img/icons/circle-info.svg";

import { ComponentEditorConfig } from "@/api/gateway-api/generated-api";
import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import { layoutEditorGridSize } from "@/style/shapes";

import AvailableNodesAndElements from "./AvailableNodesAndElements.vue";
import Row from "./layout/Row.vue";
import NodeUsageButton from "./node-usage/NodeUsageButton.vue";

const layoutEditorStore = useLayoutEditorStore();
const {
  layout,
  availableNodes,
  legacyNodes,
  isLegacyModeOutOfSync,
  isWrappingLayout,
  hasChanges,
  reporting,
} = storeToRefs(layoutEditorStore);

const onLegacyModeToggle = (event: Event) => {
  const { checked } = event.target as HTMLInputElement;
  layoutEditorStore.setUseLegacyMode(checked);
};

const isReportingNotAvailable = computed(
  () => reporting.value === ComponentEditorConfig.ReportingEnum.NotAvailable,
);

const reportingEnabled = computed({
  get: () => reporting.value === ComponentEditorConfig.ReportingEnum.Enabled,
  set: (value: boolean) => {
    reporting.value = value
      ? ComponentEditorConfig.ReportingEnum.Enabled
      : ComponentEditorConfig.ReportingEnum.Disabled;
  },
});
</script>

<template>
  <div class="container">
    <div class="sidebar">
      <div class="controls">
        <Button
          compact
          with-border
          title="Remove all views and rows"
          @click="layoutEditorStore.clearLayout()"
        >
          Clear layout
        </Button>

        <Button
          compact
          with-border
          title="Revert to initial state"
          :disabled="!hasChanges"
          @click="layoutEditorStore.discardChanges()"
        >
          Discard changes
        </Button>

        <NodeUsageButton v-if="legacyNodes.length" />
      </div>

      <AvailableNodesAndElements />

      <label title="Enable legacy styling for supported views">
        <input
          :checked="layout.parentLayoutLegacyMode"
          type="checkbox"
          class="legacy-checkbox"
          @change="onLegacyModeToggle"
        />
        Use legacy mode
      </label>
      <button
        v-if="isLegacyModeOutOfSync"
        title="Legacy mode for some view may not match this setting"
        class="legacy-info"
        disabled
      >
        <InfoIcon />
      </button>

      <label class="reporting-label">
        <input
          v-model="reportingEnabled"
          type="checkbox"
          class="reporting-checkbox"
          :disabled="isReportingNotAvailable"
        />
        Enable reporting{{
          isReportingNotAvailable ? " (requires Reporting extension)" : ""
        }}
      </label>
    </div>

    <div class="layout">
      <KdsInlineMessage
        v-if="availableNodes.length"
        class="alert"
        variant="warning"
        headline="Warning"
        description="Views not added into the layout and not disabled in Tab 'Node Usage' will be shown below layout. To circumvent unexpected behavior, add all views into the layout."
      />

      <KdsInlineMessage
        v-if="isWrappingLayout"
        class="alert"
        variant="warning"
        headline="Warning"
        :description="`Your layout has rows with a total column width larger than ${layoutEditorGridSize}, therefore the columns will wrap. The visual editor doesn't support wrapping layouts yet. Please use advanced editor instead.`"
      />

      <KdsInlineMessage
        v-if="isLegacyModeOutOfSync"
        class="alert"
        variant="warning"
        headline="Warning"
        description='The legacy mode setting of some views in the layout do not match parent layout legacy mode setting. This may have been caused by changes made in the advanced layout editor. If this was intentional, you can ignore this warning. Otherwise, toggle the "Use legacy mode" option to synchronize the settings.'
      />

      <Draggable
        v-model="layout.rows"
        group="content"
        filter=".edit-button"
        class="layout-preview"
        :component-data="{ isFirstLevel: true }"
        item-key="id"
        :force-fallback="true"
        :fallback-on-body="true"
        @start="layoutEditorStore.setIsDragging(true)"
        @end="layoutEditorStore.setIsDragging(false)"
      >
        <template #item="{ element, index }">
          <Row
            :key="index"
            :row="element"
            :deletable="layout.rows.length > 1"
            is-root-row
          />
        </template>
      </Draggable>
    </div>
  </div>
</template>

<style lang="postcss">
/* when dragging from available nodes/elements over layout,
  this list element will temporarily be added to the layout */
.layout-preview li.sortable-ghost {
  width: 100%;
  height: 50px;
  margin: 5px 0;
  color: transparent;
  list-style: none;
  background-color: var(--knime-aquamarine);
  border-radius: 3px;

  &.quickform,
  &.configuration {
    background-color: var(--knime-avocado);
  }

  &.row {
    min-height: 68px;
    background-color: transparent;
    border: 4px solid var(--knime-silver-sand);
  }

  & * {
    display: none; /* for now we just hide the content, maybe there is a better way to render the ghost */
  }
}
</style>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.container {
  display: flex;
  height: 100%;
  background-color: var(--knime-white);
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 300px;
  height: 100%;
  padding: var(--space-12) var(--space-12) 0 var(--space-16);
  background-color: var(--knime-gray-light-semi);

  & .reporting-label {
    margin-top: auto;
    margin-bottom: var(--space-12);
  }
}

.controls {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
}

.layout {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  padding: 0 var(--space-16);
  overflow-y: auto;
}

.layout-preview {
  flex: 1;

  /* hide buttons of dragging element and it's children */
  & .sortable-drag button:not(.resize-handle) {
    visibility: hidden;
  }
}

.alert {
  margin: var(--space-8) 0;
}

.legacy-info {
  width: 14px;
  height: 14px;
  padding: 0;
  background-color: var(--knime-carrot);
  border: none;
}

.legacy-checkbox,
.reporting-checkbox {
  &:focus-visible {
    @mixin focus-outline;
  }
}
</style>

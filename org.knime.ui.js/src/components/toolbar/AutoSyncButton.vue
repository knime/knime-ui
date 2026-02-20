<script setup lang="ts">
import { computed, watch } from "vue";
import { API } from "@api";
import { storeToRefs } from "pinia";

import { KdsButton, KdsIcon, KdsLoadingSpinner } from "@knime/kds-components";

import { useAnalyticsService } from "@/analytics";
import { SyncState } from "@/api/gateway-api/generated-api";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getToastPresets } from "@/toastPresets";

const { activeWorkflow } = storeToRefs(useWorkflowStore());

const { toastPresets } = getToastPresets();

const syncState = computed(() => activeWorkflow.value?.syncState);

const isSynced = computed(
  () => syncState.value?.state === SyncState.StateEnum.SYNCED,
);

const isDirty = computed(
  () => syncState.value?.state === SyncState.StateEnum.DIRTY,
);

const isError = computed(
  () => syncState.value?.state === SyncState.StateEnum.ERROR,
);

const isUploadOrWriting = computed(
  () =>
    syncState.value?.state === SyncState.StateEnum.UPLOAD ||
    syncState.value?.state === SyncState.StateEnum.WRITING,
);

watch(
  syncState,
  (currentSyncState) => {
    if (!currentSyncState) {
      return;
    }

    const { error } = currentSyncState;

    if (currentSyncState.state !== SyncState.StateEnum.ERROR && !error) {
      return;
    }

    if (error?.code !== "SyncThresholdException") {
      toastPresets.app.saveProjectFailed({
        error,
      });
    }
  },
  { deep: true },
);

const indicatorTitle = computed(() => {
  if (isSynced.value) {
    return "Workflow is saved";
  }

  if (isUploadOrWriting.value) {
    return "Saving in progress…";
  }

  return "";
});

const syncButtonTitle = computed(() => {
  if (isError.value) {
    return "Last save failed, workflow might have unsaved changes.";
  }

  return "Save changes";
});

const saveProject = async () => {
  const projectId = activeWorkflow.value!.projectId;

  try {
    await API.workflow.saveProject({ projectId });

    useAnalyticsService().track("workflow_saved::wftoolbar_button_save", {
      isAutoSyncEnabled: Boolean(syncState.value?.isAutoSyncEnabled),
    });
  } catch (error) {
    toastPresets.app.saveProjectFailed({ error });
  }
};
</script>

<template>
  <KdsButton
    v-if="isDirty || isError"
    class="sync-button"
    :title="syncButtonTitle"
    aria-label="Sync"
    :leading-icon="
      syncState?.isAutoSyncEnabled ? 'cloud-pending-changes' : 'cloud-upload'
    "
    variant="transparent"
    @click="saveProject"
  />
  <div v-else class="button-like" :title="indicatorTitle">
    <KdsIcon v-if="isSynced" class="is-synced" name="cloud-synced" />
    <KdsLoadingSpinner v-if="isUploadOrWriting" />
  </div>
</template>

<style lang="postcss" scoped>
.sync-button,
.button-like {
  width: 28px;
}

.is-synced {
  color: var(--kds-color-text-and-icon-success);
}

.button-like {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  max-width: 100%;
  overflow: hidden;

  /** size medium */
  gap: var(--kds-spacing-container-0-25x);
  height: var(--kds-dimension-component-height-1-75x);
  padding: 0
    calc(var(--kds-spacing-container-0-37x) - var(--kds-core-border-width-xs)); /* needed as border in Figma is not increasing the width */

  font: var(--kds-font-base-interactive-medium-strong);
  border-radius: var(
    --kds-legacy-button-border-radius,
    var(--kds-border-radius-container-0-37x)
  );
}
</style>

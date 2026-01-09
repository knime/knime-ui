<script setup lang="ts">
import { computed, watch } from "vue";
import { API } from "@api";
import { storeToRefs } from "pinia";

import { KdsButton, KdsIcon } from "@knime/kds-components";

import { ProjectSyncState } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import { getToastPresets } from "@/toastPresets";

const { projectSyncState, activeProjectId } = storeToRefs(
  useApplicationStore(),
);

const { toastPresets } = getToastPresets();

const onSave = async () => {
  const projectId = activeProjectId.value!;

  try {
    await API.workflow.saveProject({ projectId });
  } catch (error) {
    toastPresets.app.syncProjectFailed({ error });
  }
};

watch(projectSyncState, (syncState) => {
  const { error, state } = syncState;
  if (state === ProjectSyncState.StateEnum.DIRTY && error) {
    toastPresets.app.syncProjectSizeLimit({
      error,
    });
  } else if (state === ProjectSyncState.StateEnum.ERROR && error) {
    toastPresets.app.syncProjectFailed({
      error,
    });
  }
});

const isSynced = computed(
  () => projectSyncState.value.state === ProjectSyncState.StateEnum.SYNCED,
);

const isDirty = computed(
  () => projectSyncState.value.state === ProjectSyncState.StateEnum.DIRTY,
);

const isError = computed(
  () => projectSyncState.value.state === ProjectSyncState.StateEnum.ERROR,
);

const isUploadOrWriting = computed(
  () =>
    projectSyncState.value.state === ProjectSyncState.StateEnum.UPLOAD ||
    projectSyncState.value.state === ProjectSyncState.StateEnum.WRITING,
);

const title = computed(() => {
  if (isDirty.value) {
    return "Workflow has unsaved changes";
  }

  if (isSynced.value) {
    return "Workflow is synced";
  }

  if (isUploadOrWriting.value) {
    return "Save in progress…";
  }

  if (isError.value) {
    return projectSyncState.value.error?.title;
  }

  return "";
});
</script>

<template>
  <KdsButton
    v-if="!projectSyncState.isAutoSyncEnabled && isDirty"
    class="save-button"
    title="Save workflow"
    aria-label="Save"
    leading-icon="save"
    variant="transparent"
    @click="onSave"
  />
  <div v-else class="button-like" :title="title">
    <KdsIcon v-if="isSynced" name="circle-success" />
    <KdsIcon v-if="isDirty" name="circle-info" />
    <KdsIcon v-if="isUploadOrWriting" name="cloud-upload" />
    <KdsIcon v-if="isError" name="circle-error" />
  </div>
</template>

<style lang="postcss" scoped>
.save-button,
.button-like {
  width: 28px;
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

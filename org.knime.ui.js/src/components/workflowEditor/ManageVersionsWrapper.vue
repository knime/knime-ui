<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import {
  CreateVersionForm,
  ManageVersions,
  type NamedItemVersion,
} from "@knime/hub-features/versions";

import { onWorkflowSaved } from "@/composables/useWorkflowSaveListener";
import { useUploadWorkflowToSpace } from "@/composables/useWorkflowUploadToHub";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { useApplicationStore } from "@/store/application/application";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { findSpaceById } from "@/store/spaces/util";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import { getToastPresets } from "@/toastPresets";

import VersionPanelPromoteHub from "./VersionPanelPromoteHub.vue";

const { PRICING_URL } = knimeExternalUrls;

const versionsStore = useWorkflowVersionsStore();
const { activeProjectVersionsModeInfo, activeProjectVersionsModeStatus } =
  storeToRefs(versionsStore);

const { activeProjectOrigin, activeProjectId } = storeToRefs(
  useApplicationStore(),
);

const { uploadWorkflowAndOpenAsProject } = useUploadWorkflowToSpace();

const hasAdminRights = computed(
  () =>
    activeProjectVersionsModeInfo.value?.permissions.includes("DELETE") ??
    false,
);
const hasEditCapability = computed(
  () =>
    activeProjectVersionsModeInfo.value?.permissions.includes("EDIT") ?? false,
);
const versionLimit = computed(
  () => activeProjectVersionsModeInfo.value?.versionLimit,
);

const versionCreationState = ref<
  "panel-hidden" | "panel-visible" | "pending" | "failed"
>("panel-hidden");

const { toastPresets } = getToastPresets();

onWorkflowSaved(async () => {
  try {
    await versionsStore.refreshData();
  } catch (error) {
    consola.error("Failed to refresh version data after save", error);
  }
});

const onClose = () => {
  versionsStore.deactivateVersionsMode();
};

const onSelect = (version: NamedItemVersion["version"]) => {
  versionsStore.switchVersion(version);
};

const onLoadAll = () => {
  versionsStore
    .refreshData({ loadAll: true })
    .catch((error) => toastPresets.versions.fetchAllFailed({ error }));
};

const onDelete = (version: NamedItemVersion["version"]) => {
  versionsStore
    .deleteVersion(version)
    .catch((error) => toastPresets.versions.deleteFailed({ error }));
};

const onRestore = (version: NamedItemVersion["version"]) => {
  versionsStore
    .restoreVersion(version)
    .catch((error) => toastPresets.versions.restoreFailed({ error }));
};

const openVersionCreationPanel = () => {
  versionCreationState.value = "panel-visible";
};

const closeVersionCreationPanel = () => {
  versionCreationState.value = "panel-hidden";
};

const onCreate = async ({ name, description }) => {
  try {
    versionCreationState.value = "pending";
    await versionsStore.createVersion({
      name,
      description,
    });

    closeVersionCreationPanel();
  } catch (error) {
    versionCreationState.value = "failed";
    toastPresets.versions.createFailed({ error });
  }
};

const onUpload = async () => {
  const itemId = activeProjectOrigin.value!.itemId;
  await uploadWorkflowAndOpenAsProject(itemId);

  // activeProjectId can take a while to update
  const stopWatcher = watch(
    () => activeProjectId.value,
    async () => {
      stopWatcher();
      await versionsStore.activateVersionsMode();
    },
  );
};

const onDiscardCurrentState = () => {
  versionsStore
    .discardUnversionedChanges()
    .catch((error) => toastPresets.versions.discardFailed({ error }));
};

const spaceProvidersStore = useSpaceProvidersStore();
const isItemInPrivateSpace = computed(() => {
  if (!activeProjectOrigin.value) {
    return false;
  }
  const space = findSpaceById(
    spaceProvidersStore.spaceProviders,
    activeProjectOrigin.value.spaceId,
  );
  return Boolean(space?.private);
});
</script>

<template>
  <div class="manage-versions-wrapper">
    <div v-if="activeProjectVersionsModeStatus === 'promoteHub'">
      <VersionPanelPromoteHub @close="onClose" @upload="onUpload" />
    </div>

    <Transition name="slide">
      <div
        v-if="
          versionCreationState === 'panel-visible' ||
          versionCreationState === 'pending'
        "
        class="create-version-drawer"
      >
        <CreateVersionForm
          :is-creation-pending="versionCreationState === 'pending'"
          @create="onCreate"
          @cancel="closeVersionCreationPanel"
        />
      </div>
    </Transition>
    <ManageVersions
      v-if="activeProjectVersionsModeStatus === 'active'"
      :class="{ loading: versionsStore.loading }"
      :version-history="activeProjectVersionsModeInfo!.loadedVersions"
      :current-version="versionsStore.activeProjectCurrentVersion"
      :unversioned-savepoint="
        activeProjectVersionsModeInfo!.unversionedSavepoint ?? undefined
      "
      :loading="versionsStore.loading"
      :has-loaded-all-versions="activeProjectVersionsModeInfo!.hasLoadedAll"
      :has-admin-rights
      :has-edit-capability
      :has-unversioned-changes="
        versionsStore.activeProjectHasUnversionedChanges
      "
      :version-limit="versionLimit"
      :upgrade-url="`${PRICING_URL}&alt=versionLimit`"
      :is-private="isItemInPrivateSpace"
      @close="onClose"
      @select="onSelect"
      @load-all="onLoadAll"
      @delete="onDelete"
      @restore="onRestore"
      @create="openVersionCreationPanel"
      @discard-current-state="onDiscardCurrentState"
    />
  </div>
</template>

<style lang="postcss" scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.15s ease-in-out;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.manage-versions-wrapper {
  isolation: isolate;
  position: relative;
  height: 100%;
  overflow: hidden;

  & .create-version-drawer {
    z-index: 2;
    display: flex;
    flex-direction: column;
    position: absolute;
    inset: 0;
  }
}

.loading {
  cursor: progress;
}
</style>

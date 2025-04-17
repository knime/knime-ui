<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { rfcErrors } from "@knime/hub-features";
import {
  CreateVersionForm,
  ManageVersions,
  type NamedItemVersion,
} from "@knime/hub-features/versions";

import { getToastsProvider } from "@/plugins/toasts";
import { useApplicationStore } from "@/store/application/application";
import { useSpacesStore } from "@/store/spaces/spaces";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import { showProblemDetailsErrorToast } from "@/util/showProblemDetailsErrorToast";

import VersionPanelPromoteHub from "./VersionPanelPromoteHub.vue";

const versionsStore = useWorkflowVersionsStore();
const { activeProjectVersionsModeInfo, activeProjectVersionsModeStatus } =
  storeToRefs(versionsStore);

const { activeProjectOrigin, activeProjectId } = storeToRefs(
  useApplicationStore(),
);

const { copyBetweenSpaces } = useSpacesStore();

const hasAdminRights = computed(
  () =>
    activeProjectVersionsModeInfo.value?.permissions.includes("DELETE") ??
    false,
);
const hasEditCapability = computed(
  () =>
    activeProjectVersionsModeInfo.value?.permissions.includes("EDIT") ?? false,
);

const isCreatingVersion = ref(false);

const showErrorToast = ({
  error,
  headline,
}: {
  error: unknown;
  headline: string;
}) => {
  if (error instanceof rfcErrors.RFCError) {
    getToastsProvider().show(
      rfcErrors.toToast({
        headline,
        rfcError: error,
      }),
    );
  } else {
    showProblemDetailsErrorToast({
      headline,
      problemDetails: {
        title: "An unexpected error occurred.",
      },
      error,
      copyToClipboard: true,
    });
  }
};

const onClose = () => {
  versionsStore.deactivateVersionsMode();
};

const onSelect = (version: NamedItemVersion["version"]) => {
  versionsStore.switchVersion(version);
};

const onLoadAll = async () => {
  try {
    await versionsStore.refreshData({ loadAll: true });
  } catch (error) {
    showErrorToast({
      error,
      headline: "Loading all versions failed",
    });
  }
};

const onDelete = async (version: NamedItemVersion["version"]) => {
  try {
    await versionsStore.deleteVersion(version);
  } catch (error) {
    showErrorToast({
      error,
      headline: "Deletion of the version failed",
    });
  }
};

const onRestore = (version: NamedItemVersion["version"]) => {
  try {
    versionsStore.restoreVersion(version);
  } catch (error) {
    showErrorToast({
      error,
      headline: "Restoring of the version failed",
    });
  }
};

const onCreate = async ({ name, description }) => {
  try {
    await versionsStore.createVersion({
      name,
      description,
    });
    isCreatingVersion.value = false;
  } catch (error) {
    showErrorToast({
      error,
      headline: "Creation of the version failed",
    });
  }
};

const onUpload = () => {
  copyBetweenSpaces({
    projectId: activeProjectId.value!,
    itemIds: [activeProjectOrigin.value!.itemId],
  });
};
</script>

<template>
  <div class="manage-versions-wrapper">
    <div v-if="activeProjectVersionsModeStatus === 'promoteHub'">
      <VersionPanelPromoteHub @close="onClose" @upload="onUpload" />
    </div>

    <Transition name="slide">
      <div v-if="isCreatingVersion" class="create-version-drawer">
        <div class="header">Create version</div>

        <CreateVersionForm
          @create="onCreate"
          @cancel="isCreatingVersion = false"
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
      @close="onClose"
      @select="onSelect"
      @load-all="onLoadAll"
      @delete="onDelete"
      @restore="onRestore"
      @create="isCreatingVersion = true"
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
    background-color: var(--knime-gray-ultra-light);

    & .header {
      display: flex;
      padding: 32px 30px 16px;
      background-color: var(--knime-white);
      font-weight: 700;
      font-size: 20px;
      line-height: 20px;
    }
  }
}

.loading {
  cursor: progress;
}
</style>

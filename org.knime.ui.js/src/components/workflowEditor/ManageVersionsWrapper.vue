<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";

import {
  CreateVersionForm,
  ManageVersions,
  type NamedItemVersion,
} from "@knime/hub-features/versions";

import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";

const versionsStore = useWorkflowVersionsStore();
const { activeProjectVersionsModeInfo, activeProjectVersionsModeStatus } =
  storeToRefs(versionsStore);

// TODO: source these permissions
const hasAdminRights = ref(true);
const hasEditCapability = ref(true);

const isCreatingVersion = ref(false);

const onClose = () => {
  versionsStore.deactivateVersionsMode();
};

const onSelect = (version: NamedItemVersion["version"]) => {
  versionsStore.switchVersion(version);
};

const onLoadAll = () => {
  versionsStore.refreshData({ loadAll: true });
};

const onDelete = (version: NamedItemVersion["version"]) => {
  versionsStore.deleteVersion(version);
};

const onRestore = (version: NamedItemVersion["version"]) => {
  versionsStore.restoreVersion(version);
};

const onCreate = ({ name, description }) => {
  versionsStore.createVersion({
    name,
    description,
  });
  isCreatingVersion.value = false;
};
</script>

<template>
  <div class="manage-versions-wrapper">
    <div v-if="activeProjectVersionsModeStatus === 'promoteHub'">
      Upload to the hub to use versions.
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

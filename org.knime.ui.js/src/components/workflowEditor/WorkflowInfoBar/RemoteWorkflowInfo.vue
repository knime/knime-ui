<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { SpaceProviderNS } from "@/api/custom-types";
import { useApplicationStore } from "@/store/application/application";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useUIControlsStore } from "@/store/uiControls/uiControls";

const { isUnknownProject, openProjects, activeProjectId } = storeToRefs(
  useApplicationStore(),
);
const uiControls = useUIControlsStore();
const { activeProjectProvider, loadingProviderSpacesData } = storeToRefs(
  useSpaceProvidersStore(),
);

const isServerSpace = computed(
  () =>
    !isUnknownProject.value(activeProjectId.value ?? "") &&
    activeProjectProvider.value?.type === SpaceProviderNS.TypeEnum.SERVER,
);

const shouldShow = computed(() => {
  const foundProject = openProjects.value.find(
    (project) => project.projectId === activeProjectId.value,
  );

  if (
    !uiControls.shouldDisplayRemoteWorkflowInfoBar ||
    !foundProject ||
    (foundProject.origin?.providerId &&
      loadingProviderSpacesData.value[foundProject.origin?.providerId])
  ) {
    return false;
  }

  return (
    activeProjectId.value &&
    (isUnknownProject.value(activeProjectId.value) || isServerSpace.value)
  );
});
</script>

<template>
  <div v-if="shouldShow" class="banner">
    <span>
      <template v-if="isUnknownProject(activeProjectId ?? '')">
        You have opened a workflow that is not part of your spaces. “Save” a
        local copy to keep your changes.
      </template>

      <template v-if="isServerSpace">
        You have opened a workflow from a KNIME Server. “Save” the workflow back
        to KNIME Server to keep your changes.
      </template>
    </span>
  </div>
</template>

<style lang="postcss" scoped>
.banner {
  width: 100%;
  display: flex;
  padding: 5px 10px;
  justify-content: center;
  align-items: center;
  min-height: 40px;
  background: v-bind("$colors.notifications.warning");
  backdrop-filter: brightness(4);
}
</style>

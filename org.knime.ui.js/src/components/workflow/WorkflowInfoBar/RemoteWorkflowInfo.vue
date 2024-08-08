<script setup lang="ts">
import { computed } from "vue";

import { useStore } from "@/composables/useStore";
import { SpaceProviderNS } from "@/api/custom-types";
import * as $colors from "@/style/colors";

const store = useStore();
const isUnknownProject = computed<(projectId: string) => boolean>(
  () => store.getters["application/isUnknownProject"],
);

const uiControls = computed(() => store.state.uiControls);
const openProjects = computed(() => store.state.application.openProjects);

const activeProjectProvider = computed<SpaceProviderNS.SpaceProvider | null>(
  () => store.getters["spaces/activeProjectProvider"],
);

const activeProjectId = computed(() => store.state.application.activeProjectId);

const isServerSpace = computed(
  () =>
    !isUnknownProject.value(activeProjectId.value ?? "") &&
    activeProjectProvider.value?.type === SpaceProviderNS.TypeEnum.SERVER,
);

const shouldShow = computed(() => {
  const foundProject = openProjects.value.find(
    (project) => project.projectId === activeProjectId.value,
  );

  if (!uiControls.value.shouldDisplayRemoteWorkflowInfoBar || !foundProject) {
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
}
</style>

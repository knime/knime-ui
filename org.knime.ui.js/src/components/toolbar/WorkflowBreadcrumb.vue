<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { type MenuItem, SubMenu } from "@knime/components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import HistoryIcon from "@knime/styles/img/icons/history.svg";
import ListIcon from "@knime/styles/img/icons/list-thumbs.svg";

import { SpaceProviderNS, type Workflow } from "@/api/custom-types";
import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer";
import { useApplicationStore } from "@/store/application/application";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";

import ComponentBreadcrumb from "./ComponentBreadcrumb.vue";
import StatusPill from "./StatusPill.vue";

type Props = {
  workflow: Workflow;
};
const props = defineProps<Props>();
const { revealInSpaceExplorer } = useRevealInSpaceExplorer();

const { activeProjectOrigin, openProjects, activeProjectId } = storeToRefs(
  useApplicationStore(),
);

const activeSpaceProvider = computed(() => {
  return useSpaceProvidersStore().activeProjectProvider;
});

const dropdownItems = computed(() => {
  const items: Array<MenuItem> = [];
  if (activeSpaceProvider.value?.type !== SpaceProviderNS.TypeEnum.SERVER) {
    items.push({
      text: "Version history",
      icon: HistoryIcon,
      metadata: {
        handler: () => {
          useWorkflowVersionsStore().activateVersionsMode();
        },
      },
    });
  }

  items.push(
    {
      text: "Reveal in space explorer",
      icon: ListIcon,
      metadata: {
        handler: async () => {
          const projectName = openProjects.value.find(
            (project) => project.projectId === activeProjectId.value,
          )!.name;

          await revealInSpaceExplorer(activeProjectOrigin.value!, projectName);
        },
      },
    },
    {
      text: "Close project",
      icon: CloseIcon,
      metadata: {
        handler: () => {
          useDesktopInteractionsStore().closeProject(activeProjectId.value!);
        },
      },
    },
  );

  return items;
});

const isInSublevel = computed(() => {
  return (props.workflow.parents?.length ?? 0) > 0;
});
</script>

<template>
  <div class="breadcrumb-wrapper">
    <StatusPill v-if="activeSpaceProvider" :provider="activeSpaceProvider" />
    <ComponentBreadcrumb v-if="isInSublevel" :workflow />
    <div v-else class="breadcrumb-root">
      <span>{{ workflow.info.name }}</span>
      <div class="space-selection-dropdown">
        <SubMenu
          :teleport-to-body="false"
          :items="dropdownItems"
          button-title="Workflow menu actions"
          orientation="right"
          @item-click="(_: MouseEvent, item) => item.metadata.handler()"
        >
          <template #default>
            <DropdownIcon class="dropdown-icon" />
          </template>
        </SubMenu>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.breadcrumb-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.breadcrumb-root {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;

  & span {
    font-size: 13px;
    line-height: 18px;
    font-weight: 500;
  }

  & .dropdown-icon {
    @mixin svg-icon-size 10;
  }
}
</style>
